import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, getTableColumns } from 'drizzle-orm';
import { db, mfaConfigsTable, ipRestrictionsTable, mobileSessionsTable } from '@workspace/db';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import type { CallerCtx } from '../../common/context/tenant-context';
import { currentPolicy, applyPolicyUpdate, validatePassword, type PasswordPolicy } from '../../common/utils/password-policy';
import { mfaEncrypt, mfaDecrypt, mfaEncryptCodes, mfaDecryptCodes } from '../../common/utils/mfa-crypto';
import { generateMfaBackupCodes } from '../../common/utils/mfa-backup-codes';
import { CacheService } from '../cache/cache.service';
import { ipRulesCacheKey, IP_RULES_PREFIX } from '../../common/guards/ip-restriction.guard';

@Injectable()
export class SecurityService {
  constructor(private readonly cache: CacheService) {}

  // ─── Password Policy ──────────────────────────────────────────────────────
  getPasswordPolicy() { return { ...currentPolicy }; }

  /**
   * Password policy is a platform-wide setting.
   * Only platform admins (tenantId === null) may modify it.
   */
  updatePasswordPolicy(ctx: CallerCtx, body: Partial<PasswordPolicy>) {
    if (ctx.tenantId !== null) {
      throw new ForbiddenException('Password policy can only be modified by platform admins');
    }
    // Strict DTO validation — only known fields, strict types and safe ranges
    const validated: Partial<PasswordPolicy> = {};
    if (body.minLength !== undefined) {
      const v = Number(body.minLength);
      if (!Number.isInteger(v) || v < 6 || v > 128) throw new BadRequestException('minLength must be an integer 6–128');
      validated.minLength = v;
    }
    if (body.requireUppercase !== undefined) {
      if (typeof body.requireUppercase !== 'boolean') throw new BadRequestException('requireUppercase must be a boolean');
      validated.requireUppercase = body.requireUppercase;
    }
    if (body.requireNumbers !== undefined) {
      if (typeof body.requireNumbers !== 'boolean') throw new BadRequestException('requireNumbers must be a boolean');
      validated.requireNumbers = body.requireNumbers;
    }
    if (body.requireSymbols !== undefined) {
      if (typeof body.requireSymbols !== 'boolean') throw new BadRequestException('requireSymbols must be a boolean');
      validated.requireSymbols = body.requireSymbols;
    }
    if (body.expiryDays !== undefined) {
      const v = Number(body.expiryDays);
      if (!Number.isInteger(v) || v < 0 || v > 3650) throw new BadRequestException('expiryDays must be an integer 0–3650');
      validated.expiryDays = v;
    }
    if (body.preventReuse !== undefined) {
      const v = Number(body.preventReuse);
      if (!Number.isInteger(v) || v < 0 || v > 24) throw new BadRequestException('preventReuse must be an integer 0–24');
      validated.preventReuse = v;
    }
    // Strip unknown keys (only apply fields that were explicitly provided and validated)
    return applyPolicyUpdate(validated);
  }

  validatePassword(password: string) { return validatePassword(password); }

  // ─── MFA ──────────────────────────────────────────────────────────────────
  async setupMfa(userId: string, userEmail: string) {
    const secret = speakeasy.generateSecret({ name: `Nexus HMS (${userEmail})`, length: 20 });
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);
    const backupCodes = generateMfaBackupCodes();

    // Encrypt both the TOTP secret and backup codes before persisting.
    // Never stored in plaintext — a DB read alone cannot reconstruct either credential.
    const encryptedSecret = mfaEncrypt(secret.base32);
    const encryptedBackupCodes = mfaEncryptCodes(backupCodes);

    const [existing] = await db.select(getTableColumns(mfaConfigsTable))
      .from(mfaConfigsTable).where(eq(mfaConfigsTable.userId, userId));

    if (existing) {
      await db.update(mfaConfigsTable)
        .set({ secret: encryptedSecret, isEnabled: false, backupCodes: encryptedBackupCodes as any })
        .where(eq(mfaConfigsTable.id, existing.id));
    } else {
      await db.insert(mfaConfigsTable).values({
        userId,
        secret: encryptedSecret,
        isEnabled: false,
        backupCodes: encryptedBackupCodes as any,
      });
    }
    // Return the plaintext secret (for authenticator app QR scan) and backup codes (one-time display).
    // These are NOT stored in plaintext — the caller must save them now.
    return { secret: secret.base32, qrCode: qrCodeDataUrl, backupCodes };
  }

  async verifyMfa(userId: string, token: string) {
    const [config] = await db.select(getTableColumns(mfaConfigsTable))
      .from(mfaConfigsTable).where(eq(mfaConfigsTable.userId, userId));
    if (!config) throw new NotFoundException('MFA not set up for this user');

    const decryptedSecret = mfaDecrypt(config.secret);
    const verified = speakeasy.totp.verify({ secret: decryptedSecret, encoding: 'base32', token, window: 1 });
    if (!verified) throw new BadRequestException('Invalid TOTP token');

    await db.update(mfaConfigsTable).set({ isEnabled: true, lastUsedAt: new Date() })
      .where(eq(mfaConfigsTable.id, config.id));
    return { success: true, mfaEnabled: true };
  }

  async getMfaStatus(userId: string) {
    const [config] = await db.select(getTableColumns(mfaConfigsTable))
      .from(mfaConfigsTable).where(eq(mfaConfigsTable.userId, userId));
    return { isEnabled: config?.isEnabled ?? false, hasSetup: !!config };
  }

  /** Verify current TOTP before allowing disable — prevents unauthorized deactivation. */
  async disableMfa(userId: string, token: string) {
    const [config] = await db.select(getTableColumns(mfaConfigsTable))
      .from(mfaConfigsTable).where(eq(mfaConfigsTable.userId, userId));
    if (!config) throw new NotFoundException('MFA not set up for this user');
    if (!config.isEnabled) throw new BadRequestException('MFA is not currently enabled');

    const decryptedSecret = mfaDecrypt(config.secret);
    const verified = speakeasy.totp.verify({ secret: decryptedSecret, encoding: 'base32', token, window: 1 });
    if (!verified) throw new BadRequestException('Invalid TOTP token — provide current code to disable MFA');

    await db.update(mfaConfigsTable).set({ isEnabled: false }).where(eq(mfaConfigsTable.id, config.id));
    return { success: true };
  }

  /**
   * Internal use by AuthService: check if a userId has MFA enabled.
   * Returns the config with the DECRYPTED secret so AuthService can verify TOTP.
   */
  async getMfaConfig(userId: string): Promise<(Record<string, any> & { secret: string; backupCodes: string[] }) | null> {
    const [config] = await db.select(getTableColumns(mfaConfigsTable))
      .from(mfaConfigsTable).where(eq(mfaConfigsTable.userId, userId));
    if (!config) return null;
    return {
      ...config,
      secret: mfaDecrypt(config.secret),
      backupCodes: mfaDecryptCodes(config.backupCodes as unknown as string),
    };
  }

  /** Internal use by AuthService: verify a TOTP token against a plaintext secret. */
  verifyTotpToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
  }

  // ─── IP Restrictions ──────────────────────────────────────────────────────
  async getIpRestrictions(ctx: CallerCtx) {
    const rows = await db.select(getTableColumns(ipRestrictionsTable))
      .from(ipRestrictionsTable)
      .where(eq(ipRestrictionsTable.isActive, true))
      .orderBy(desc(ipRestrictionsTable.createdAt));
    // Platform admin: all active rules; tenant user: own + global rules
    if (ctx.tenantId === null) return rows;
    return rows.filter(r => r.tenantId === ctx.tenantId || r.tenantId === null);
  }

  /** Validate IPv4 address or IPv4 CIDR notation (e.g. '1.2.3.4' or '10.0.0.0/8'). */
  private validateIpv4(input: string): void {
    const parts = input.trim().split('/');
    if (parts.length > 2) throw new BadRequestException('Invalid IP/CIDR format');
    const octets = parts[0].split('.');
    if (octets.length !== 4) throw new BadRequestException('Must be a valid IPv4 address or IPv4 CIDR (e.g. 1.2.3.4 or 10.0.0.0/8)');
    for (const octet of octets) {
      const n = parseInt(octet, 10);
      if (String(n) !== octet || n < 0 || n > 255) {
        throw new BadRequestException(`Invalid IPv4 octet: "${octet}"`);
      }
    }
    if (parts.length === 2) {
      const prefix = parseInt(parts[1], 10);
      if (String(prefix) !== parts[1] || prefix < 0 || prefix > 32) {
        throw new BadRequestException('CIDR prefix length must be 0–32');
      }
    }
  }

  /** Assert that the caller holds an admin-level role within their scope. */
  private assertAdminRole(ctx: CallerCtx, operation: string): void {
    const ADMIN_ROLES = ['admin', 'super_admin'];
    // Platform admins (tenantId=null) always pass
    if (ctx.tenantId === null) return;
    // Tenant users must hold an admin role within their tenant
    if (!ADMIN_ROLES.includes(ctx.roleName)) {
      throw new ForbiddenException(`Only administrators may ${operation}`);
    }
  }

  async addIpRestriction(ctx: CallerCtx, body: { ipAddress: string; type: string; label?: string }) {
    this.assertAdminRole(ctx, 'add IP restrictions');
    if (!body.ipAddress) throw new BadRequestException('ipAddress is required');
    const VALID_TYPES = ['allowlist', 'blocklist'];
    if (!VALID_TYPES.includes(body.type)) {
      throw new BadRequestException(`type must be one of: ${VALID_TYPES.join(', ')}`);
    }
    this.validateIpv4(body.ipAddress.trim());
    const ruleTenantId = ctx.tenantId ?? null; // null = global rule
    const [entry] = await db.insert(ipRestrictionsTable).values({
      ipAddress: body.ipAddress,
      type: body.type,
      label: body.label ?? null,
      tenantId: ruleTenantId,
      createdBy: ctx.userId,
    }).returning();
    // Global rules affect every caller scope — flush all ip_rules:* cache entries
    if (ruleTenantId === null) {
      this.cache.delByPrefix(IP_RULES_PREFIX);
    } else {
      // Tenant-specific rule: only affects that tenant's cache and unauthenticated cache
      this.cache.del(ipRulesCacheKey(ruleTenantId));
      this.cache.del(ipRulesCacheKey(undefined)); // unauth cache includes global rules
    }
    return entry;
  }

  async removeIpRestriction(ctx: CallerCtx, id: string) {
    this.assertAdminRole(ctx, 'remove IP restrictions');
    const [rule] = await db.select(getTableColumns(ipRestrictionsTable))
      .from(ipRestrictionsTable).where(eq(ipRestrictionsTable.id, id));
    if (!rule) throw new NotFoundException(`IP restriction ${id} not found`);

    // Authorization: platform admin can delete any rule; tenant user can only delete own-tenant rules
    if (ctx.tenantId !== null && rule.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('You can only delete IP restrictions belonging to your tenant');
    }

    const [removed] = await db.update(ipRestrictionsTable).set({ isActive: false })
      .where(eq(ipRestrictionsTable.id, id)).returning();

    // Global rules affect all callers — flush all ip_rules:* caches
    if (rule.tenantId === null) {
      this.cache.delByPrefix(IP_RULES_PREFIX);
    } else {
      this.cache.del(ipRulesCacheKey(rule.tenantId));
      this.cache.del(ipRulesCacheKey(undefined)); // unauth cache
    }
    return removed;
  }

  // ─── Devices ──────────────────────────────────────────────────────────────
  async getDevices(userId: string) {
    return db.select(getTableColumns(mobileSessionsTable))
      .from(mobileSessionsTable)
      .where(and(eq(mobileSessionsTable.userId, userId), eq(mobileSessionsTable.isActive, true)))
      .orderBy(desc(mobileSessionsTable.lastSeenAt));
  }

  async revokeDevice(id: string, userId: string) {
    const [device] = await db.select(getTableColumns(mobileSessionsTable))
      .from(mobileSessionsTable).where(eq(mobileSessionsTable.id, id));
    if (!device || device.userId !== userId) throw new NotFoundException(`Device ${id} not found`);
    const [updated] = await db.update(mobileSessionsTable).set({ isActive: false })
      .where(eq(mobileSessionsTable.id, id)).returning();
    return updated;
  }
}
