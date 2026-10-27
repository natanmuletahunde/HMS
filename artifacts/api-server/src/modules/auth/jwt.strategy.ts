import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { db, usersTable } from '@workspace/db';
import { requireSessionSecret } from '../../common/config/runtime-secrets';

export interface JwtPayload {
  userId: string;
  roleId: string;
  roleName: string;
  email: string;
  /** null = platform admin; non-null = scoped to that tenant */
  tenantId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireSessionSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.userId) throw new UnauthorizedException();
    const [user] = await db
      .select({ id: usersTable.id, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId));
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }
    return payload;
  }
}
