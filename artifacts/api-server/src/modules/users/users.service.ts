import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq, like, and, sql, or, inArray } from 'drizzle-orm';
import { db, usersTable, rolesTable, userBranchesTable, branchesTable } from '@workspace/db';
import { validatePassword } from '../../common/utils/password-policy';

const fields = {
  id: usersTable.id,
  email: usersTable.email,
  firstName: usersTable.firstName,
  lastName: usersTable.lastName,
  phone: usersTable.phone,
  faydaId: usersTable.faydaId,
  avatarUrl: usersTable.avatarUrl,
  roleId: usersTable.roleId,
  roleName: rolesTable.name,
  roleScope: rolesTable.scope,
  primaryBranchId: usersTable.primaryBranchId,
  isActive: usersTable.isActive,
  isOnDuty: usersTable.isOnDuty,
  createdAt: usersTable.createdAt,
};

const fmt = (u: any, branches: any[] = []) => ({
  ...u,
  phone: u.phone ?? null,
  faydaId: u.faydaId ?? null,
  avatarUrl: u.avatarUrl ?? null,
  roleName: u.roleName ?? null,
  roleScope: u.roleScope ?? 'branch',
  primaryBranchId: u.primaryBranchId ?? null,
  branches,
  createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
});

function validateEthiopianPhone(phone: string): string {
  let clean = phone.trim().replace(/[\s\-]/g, '');
  if (clean.startsWith('+251')) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('251') && clean.length === 12) {
    clean = '0' + clean.slice(3);
  }
  if (!/^0[79]\d{8}$/.test(clean)) {
    throw new BadRequestException('Phone number must be a valid 10-digit Ethiopian number starting with 09 or 07 (e.g. 0911223344).');
  }
  return clean;
}

@Injectable()
export class UsersService {
  async findAll(page = 1, limit = 20, search?: string, roleId?: string, isActive?: string, branchId?: string) {
    const l = Math.min(limit, 100);
    const offset = (page - 1) * l;
    const conds: any[] = [];
    if (search) {
      conds.push(
        or(
          like(usersTable.firstName, `%${search}%`),
          like(usersTable.lastName, `%${search}%`),
          like(usersTable.email, `%${search}%`),
          like(usersTable.faydaId, `%${search}%`)
        )
      );
    }
    if (roleId) conds.push(eq(usersTable.roleId, roleId));
    if (isActive !== undefined) conds.push(eq(usersTable.isActive, isActive === 'true'));
    
    // If filtering by branch, locate users assigned to this branch
    if (branchId) {
      const usersInBranch = await db
        .select({ userId: userBranchesTable.userId })
        .from(userBranchesTable)
        .where(eq(userBranchesTable.branchId, branchId));
      const branchUserIds = usersInBranch.map((r) => r.userId);
      if (branchUserIds.length === 0) {
        return { data: [], meta: { total: 0, page, limit: l, totalPages: 0 } };
      }
      conds.push(inArray(usersTable.id, branchUserIds));
    }

    const where = conds.length > 0 ? and(...conds) : undefined;
    const [rows, [{ count }]] = await Promise.all([
      db.select(fields).from(usersTable).leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id)).where(where).limit(l).offset(offset).orderBy(usersTable.createdAt),
      db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(where),
    ]);

    // Batch fetch branches for found users
    const userIds = rows.map((r) => r.id);
    let branchMap: Record<string, any[]> = {};
    if (userIds.length > 0) {
      const ubRows = await db
        .select({
          userId: userBranchesTable.userId,
          branchId: branchesTable.id,
          branchName: branchesTable.branchName,
          branchCode: branchesTable.branchCode,
          isPrimary: userBranchesTable.isPrimary,
        })
        .from(userBranchesTable)
        .innerJoin(branchesTable, eq(userBranchesTable.branchId, branchesTable.id))
        .where(inArray(userBranchesTable.userId, userIds));

      branchMap = ubRows.reduce((acc, row) => {
        if (!acc[row.userId]) acc[row.userId] = [];
        acc[row.userId].push({
          id: row.branchId,
          branchName: row.branchName,
          branchCode: row.branchCode,
          isPrimary: row.isPrimary,
        });
        return acc;
      }, {} as Record<string, any[]>);
    }

    return {
      data: rows.map((u) => fmt(u, branchMap[u.id] || [])),
      meta: { total: count, page, limit: l, totalPages: Math.ceil(count / l) },
    };
  }

  async create(body: any) {
    if (body.password) {
      const { valid, errors } = validatePassword(body.password);
      if (!valid) throw new BadRequestException(`Password does not meet policy requirements: ${errors.join('; ')}`);
    }
    const hash = await bcrypt.hash(body.password, 10);

    // Fayda validation & duplicate check
    let trimmedFayda: string | null = null;
    if (body.faydaId && body.faydaId.trim()) {
      trimmedFayda = body.faydaId.trim();
      if (trimmedFayda.length > 16) {
        throw new BadRequestException('Fayda ID cannot exceed 16 digits.');
      }
      const [existingFayda] = await db
        .select({ id: usersTable.id, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.faydaId, trimmedFayda));
      if (existingFayda) {
        throw new BadRequestException(`A staff account with Fayda ID "${trimmedFayda}" already exists.`);
      }
    }

    // Phone validation (Ethiopian phone format: max 10 digits starting with 09 or 07)
    let formattedPhone: string | null = null;
    if (body.phone && body.phone.trim()) {
      formattedPhone = validateEthiopianPhone(body.phone);
    }

    const branchIds: string[] = Array.isArray(body.branchIds)
      ? body.branchIds
      : body.branchId
      ? [body.branchId]
      : [];
    const primaryBranchId = body.primaryBranchId || (branchIds.length > 0 ? branchIds[0] : null);

    const [user] = await db
      .insert(usersTable)
      .values({
        email: body.email.toLowerCase(),
        passwordHash: hash,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: formattedPhone,
        faydaId: trimmedFayda,
        roleId: body.roleId,
        primaryBranchId,
      })
      .returning();

    // Assign user to branches
    if (branchIds.length > 0) {
      for (const bId of branchIds) {
        await db
          .insert(userBranchesTable)
          .values({
            userId: user.id,
            branchId: bId,
            isPrimary: bId === primaryBranchId,
          })
          .onConflictDoNothing();
      }
    }

    return this.findOne(user.id);
  }

  async findOne(id: string) {
    const [u] = await db
      .select(fields)
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.id, id));
    if (!u) throw new NotFoundException('User not found');

    const ubRows = await db
      .select({
        branchId: branchesTable.id,
        branchName: branchesTable.branchName,
        branchCode: branchesTable.branchCode,
        isPrimary: userBranchesTable.isPrimary,
      })
      .from(userBranchesTable)
      .innerJoin(branchesTable, eq(userBranchesTable.branchId, branchesTable.id))
      .where(eq(userBranchesTable.userId, id));

    const branches = ubRows.map((r) => ({
      id: r.branchId,
      branchName: r.branchName,
      branchCode: r.branchCode,
      isPrimary: r.isPrimary,
    }));

    return fmt(u, branches);
  }

  async update(id: string, body: any) {
    const updates: any = {};
    for (const k of ['firstName', 'lastName', 'roleId', 'isOnDuty']) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (body.isActive !== undefined) {
      updates.isActive = Boolean(body.isActive);
      if (body.isActive === false) {
        updates.isOnDuty = false;
      }
    }

    // Phone validation & format
    if (body.phone !== undefined) {
      if (body.phone && body.phone.trim()) {
        updates.phone = validateEthiopianPhone(body.phone);
      } else {
        updates.phone = null;
      }
    }

    // Password update
    if (body.password && body.password.trim() !== '') {
      const { valid, errors } = validatePassword(body.password);
      if (!valid) throw new BadRequestException(`Password does not meet policy requirements: ${errors.join('; ')}`);
      updates.passwordHash = await bcrypt.hash(body.password, 10);
    }

    // Fayda validation & duplicate check
    if (body.faydaId !== undefined) {
      if (body.faydaId && body.faydaId.trim()) {
        const trimmedFayda = body.faydaId.trim();
        if (trimmedFayda.length > 16) {
          throw new BadRequestException('Fayda ID cannot exceed 16 digits.');
        }
        const [existingFayda] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(and(eq(usersTable.faydaId, trimmedFayda), sql`${usersTable.id} != ${id}`));
        if (existingFayda) {
          throw new BadRequestException(`A staff account with Fayda ID "${trimmedFayda}" already exists.`);
        }
        updates.faydaId = trimmedFayda;
      } else {
        updates.faydaId = null;
      }
    }

    // Branch synchronisation
    if (body.branchIds !== undefined) {
      const branchIds: string[] = Array.isArray(body.branchIds) ? body.branchIds : [];
      const primaryBranchId = body.primaryBranchId || (branchIds.length > 0 ? branchIds[0] : null);
      updates.primaryBranchId = primaryBranchId;

      // Replace user_branches assignments
      await db.delete(userBranchesTable).where(eq(userBranchesTable.userId, id));
      for (const bId of branchIds) {
        await db
          .insert(userBranchesTable)
          .values({
            userId: id,
            branchId: bId,
            isPrimary: bId === primaryBranchId,
          })
          .onConflictDoNothing();
      }
    } else if (body.primaryBranchId !== undefined) {
      updates.primaryBranchId = body.primaryBranchId;
      await db
        .update(userBranchesTable)
        .set({ isPrimary: false })
        .where(eq(userBranchesTable.userId, id));
      if (body.primaryBranchId) {
        await db
          .update(userBranchesTable)
          .set({ isPrimary: true })
          .where(and(eq(userBranchesTable.userId, id), eq(userBranchesTable.branchId, body.primaryBranchId)));
      }
    }

    if (Object.keys(updates).length > 0) {
      const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
      if (!user) throw new NotFoundException('User not found');
    }

    return this.findOne(id);
  }

  async assignBranches(userId: string, body: { branchIds: string[]; primaryBranchId?: string }) {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
    if (!user) throw new NotFoundException('User not found');

    const branchIds = body.branchIds || [];
    const primaryBranchId = body.primaryBranchId || (branchIds.length > 0 ? branchIds[0] : null);

    await db.delete(userBranchesTable).where(eq(userBranchesTable.userId, userId));
    for (const bId of branchIds) {
      await db
        .insert(userBranchesTable)
        .values({
          userId,
          branchId: bId,
          isPrimary: bId === primaryBranchId,
        })
        .onConflictDoNothing();
    }

    await db
      .update(usersTable)
      .set({ primaryBranchId })
      .where(eq(usersTable.id, userId));

    return this.findOne(userId);
  }

  async remove(id: string) {
    const [u] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
    if (!u) throw new NotFoundException('User not found');
    return { message: 'User deleted' };
  }
}
