import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, ilike } from 'drizzle-orm';
import { db, rolesTable } from '@workspace/db';

const fmt = (r: any) => ({
  ...r,
  description: r.description ?? null,
  createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
});

@Injectable()
export class RolesService {
  findAll() {
    return db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.isActive, true))
      .orderBy(rolesTable.name)
      .then((r) => r.map(fmt));
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
            description: body.description ?? existing.description,
            permissions: body.permissions ?? existing.permissions,
          })
          .where(eq(rolesTable.id, existing.id))
          .returning();
        return fmt(reactivated);
      }
      throw new BadRequestException(`A role with name "${roleName}" already exists.`);
    }

    try {
      const [r] = await db
        .insert(rolesTable)
        .values({
          name: roleName,
          description: body.description || null,
          permissions: body.permissions ?? [],
        })
        .returning();
      return fmt(r);
    } catch (err: any) {
      if (err.code === '23505') {
        throw new BadRequestException(`A role with name "${roleName}" already exists.`);
      }
      throw err;
    }
  }

  async findOne(id: string) {
    const [r] = await db.select().from(rolesTable).where(eq(rolesTable.id, id));
    if (!r) throw new NotFoundException();
    return fmt(r);
  }

  async update(id: string, body: any) {
    const u: any = {};
    for (const k of ['name', 'description', 'permissions', 'isActive']) {
      if (body[k] !== undefined) u[k] = body[k];
    }
    const [r] = await db.update(rolesTable).set(u).where(eq(rolesTable.id, id)).returning();
    if (!r) throw new NotFoundException();
    return fmt(r);
  }

  async remove(id: string) {
    await db.update(rolesTable).set({ isActive: false }).where(eq(rolesTable.id, id));
    return { message: 'Role deleted' };
  }
}
