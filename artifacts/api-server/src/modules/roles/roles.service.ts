import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, ilike, and, sql, getTableColumns } from 'drizzle-orm';
import { db, rolesTable, departmentsTable } from '@workspace/db';

const fmt = (r: any) => ({
  ...r,
  description: r.description ?? null,
  departmentId: r.departmentId ?? null,
  departmentName: r.departmentName ?? null,
  departmentCode: r.departmentCode ?? null,
  createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
});

@Injectable()
export class RolesService {
  async findAll() {
    const rows = await db
      .select({
        ...getTableColumns(rolesTable),
        departmentName: departmentsTable.name,
        departmentCode: departmentsTable.code,
      })
      .from(rolesTable)
      .leftJoin(departmentsTable, eq(rolesTable.departmentId, departmentsTable.id))
      .where(eq(rolesTable.isActive, true))
      .orderBy(rolesTable.name);
    return rows.map(fmt);
  }

  async create(body: any) {
    const roleName = (body.name || '').trim();
    if (!roleName) {
      throw new BadRequestException('Role name is required');
    }

    const [existing] = await db
      .select()
      .from(rolesTable)
      .where(ilike(rolesTable.name, roleName));

    if (existing) {
      if (!existing.isActive) {
        const [reactivated] = await db
          .update(rolesTable)
          .set({
            isActive: true,
            scope: body.scope || existing.scope,
            departmentId: body.departmentId !== undefined ? body.departmentId : existing.departmentId,
            description: body.description ?? existing.description,
            permissions: body.permissions ?? existing.permissions,
          })
          .where(eq(rolesTable.id, existing.id))
          .returning();
        return this.findOne(reactivated.id);
      }
      throw new BadRequestException(`A role with name "${roleName}" already exists.`);
    }

    try {
      const [r] = await db
        .insert(rolesTable)
        .values({
          name: roleName,
          scope: body.scope || 'branch',
          departmentId: body.departmentId || null,
          description: body.description || null,
          permissions: body.permissions ?? [],
        })
        .returning();
      return this.findOne(r.id);
    } catch (err: any) {
      if (err.code === '23505') {
        throw new BadRequestException(`A role with name "${roleName}" already exists.`);
      }
      throw err;
    }
  }

  async findOne(id: string) {
    const [r] = await db
      .select({
        ...getTableColumns(rolesTable),
        departmentName: departmentsTable.name,
        departmentCode: departmentsTable.code,
      })
      .from(rolesTable)
      .leftJoin(departmentsTable, eq(rolesTable.departmentId, departmentsTable.id))
      .where(eq(rolesTable.id, id));
    if (!r) throw new NotFoundException();
    return fmt(r);
  }

  async update(id: string, body: any) {
    const u: any = {};
    for (const k of ['name', 'description', 'scope', 'permissions', 'departmentId', 'isActive']) {
      if (body[k] !== undefined) u[k] = body[k];
    }
    if (u.name) {
      u.name = u.name.trim();
      const [existing] = await db
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(and(eq(rolesTable.name, u.name), sql`${rolesTable.id} != ${id}`));
      if (existing) {
        throw new BadRequestException(`A role with name "${u.name}" already exists. Please choose a different name.`);
      }
    }

    try {
      const [r] = await db.update(rolesTable).set(u).where(eq(rolesTable.id, id)).returning();
      if (!r) throw new NotFoundException('Role not found');
      return this.findOne(r.id);
    } catch (err: any) {
      const msg = err.message || '';
      if (err.code === '23505' || err.cause?.code === '23505' || msg.includes('unique') || msg.includes('23505')) {
        throw new BadRequestException(`A role with name "${u.name || body.name}" already exists.`);
      }
      throw err;
    }
  }

  async remove(id: string) {
    await db.update(rolesTable).set({ isActive: false }).where(eq(rolesTable.id, id));
    return { message: 'Role deleted' };
  }
}
