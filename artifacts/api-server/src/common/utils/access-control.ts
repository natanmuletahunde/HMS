import { ForbiddenException } from '@nestjs/common';
import { db, rolesTable, userBranchesTable, usersTable, buildingsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import type { JwtPayload } from '../../modules/auth/jwt.strategy';

export interface UserAccessInfo {
  isGlobal: boolean;
  roleScope: 'global' | 'branch';
  roleName: string;
  permissions: string[];
  branchIds: string[];
}

export async function getUserAccessInfo(user: JwtPayload): Promise<UserAccessInfo> {
  if (!user || !user.userId) {
    throw new ForbiddenException('Authentication required');
  }

  let roleScope: 'global' | 'branch' = 'branch';
  let permissions: string[] = [];

  if (user.roleId) {
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, user.roleId));
    if (role) {
      roleScope = (role.scope as 'global' | 'branch') || 'branch';
      permissions = role.permissions || [];
    }
  }

  const isGlobal =
    user.roleName === 'Admin' ||
    user.roleName === 'System Admin' ||
    roleScope === 'global';

  let branchIds: string[] = [];

  if (!isGlobal) {
    const userBranches = await db
      .select({ branchId: userBranchesTable.branchId })
      .from(userBranchesTable)
      .where(eq(userBranchesTable.userId, user.userId));

    branchIds = userBranches.map((ub) => ub.branchId);

    const [userRow] = await db
      .select({ primaryBranchId: usersTable.primaryBranchId })
      .from(usersTable)
      .where(eq(usersTable.id, user.userId));

    if (userRow?.primaryBranchId && !branchIds.includes(userRow.primaryBranchId)) {
      branchIds.push(userRow.primaryBranchId);
    }
  }

  return {
    isGlobal,
    roleScope,
    roleName: user.roleName,
    permissions,
    branchIds,
  };
}

export function hasRequiredPermission(permissions: string[], required: string[]): boolean {
  if (permissions.includes('*')) return true;
  return required.some((req) => permissions.includes(req) || permissions.includes(req.split(':')[0] + ':*'));
}

export async function assertCanManageBranches(user: JwtPayload): Promise<UserAccessInfo> {
  const access = await getUserAccessInfo(user);

  if (!access.isGlobal) {
    throw new ForbiddenException('Branch-bounded staff cannot create, edit, or delete hotel branches.');
  }

  if (
    access.roleName !== 'Admin' &&
    access.roleName !== 'System Admin' &&
    !hasRequiredPermission(access.permissions, ['hotel:*'])
  ) {
    throw new ForbiddenException('You do not have permission to manage hotel branches.');
  }

  return access;
}

export async function assertCanManageGlobalCatalog(user: JwtPayload, catalogName: string): Promise<UserAccessInfo> {
  const access = await getUserAccessInfo(user);

  if (!access.isGlobal) {
    throw new ForbiddenException(`Only global administrators can manage chain-wide ${catalogName}.`);
  }

  if (
    access.roleName !== 'Admin' &&
    access.roleName !== 'System Admin' &&
    !hasRequiredPermission(access.permissions, ['hotel:*', 'rooms:*'])
  ) {
    throw new ForbiddenException(`You do not have permission to manage ${catalogName}.`);
  }

  return access;
}

export async function assertCanManageBuilding(user: JwtPayload, branchId: string): Promise<UserAccessInfo> {
  const access = await getUserAccessInfo(user);

  if (
    access.roleName !== 'Admin' &&
    access.roleName !== 'System Admin' &&
    !hasRequiredPermission(access.permissions, ['hotel:*', 'rooms:*'])
  ) {
    throw new ForbiddenException('You do not have permission to manage buildings.');
  }

  if (!access.isGlobal) {
    if (!branchId || !access.branchIds.includes(branchId)) {
      throw new ForbiddenException('You can only manage buildings for your assigned branch.');
    }
  }

  return access;
}

export async function assertCanManageFloor(user: JwtPayload, buildingId: string): Promise<UserAccessInfo> {
  const access = await getUserAccessInfo(user);

  if (
    access.roleName !== 'Admin' &&
    access.roleName !== 'System Admin' &&
    !hasRequiredPermission(access.permissions, ['hotel:*', 'rooms:*'])
  ) {
    throw new ForbiddenException('You do not have permission to manage floors.');
  }

  if (!access.isGlobal) {
    const [bld] = await db.select({ branchId: buildingsTable.branchId }).from(buildingsTable).where(eq(buildingsTable.id, buildingId));
    if (!bld || !access.branchIds.includes(bld.branchId)) {
      throw new ForbiddenException('You can only manage floors for buildings within your assigned branch.');
    }
  }

  return access;
}

export async function assertCanManageUsers(user: JwtPayload): Promise<UserAccessInfo> {
  const access = await getUserAccessInfo(user);

  if (
    access.roleName !== 'Admin' &&
    access.roleName !== 'System Admin' &&
    !hasRequiredPermission(access.permissions, ['hr:*', 'employees:*', 'users:*', '*'])
  ) {
    throw new ForbiddenException('You do not have permission to manage staff user accounts.');
  }

  return access;
}

