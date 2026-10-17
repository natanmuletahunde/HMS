import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Mark a route as public — skips JWT authentication and IP restriction enforcement.
 * Use on /auth/login, /auth/mfa-verify, /auth/refresh, /auth/logout, /health, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
