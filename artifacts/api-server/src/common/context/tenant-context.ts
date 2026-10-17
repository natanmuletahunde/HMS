import { ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../../modules/auth/jwt.strategy';

/** Caller context derived from verified JWT — never from request body/query params */
export interface CallerCtx {
  userId: string;
  roleName: string;
  /** null = platform admin; non-null = scoped tenant user */
  tenantId: string | null;
}

export function getCallerCtx(req: { user: JwtPayload }): CallerCtx {
  return {
    userId: req.user.userId,
    roleName: req.user.roleName,
    tenantId: req.user.tenantId ?? null,
  };
}

/** Platform admins have tenantId = null and can act across all tenants */
export function isPlatformAdmin(ctx: CallerCtx): boolean {
  return ctx.tenantId === null;
}

/**
 * Assert that the caller can access the given tenantId.
 * Platform admins pass through; regular users must match their own tenantId.
 */
export function assertTenantAccess(ctx: CallerCtx, resourceTenantId: string | null) {
  if (isPlatformAdmin(ctx)) return; // admins see everything
  if (resourceTenantId === null) return; // global/system resource
  if (ctx.tenantId !== resourceTenantId) {
    throw new ForbiddenException('Access denied: cross-tenant operation not allowed');
  }
}
