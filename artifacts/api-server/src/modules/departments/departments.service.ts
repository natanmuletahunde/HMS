import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, ilike, and, sql, inArray } from 'drizzle-orm';
import { db, departmentsTable, rolesTable, usersTable } from '@workspace/db';

@Injectable()
export class DepartmentsService {
  async findAll() {
    const depts = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.isActive, true))
      .orderBy(departmentsTable.name);

    const allRoles = await db
      .select({
        id: rolesTable.id,
        name: rolesTable.name,
        scope: rolesTable.scope,
        departmentId: rolesTable.departmentId,
        permissions: rolesTable.permissions,
        isActive: rolesTable.isActive,
      })
      .from(rolesTable)
      .where(eq(rolesTable.isActive, true));

    const users = await db
      .select({
        id: usersTable.id,
        roleId: usersTable.roleId,
        department: usersTable.department,
        isActive: usersTable.isActive,
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true));

    return depts.map((d) => {
      const deptRoles = allRoles
        .filter((r) => r.departmentId === d.id)
        .map((r) => ({
          id: r.id,
          name: r.name,
          scope: r.scope,
          permissionsCount: Array.isArray(r.permissions) ? r.permissions.length : 0,
        }));

      const roleIdSet = new Set(deptRoles.map((r) => r.id));
      const staffCount = users.filter(
        (u) => (u.department && u.department.toLowerCase() === d.name.toLowerCase()) || roleIdSet.has(u.roleId),
      ).length;

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description,
        isActive: d.isActive,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        roles: deptRoles,
        rolesCount: deptRoles.length,
        staffCount,
      };
    });
  }

  async findOne(id: string) {
    const [dept] = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, id));

    if (!dept) throw new NotFoundException(`Department with ID ${id} not found`);

    const deptRoles = await db
      .select({
        id: rolesTable.id,
        name: rolesTable.name,
        scope: rolesTable.scope,
        permissions: rolesTable.permissions,
      })
      .from(rolesTable)
      .where(and(eq(rolesTable.departmentId, id), eq(rolesTable.isActive, true)));

    const roleIdSet = new Set(deptRoles.map((r) => r.id));
    const allUsers = await db
      .select({
        id: usersTable.id,
        roleId: usersTable.roleId,
        department: usersTable.department,
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true));

    const staffCount = allUsers.filter(
      (u) => (u.department && u.department.toLowerCase() === dept.name.toLowerCase()) || roleIdSet.has(u.roleId),
    ).length;

    return {
      ...dept,
      roles: deptRoles.map((r) => ({
        id: r.id,
        name: r.name,
        scope: r.scope,
        permissionsCount: Array.isArray(r.permissions) ? r.permissions.length : 0,
      })),
      rolesCount: deptRoles.length,
      staffCount,
    };
  }

  async create(body: any) {
    const deptName = (body.name || '').trim();
    if (!deptName) {
      throw new BadRequestException('Department name is required');
    }

    const [existing] = await db
      .select()
      .from(departmentsTable)
      .where(ilike(departmentsTable.name, deptName));

    let deptRecord = existing;

    if (existing) {
      if (!existing.isActive) {
        const [reactivated] = await db
          .update(departmentsTable)
          .set({
            isActive: true,
            code: body.code ? body.code.trim().toUpperCase() : existing.code,
            description: body.description ?? existing.description,
          })
          .where(eq(departmentsTable.id, existing.id))
          .returning();
        deptRecord = reactivated;
      } else {
        throw new BadRequestException(`Department "${deptName}" already exists`);
      }
    } else {
      const [created] = await db
        .insert(departmentsTable)
        .values({
          name: deptName,
          code: body.code ? body.code.trim().toUpperCase() : null,
          description: body.description || null,
          isActive: true,
        })
        .returning();
      deptRecord = created;
    }

    // Assign roles if roleIds provided
    if (Array.isArray(body.roleIds) && body.roleIds.length > 0) {
      await db
        .update(rolesTable)
        .set({ departmentId: deptRecord.id })
        .where(inArray(rolesTable.id, body.roleIds));
    }

    return this.findOne(deptRecord.id);
  }

  async update(id: string, body: any) {
    const dept = await this.findOne(id);

    const u: any = {};
    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      if (!trimmed) throw new BadRequestException('Department name cannot be empty');
      const [duplicate] = await db
        .select({ id: departmentsTable.id })
        .from(departmentsTable)
        .where(and(ilike(departmentsTable.name, trimmed), sql`${departmentsTable.id} != ${id}`));
      if (duplicate) {
        throw new BadRequestException(`Department "${trimmed}" already exists`);
      }
      u.name = trimmed;
    }
    if (body.code !== undefined) {
      u.code = body.code ? body.code.trim().toUpperCase() : null;
    }
    if (body.description !== undefined) {
      u.description = body.description || null;
    }
    if (body.isActive !== undefined) {
      u.isActive = Boolean(body.isActive);
    }

    if (Object.keys(u).length > 0) {
      await db.update(departmentsTable).set(u).where(eq(departmentsTable.id, id));
    }

    // Synchronize roles if roleIds is passed
    if (Array.isArray(body.roleIds)) {
      // 1. Clear roles currently assigned to this department
      await db
        .update(rolesTable)
        .set({ departmentId: null })
        .where(eq(rolesTable.departmentId, id));

      // 2. Assign selected roles to this department
      if (body.roleIds.length > 0) {
        await db
          .update(rolesTable)
          .set({ departmentId: id })
          .where(inArray(rolesTable.id, body.roleIds));
      }
    }

    return this.findOne(id);
  }

  async remove(id: string, options?: { reassignToDepartmentId?: string }) {
    const dept = await this.findOne(id);

    // Check if any active users are currently assigned
    if (dept.staffCount > 0) {
      throw new BadRequestException(
        `Cannot delete department "${dept.name}" because ${dept.staffCount} active staff member(s) are assigned to it. Please reassign staff before deleting.`,
      );
    }

    // If reassignToDepartmentId is provided, transfer all roles in this department to that target department
    if (options?.reassignToDepartmentId) {
      const [targetDept] = await db
        .select()
        .from(departmentsTable)
        .where(eq(departmentsTable.id, options.reassignToDepartmentId));
      if (!targetDept) {
        throw new BadRequestException('Target department for role reassignment does not exist.');
      }
      await db
        .update(rolesTable)
        .set({ departmentId: options.reassignToDepartmentId })
        .where(eq(rolesTable.departmentId, id));
    } else {
      // Unassign any roles linked to this department
      await db
        .update(rolesTable)
        .set({ departmentId: null })
        .where(eq(rolesTable.departmentId, id));
    }

    // Soft delete
    await db
      .update(departmentsTable)
      .set({ isActive: false })
      .where(eq(departmentsTable.id, id));

    return { 
      success: true, 
      message: `Department "${dept.name}" deactivated successfully${options?.reassignToDepartmentId ? ' and its roles have been reassigned.' : ' and its roles have been unassigned.'}` 
    };
  }
}
