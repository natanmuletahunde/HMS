import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { db, ipRestrictionsTable } from '@workspace/db';
import { CacheService } from '../../modules/cache/cache.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const CACHE_TTL = 60; // seconds — invalidated on any mutation
const IP_RULES_PREFIX = 'ip_rules:';

/**
 * Canonical cache-key scheme — must match SecurityService invalidation:
 *   Public / unauthenticated  → ip_rules:unauth
 *   Platform admin            → ip_rules:platform
 *   Tenant user               → ip_rules:tenant:<tenantId>
 */
function ipRulesCacheKey(tenantId: string | null | undefined): string {
  if (tenantId === undefined || tenantId === null) {
    // Null means platform admin; undefined means unknown (unauthenticated/public)
    return tenantId === null ? `${IP_RULES_PREFIX}platform` : `${IP_RULES_PREFIX}unauth`;
  }
  return `${IP_RULES_PREFIX}tenant:${tenantId}`;
}

export { ipRulesCacheKey, IP_RULES_PREFIX };

/**
 * Resolve client IP from the direct socket or Express trust-proxy value.
 * X-Forwarded-For is NOT trusted from arbitrary clients — set app trust proxy
 * to propagate it from a known reverse proxy.
 */
function resolveClientIp(req: any): string {
  return (req.ip ?? req.socket?.remoteAddress ?? '').replace(/^::ffff:/, '');
}

/** Validate that a string is a valid IPv4 address with all octets in 0–255. */
function isValidIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (String(n) !== part || n < 0 || n > 255) return false;
  }
  return true;
}

/**
 * Match a (stripped) IPv4 address against an IPv4 CIDR string.
 * Returns false for any malformed input — including out-of-range octets (e.g. 999.0.0.0/8).
 */
export function matchesCidr(clientIp: string, cidr: string): boolean {
  // Validate client IP: must be a well-formed IPv4 address with octets 0-255
  if (!isValidIpv4(clientIp)) return false;

  if (!cidr.includes('/')) {
    // Exact match — validate rule IP too
    return isValidIpv4(cidr) && clientIp === cidr;
  }

  const slashIdx = cidr.indexOf('/');
  const base = cidr.slice(0, slashIdx);
  const bitsStr = cidr.slice(slashIdx + 1);
  const bits = parseInt(bitsStr, 10);

  // Validate rule base address and prefix length
  if (!isValidIpv4(base)) return false;
  if (String(bits) !== bitsStr || bits < 0 || bits > 32) return false;

  try {
    const ipToInt = (s: string): number =>
      s.split('.').reduce((acc, octet) => ((acc << 8) | parseInt(octet, 10)) >>> 0, 0);
    const mask = bits === 0 ? 0 : ((~((1 << (32 - bits)) - 1)) >>> 0);
    return (ipToInt(clientIp) & mask) === (ipToInt(base) & mask);
  } catch {
    return false;
  }
}

@Injectable()
export class IpRestrictionGuard implements CanActivate {
  constructor(
    private readonly cache: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    // Skip enforcement for public routes — they also skip JWT auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const publicPaths = ['/api/auth/', '/health', '/api/health'];
    if (publicPaths.some(p => (req.path ?? '').startsWith(p))) return true;

    const clientIp = resolveClientIp(req);
    if (!clientIp) return true;

    // Use req.user populated by GlobalJwtAuthGuard (runs before this guard)
    // tenantId: null = platform admin, non-null string = tenant user, undefined = unauthenticated
    const tenantId: string | null | undefined = req.user?.tenantId;
    const cacheKey = ipRulesCacheKey(tenantId);

    let rules: any[] | undefined = this.cache.get(cacheKey);

    if (rules === undefined) {
      // Load global rules (tenantId IS NULL) + caller-tenant-specific rules
      const allActive = await db.select().from(ipRestrictionsTable)
        .where(eq(ipRestrictionsTable.isActive, true));

      rules = allActive.filter(r =>
        r.tenantId === null || // global rule — applies to everyone
        (tenantId !== undefined && r.tenantId === tenantId) // tenant-specific
      );
      this.cache.set(cacheKey, rules, CACHE_TTL);
    }

    if (!rules.length) return true;

    const blocklisted = rules.filter(r => r.type === 'blocklist');
    const allowlisted = rules.filter(r => r.type === 'allowlist');

    for (const rule of blocklisted) {
      if (matchesCidr(clientIp, rule.ipAddress)) {
        throw new ForbiddenException(`Access denied for IP ${clientIp}`);
      }
    }

    if (allowlisted.length > 0) {
      const allowed = allowlisted.some(r => matchesCidr(clientIp, r.ipAddress));
      if (!allowed) throw new ForbiddenException(`IP ${clientIp} is not on the allowlist`);
    }

    return true;
  }
}
