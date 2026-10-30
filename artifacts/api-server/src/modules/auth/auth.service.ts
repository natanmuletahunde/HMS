import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { eq, or } from 'drizzle-orm';
import { db, usersTable, rolesTable, mfaConfigsTable } from '@workspace/db';
import type { JwtPayload } from './jwt.strategy';
import { mfaDecrypt, mfaDecryptCodes, mfaEncryptCodes } from '../../common/utils/mfa-crypto';
import { consumeMfaBackupCode } from '../../common/utils/mfa-backup-codes';
import { requireSessionSecret } from '../../common/config/runtime-secrets';
import { OtpService } from './otp.service';
import { AfroMessageService } from './afromessage.service';

const ACCESS_SECRET = requireSessionSecret();
const REFRESH_SECRET = ACCESS_SECRET + '-refresh';
const MFA_PENDING_SECRET = ACCESS_SECRET + '-mfa-pending';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly otpService: OtpService,
    private readonly afroMessage: AfroMessageService,
  ) {}

  async login(email: string, password: string) {
    const [user] = await db
      .select({
        id: usersTable.id, email: usersTable.email, passwordHash: usersTable.passwordHash,
        firstName: usersTable.firstName, lastName: usersTable.lastName,
        phone: usersTable.phone, avatarUrl: usersTable.avatarUrl,
        roleId: usersTable.roleId, roleName: rolesTable.name,
        tenantId: usersTable.tenantId,
        isActive: usersTable.isActive, createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.email, email.toLowerCase()));

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // ─── MFA check ────────────────────────────────────────────────────────────
    const [mfaConfig] = await db.select().from(mfaConfigsTable)
      .where(eq(mfaConfigsTable.userId, user.id));

    if (mfaConfig?.isEnabled) {
      // Issue a short-lived mfa-pending token that grants no API access
      const mfaToken = this.jwt.sign(
        { userId: user.id, type: 'mfa-pending' },
        { secret: MFA_PENDING_SECRET, expiresIn: '5m' },
      );
      return { mfaRequired: true, mfaToken };
    }

    // No MFA — issue full tokens immediately
    return this.issueTokens(user);
  }

  /**
   * Second step of MFA login.
   * Validates the mfa-pending token and the TOTP code, then issues full JWT tokens.
   */
  async mfaVerify(mfaToken: string, totpCode: string) {
    let pendingPayload: { userId: string; type: string };
    try {
      pendingPayload = this.jwt.verify(mfaToken, { secret: MFA_PENDING_SECRET }) as any;
    } catch {
      throw new UnauthorizedException('MFA token is invalid or expired');
    }
    if (pendingPayload.type !== 'mfa-pending') {
      throw new UnauthorizedException('Invalid MFA token type');
    }

    const [mfaConfig] = await db.select().from(mfaConfigsTable)
      .where(eq(mfaConfigsTable.userId, pendingPayload.userId));
    if (!mfaConfig?.isEnabled) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    // Decrypt secret and backup codes — both are stored AES-256-GCM encrypted
    const decryptedSecret = mfaDecrypt(mfaConfig.secret);
    const backupCodes = mfaDecryptCodes(mfaConfig.backupCodes as unknown as string);
    const backupCodeResult = consumeMfaBackupCode(backupCodes, totpCode);
    let verified = false;

    if (backupCodeResult.matched) {
      // Consume the backup code (one-time use) and re-encrypt before writing back
      await db.update(mfaConfigsTable)
        .set({ backupCodes: mfaEncryptCodes(backupCodeResult.remaining) as any, lastUsedAt: new Date() })
        .where(eq(mfaConfigsTable.id, mfaConfig.id));
      verified = true;
    } else {
      verified = speakeasy.totp.verify({
        secret: decryptedSecret, encoding: 'base32', token: totpCode, window: 1,
      });
      if (verified) {
        await db.update(mfaConfigsTable).set({ lastUsedAt: new Date() })
          .where(eq(mfaConfigsTable.id, mfaConfig.id));
      }
    }

    if (!verified) throw new UnauthorizedException('Invalid TOTP code');

    // Load user and issue full tokens
    const [user] = await db
      .select({
        id: usersTable.id, email: usersTable.email, passwordHash: usersTable.passwordHash,
        firstName: usersTable.firstName, lastName: usersTable.lastName,
        phone: usersTable.phone, avatarUrl: usersTable.avatarUrl,
        roleId: usersTable.roleId, roleName: rolesTable.name,
        tenantId: usersTable.tenantId,
        isActive: usersTable.isActive, createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.id, pendingPayload.userId));

    if (!user) throw new UnauthorizedException('User not found');
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, { secret: REFRESH_SECRET });
      const newPayload: JwtPayload = {
        userId: payload.userId, roleId: payload.roleId,
        roleName: payload.roleName, email: payload.email,
        tenantId: payload.tenantId ?? null,
      };
      return {
        accessToken: this.jwt.sign(newPayload),
        refreshToken: this.jwt.sign(newPayload, { secret: REFRESH_SECRET, expiresIn: '7d' }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const [user] = await db
      .select({
        id: usersTable.id, email: usersTable.email,
        firstName: usersTable.firstName, lastName: usersTable.lastName,
        phone: usersTable.phone, avatarUrl: usersTable.avatarUrl,
        roleId: usersTable.roleId, roleName: rolesTable.name,
        isActive: usersTable.isActive, createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.id, userId));
    if (!user) throw new UnauthorizedException('User not found');
    return this.formatUser(user);
  }

  private issueTokens(user: any) {
    const payload: JwtPayload = {
      userId: user.id, roleId: user.roleId,
      roleName: user.roleName ?? '', email: user.email,
      tenantId: user.tenantId ?? null,
    };
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, { secret: REFRESH_SECRET, expiresIn: '7d' }),
      user: this.formatUser(user),
    };
  }

  private formatUser(u: any) {
    return {
      id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
      phone: u.phone ?? null, avatarUrl: u.avatarUrl ?? null,
      roleId: u.roleId, roleName: u.roleName ?? null,
      isActive: u.isActive,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    };
  }

  /**
   * Step 1: Request SMS OTP for Staff Password Reset or OTP Login
   * Accepts either staff work email or mobile phone number
   */
  async requestStaffOtp(identifier: string) {
    const raw = (identifier || '').trim();
    if (!raw) {
      throw new BadRequestException('Please provide your work email or registered mobile phone number');
    }

    const isEmail = raw.includes('@');
    let matchedUser: any = null;

    if (isEmail) {
      const [u] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, raw.toLowerCase()))
        .limit(1);
      matchedUser = u;
    } else {
      const normalized = this.afroMessage.normalizePhone(raw);
      // Look up by phone in usersTable
      const allUsers = await db.select().from(usersTable).where(eq(usersTable.isActive, true));
      matchedUser = allUsers.find(u => {
        if (!u.phone) return false;
        const norm = this.afroMessage.normalizePhone(u.phone);
        return norm === normalized || norm.endsWith(normalized.slice(-9));
      });
    }

    if (!matchedUser || !matchedUser.isActive) {
      throw new BadRequestException('No active staff account found with this email or phone number');
    }

    // Determine target phone to dispatch OTP
    const phoneToUse = matchedUser.phone || (!isEmail ? raw : null);
    if (!phoneToUse) {
      throw new BadRequestException(
        'This staff account does not have a registered mobile phone number on file. Please contact your Hotel System Administrator.',
      );
    }

    // Dispatch OTP via AfroMessage
    const otpRes = await this.otpService.requestOtp(phoneToUse, 'staff', {
      userId: matchedUser.id,
      email: matchedUser.email,
    });

    return {
      success: true,
      phone: this.afroMessage.normalizePhone(phoneToUse),
      maskedPhone: otpRes.maskedPhone,
      cooldownSeconds: otpRes.cooldownSeconds,
      ...(otpRes.devCode ? { devCode: otpRes.devCode } : {}),
    };
  }

  /**
   * Step 2: Verify Staff OTP and return single-use reset authorization token
   */
  async verifyStaffOtp(phone: string, code: string) {
    const res = await this.otpService.verifyOtp(phone, code, 'staff');
    if (!res.userId) {
      throw new BadRequestException('Invalid OTP session. Please request a new verification code.');
    }
    const resetToken = this.otpService.createResetToken(res.userId);
    return {
      success: true,
      resetToken,
      phone: res.phone,
    };
  }

  /**
   * Step 3: Complete Password Reset using verified reset token
   */
  async resetPasswordWithToken(resetToken: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    const userId = this.otpService.consumeResetToken(resetToken);
    if (!userId) {
      throw new BadRequestException('Password reset token is invalid or has expired. Please request a new code.');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    // Auto-login user with fresh tokens
    const [user] = await db
      .select({
        id: usersTable.id, email: usersTable.email, passwordHash: usersTable.passwordHash,
        firstName: usersTable.firstName, lastName: usersTable.lastName,
        phone: usersTable.phone, avatarUrl: usersTable.avatarUrl,
        roleId: usersTable.roleId, roleName: rolesTable.name,
        tenantId: usersTable.tenantId,
        isActive: usersTable.isActive, createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.id, userId));

    if (!user) throw new UnauthorizedException('User not found');
    return this.issueTokens(user);
  }

  /**
   * Direct Staff Login via SMS OTP (Passwordless Login)
   */
  async otpLogin(phone: string, code: string) {
    const res = await this.otpService.verifyOtp(phone, code, 'staff');
    if (!res.userId) {
      throw new BadRequestException('Invalid OTP session. Please request a new verification code.');
    }

    const [user] = await db
      .select({
        id: usersTable.id, email: usersTable.email, passwordHash: usersTable.passwordHash,
        firstName: usersTable.firstName, lastName: usersTable.lastName,
        phone: usersTable.phone, avatarUrl: usersTable.avatarUrl,
        roleId: usersTable.roleId, roleName: rolesTable.name,
        tenantId: usersTable.tenantId,
        isActive: usersTable.isActive, createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.id, res.userId));

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Staff account not found or deactivated');
    }

    return this.issueTokens(user);
  }
}
