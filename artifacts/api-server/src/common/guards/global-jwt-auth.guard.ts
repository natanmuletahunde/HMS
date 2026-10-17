import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global JWT authentication guard (registered as APP_GUARD, runs first).
 * - Public routes (@Public decorator or matched by path): sets req.user = null, passes through.
 * - Authenticated routes: verifies JWT via Passport and populates req.user.
 *
 * IpRestrictionGuard (registered second) reads req.user populated here.
 */
@Injectable()
export class GlobalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (this.isPublic(context)) return true;
    return super.canActivate(context);
  }

  private isPublic(context: ExecutionContext): boolean {
    // Check @Public() decorator on handler or class
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Also treat WebSocket and RPC contexts as public (auth handled in gateway)
    if (context.getType() !== 'http') return true;

    // Public paths that must never require a token
    const req = context.switchToHttp().getRequest();
    const path: string = req.path ?? '';
    const PUBLIC_PATHS = [
      '/api/auth/login',
      '/api/auth/mfa-verify',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/health',
      '/health',
    ];
    return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'));
  }

  // Fail-closed: throw 401 when Passport finds no user.
  // Public routes bypass this via canActivate returning true before super.canActivate() is called,
  // so handleRequest is only reached for routes that must be authenticated.
  handleRequest(err: any, user: any) {
    if (err) throw err;
    if (!user) throw new (require('@nestjs/common').UnauthorizedException)();
    return user;
  }
}
