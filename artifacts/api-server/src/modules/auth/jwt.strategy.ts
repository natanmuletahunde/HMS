import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
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
    return payload;
  }
}
