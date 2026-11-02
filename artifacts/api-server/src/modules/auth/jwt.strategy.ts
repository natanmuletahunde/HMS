import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { db, usersTable, rolesTable, userBranchesTable } from '@workspace/db';
import { requireSessionSecret } from '../../common/config/runtime-secrets';

export interface JwtPayload {
  userId: string;
  roleId: string;
  roleName: string;
  email: string;
  /** null = platform admin; non-null = scoped to that tenant */
  tenantId: string | null;
}

export interface AuthenticatedUser extends JwtPayload {
  roleScope: string;
  permissions: string[];
  branchIds: string[];
  primaryBranchId: string | null;
  department: string | null;
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

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.userId) throw new UnauthorizedException();

    const [userWithRole] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        isActive: usersTable.isActive,
        department: usersTable.department,
        primaryBranchId: usersTable.primaryBranchId,
        tenantId: usersTable.tenantId,
        roleId: usersTable.roleId,
        roleName: rolesTable.name,
        roleScope: rolesTable.scope,
        rolePermissions: rolesTable.permissions,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.id, payload.userId));

    if (!userWithRole || !userWithRole.isActive) {
      throw new UnauthorizedException('User account has been deactivated or not found');
    }

    // Fetch assigned branches for branch-scoped access
    const userBranchRows = await db
      .select({ branchId: userBranchesTable.branchId })
      .from(userBranchesTable)
      .where(eq(userBranchesTable.userId, payload.userId));

    const branchIds = userBranchRows.map((b) => b.branchId);
    if (userWithRole.primaryBranchId && !branchIds.includes(userWithRole.primaryBranchId)) {
      branchIds.push(userWithRole.primaryBranchId);
    }

    return {
      userId: userWithRole.id,
      roleId: userWithRole.roleId,
      roleName: userWithRole.roleName ?? payload.roleName,
      roleScope: userWithRole.roleScope ?? 'branch',
      permissions: userWithRole.rolePermissions || [],
      branchIds,
      primaryBranchId: userWithRole.primaryBranchId ?? null,
      department: userWithRole.department ?? null,
      email: userWithRole.email,
      tenantId: userWithRole.tenantId ?? null,
    };
  }
}
