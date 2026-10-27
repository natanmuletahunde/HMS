import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { eq } from 'drizzle-orm';
import { db, usersTable, rolesTable, mfaConfigsTable, userBranchesTable, branchesTable } from '@workspace/db';
import type { JwtPayload } from './jwt.strategy';
import { mfaDecrypt, mfaDecryptCodes, mfaEncryptCodes } from '../../common/utils/mfa-crypto';
import { consumeMfaBackupCode } from '../../common/utils/mfa-backup-codes';
import { requireSessionSecret } from '../../common/config/runtime-secrets';
import { validatePassword } from '../../common/utils/password-policy';

const ACCESS_SECRET = requireSessionSecret();
const REFRESH_SECRET = ACCESS_SECRET + '-refresh';
const MFA_PENDING_SECRET = ACCESS_SECRET + '-mfa-pending';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const [user] = await db
      .select({
        id: usersTable.id, email: usersTable.email, passwordHash: usersTable.passwordHash,
        firstName: usersTable.firstName, lastName: usersTable.lastName,
        phone: usersTable.phone, avatarUrl: usersTable.avatarUrl,
        faydaId: usersTable.faydaId,
        roleId: usersTable.roleId, roleName: rolesTable.name, roleScope: rolesTable.scope,
        rolePermissions: rolesTable.permissions,
        primaryBranchId: usersTable.primaryBranchId,
        tenantId: usersTable.tenantId,
        isOnDuty: usersTable.isOnDuty,
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
        roleId: usersTable.roleId, roleName: rolesTable.name, roleScope: rolesTable.scope,
        primaryBranchId: usersTable.primaryBranchId,
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
        faydaId: usersTable.faydaId,
        roleId: usersTable.roleId, roleName: rolesTable.name, roleScope: rolesTable.scope,
        rolePermissions: rolesTable.permissions,
        primaryBranchId: usersTable.primaryBranchId,
        isOnDuty: usersTable.isOnDuty,
        isActive: usersTable.isActive, createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.id, userId));
    if (!user) throw new UnauthorizedException('User not found');

    const branches = await this.resolveUserBranches(user.id, user.roleName, user.roleScope, user.primaryBranchId);
    return this.formatUser(user, branches);
  }

  private async resolveUserBranches(userId: string, roleName?: string | null, roleScope?: string | null, primaryBranchId?: string | null) {
    const isGlobal = roleName === 'Admin' || roleScope === 'global';

    if (isGlobal) {
      // Global admins have access to all active branches
      const allBranches = await db
        .select({
          id: branchesTable.id,
          branchName: branchesTable.branchName,
          branchCode: branchesTable.branchCode,
        })
        .from(branchesTable)
        .where(eq(branchesTable.isActive, true));

      return allBranches.map((b) => ({
        id: b.id,
        branchName: b.branchName,
        branchCode: b.branchCode,
        isPrimary: primaryBranchId ? b.id === primaryBranchId : false,
      }));
    }

    const ubRows = await db
      .select({
        id: branchesTable.id,
        branchName: branchesTable.branchName,
        branchCode: branchesTable.branchCode,
        isPrimary: userBranchesTable.isPrimary,
      })
      .from(userBranchesTable)
      .innerJoin(branchesTable, eq(userBranchesTable.branchId, branchesTable.id))
      .where(eq(userBranchesTable.userId, userId));

    return ubRows;
  }

  private async issueTokens(user: any) {
    const payload: JwtPayload = {
      userId: user.id, roleId: user.roleId,
      roleName: user.roleName ?? '', email: user.email,
      tenantId: user.tenantId ?? null,
    };
    const branches = await this.resolveUserBranches(user.id, user.roleName, user.roleScope, user.primaryBranchId);
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, { secret: REFRESH_SECRET, expiresIn: '7d' }),
      user: this.formatUser(user, branches),
    };
  }

  private formatUser(u: any, branches: any[] = []) {
    const primaryBranch = branches.find((b) => b.isPrimary) || branches[0] || null;
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      phone: u.phone ?? null,
      faydaId: u.faydaId ?? null,
      avatarUrl: u.avatarUrl ?? null,
      roleId: u.roleId,
      roleName: u.roleName ?? null,
      roleScope: u.roleScope ?? 'branch',
      permissions: u.rolePermissions || [],
      primaryBranchId: u.primaryBranchId ?? primaryBranch?.id ?? null,
      activeBranchId: u.primaryBranchId ?? primaryBranch?.id ?? null,
      branches,
      isOnDuty: u.isOnDuty ?? true,
      isActive: u.isActive,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    };
  }

  async changePassword(userId: string, currentPassword?: string, newPassword?: string) {
    if (!currentPassword || !currentPassword.trim()) {
      throw new BadRequestException('Current password is required.');
    }
    if (!newPassword || !newPassword.trim()) {
      throw new BadRequestException('New password is required.');
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) throw new NotFoundException('User not found.');

    const match = await bcrypt.compare(currentPassword.trim(), user.passwordHash);
    if (!match) throw new BadRequestException('Current password does not match.');

    const { valid, errors } = validatePassword(newPassword);
    if (!valid) {
      throw new BadRequestException(`Password does not meet policy requirements: ${errors.join('; ')}`);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(usersTable.id, userId));

    return { message: 'Password updated successfully' };
  }
}
