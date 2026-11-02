import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no specific permissions are annotated, allow request through
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Fail-closed if no user is authenticated
    if (!user) {
      throw new ForbiddenException('Access denied: Authentication required.');
    }

    const userPermissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : [];

    // System super-admin wildcard has unrestricted access
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check if user satisfies the required permission(s)
    const hasPermission = requiredPermissions.every((required) =>
      this.matchPermission(userPermissions, required),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied: Missing required permission [${requiredPermissions.join(', ')}].`,
      );
    }

    return true;
  }

  /**
   * Matches a required permission against granted permissions.
   * Supports:
   * 1. Exact match: "guests:read" == "guests:read"
   * 2. Module wildcard: "guests:*" satisfies "guests:read", "guests:create", etc.
   * 3. Global wildcard: "*" satisfies everything.
   */
  private matchPermission(granted: string[], required: string): boolean {
    if (granted.includes('*')) return true;
    if (granted.includes(required)) return true;

    const [requiredModule] = required.split(':');
    if (requiredModule && granted.includes(`${requiredModule}:*`)) {
      return true;
    }

    return false;
  }
}
