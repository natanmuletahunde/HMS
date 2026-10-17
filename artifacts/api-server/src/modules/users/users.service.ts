import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq, like, and, sql, or } from 'drizzle-orm';
import { db, usersTable, rolesTable } from '@workspace/db';
import { validatePassword } from '../../common/utils/password-policy';

const fields = {
  id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName,
  lastName: usersTable.lastName, phone: usersTable.phone, avatarUrl: usersTable.avatarUrl,
  roleId: usersTable.roleId, roleName: rolesTable.name,
  isActive: usersTable.isActive, createdAt: usersTable.createdAt,
};

const fmt = (u: any) => ({
  ...u,
  phone: u.phone ?? null,
  avatarUrl: u.avatarUrl ?? null,
  roleName: u.roleName ?? null,
  createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
});

@Injectable()
export class UsersService {
  async findAll(page = 1, limit = 20, search?: string, roleId?: string, isActive?: string) {
    const l = Math.min(limit, 100);
    const offset = (page - 1) * l;
    const conds: any[] = [];
    if (search) conds.push(or(like(usersTable.firstName, `%${search}%`), like(usersTable.lastName, `%${search}%`), like(usersTable.email, `%${search}%`)));
    if (roleId) conds.push(eq(usersTable.roleId, roleId));
    if (isActive !== undefined) conds.push(eq(usersTable.isActive, isActive === 'true'));
    const where = conds.length > 0 ? and(...conds) : undefined;
    const [rows, [{ count }]] = await Promise.all([
      db.select(fields).from(usersTable).leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id)).where(where).limit(l).offset(offset).orderBy(usersTable.createdAt),
      db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(where),
    ]);
    return { data: rows.map(fmt), meta: { total: count, page, limit: l, totalPages: Math.ceil(count / l) } };
  }

  async create(body: any) {
    // Enforce password policy before hashing
    if (body.password) {
      const { valid, errors } = validatePassword(body.password);
      if (!valid) throw new BadRequestException(`Password does not meet policy requirements: ${errors.join('; ')}`);
    }
    const hash = await bcrypt.hash(body.password, 10);
    const [user] = await db.insert(usersTable).values({
      email: body.email.toLowerCase(),
      passwordHash: hash,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      roleId: body.roleId,
    }).returning();
    const [role] = await db.select({ name: rolesTable.name }).from(rolesTable).where(eq(rolesTable.id, user.roleId));
    return fmt({ ...user, roleName: role?.name ?? null });
  }

  async findOne(id: string) {
    const [u] = await db.select(fields).from(usersTable).leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id)).where(eq(usersTable.id, id));
    if (!u) throw new NotFoundException('User not found');
    return fmt(u);
  }

  async update(id: string, body: any) {
    const updates: any = {};
    for (const k of ['firstName', 'lastName', 'phone', 'roleId', 'isActive']) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    // Enforce password policy if password is being changed
    if (body.password) {
      const { valid, errors } = validatePassword(body.password);
      if (!valid) throw new BadRequestException(`Password does not meet policy requirements: ${errors.join('; ')}`);
      updates.passwordHash = await bcrypt.hash(body.password, 10);
    }
    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!user) throw new NotFoundException('User not found');
    const [role] = await db.select({ name: rolesTable.name }).from(rolesTable).where(eq(rolesTable.id, user.roleId));
    return fmt({ ...user, roleName: role?.name ?? null });
  }

  async remove(id: string) {
    const [u] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
    if (!u) throw new NotFoundException('User not found');
    return { message: 'User deleted' };
  }
}
