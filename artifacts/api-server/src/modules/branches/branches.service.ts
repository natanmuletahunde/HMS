import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq, and, like, sql, inArray, getTableColumns } from 'drizzle-orm';
import { db, branchesTable, hotelsTable, buildingsTable, userBranchesTable, usersTable } from '@workspace/db';

const branchCols = getTableColumns(branchesTable);
const fmt = (r: any) => ({ ...r, hotelName: r.hotelName ?? null, deletedAt: r.deletedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
const base = () => db.select({ ...branchCols, hotelName: hotelsTable.hotelName }).from(branchesTable).leftJoin(hotelsTable, eq(branchesTable.hotelId, hotelsTable.id));

@Injectable()
export class BranchesService {
  async findAll(q: any, allowedBranchIds?: string[] | null) {
    const { hotelId, search, page = 1, limit = 50 } = q;
    const l = Math.min(+limit, 200); const offset = (+page - 1) * l;
    const conds: any[] = [eq(branchesTable.isActive, true)];

    if (allowedBranchIds) {
      if (allowedBranchIds.length === 0) {
        conds.push(sql`1=0`);
      } else {
        conds.push(inArray(branchesTable.id, allowedBranchIds));
      }
    }

    if (hotelId) conds.push(eq(branchesTable.hotelId, hotelId));
    if (search) conds.push(like(branchesTable.branchName, `%${search}%`));
    const where = and(...conds);
    const [rows, [{ count }]] = await Promise.all([
      base().where(where).limit(l).offset(offset).orderBy(branchesTable.branchName),
      db.select({ count: sql<number>`count(*)::int` }).from(branchesTable).where(where),
    ]);
    return { data: rows.map(fmt), meta: { total: count, page: +page, limit: l, totalPages: Math.ceil(count / l) } };
  }

  async findOne(id: string) {
    const [r] = await base().where(eq(branchesTable.id, id));
    if (!r) throw new NotFoundException('Branch not found');
    return fmt(r);
  }

  async create(b: any) {
    const [exist] = await db.select().from(branchesTable).where(eq(branchesTable.branchCode, b.branchCode));
    if (exist) throw new ConflictException('Branch code already exists');
    const [row] = await db.insert(branchesTable).values({ hotelId: b.hotelId, branchName: b.branchName, branchCode: b.branchCode, manager: b.manager, email: b.email, phone: b.phone, address: b.address, description: b.description, createdBy: b.createdBy }).returning();
    const [r] = await base().where(eq(branchesTable.id, row.id));
    return fmt(r);
  }

  async update(id: string, b: any) {
    const u: any = {};
    for (const k of [
      'branchName', 'branchCode', 'legalName', 'manager', 'email', 'phone', 'website',
      'address', 'city', 'country', 'timezone', 'currencyCode', 'taxNumber', 'licenseNumber',
      'description', 'isActive', 'checkInTime', 'checkOutTime', 'starRating', 'settings'
    ]) if (b[k] !== undefined) u[k] = b[k];
    u.updatedBy = b.updatedBy;
    const [row] = await db.update(branchesTable).set(u).where(eq(branchesTable.id, id)).returning();
    if (!row) throw new NotFoundException('Branch not found');
    const [r] = await base().where(eq(branchesTable.id, id));
    return fmt(r);
  }

  async remove(id: string) {
    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
    if (!branch) throw new NotFoundException('Branch not found');

    // 1. Check for active buildings
    const [activeBuildings] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(buildingsTable)
      .where(and(eq(buildingsTable.branchId, id), eq(buildingsTable.isActive, true)));

    if (activeBuildings && activeBuildings.count > 0) {
      throw new BadRequestException(
        `Cannot delete branch '${branch.branchName}': ${activeBuildings.count} active building(s) exist in this branch. Remove or reassign buildings first.`
      );
    }

    // 2. Check for assigned users/staff
    const [assignedUsers] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userBranchesTable)
      .where(eq(userBranchesTable.branchId, id));

    const [primaryUsers] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(and(eq(usersTable.primaryBranchId, id), eq(usersTable.isActive, true)));

    const totalStaff = (assignedUsers?.count || 0) + (primaryUsers?.count || 0);
    if (totalStaff > 0) {
      throw new BadRequestException(
        `Cannot delete branch '${branch.branchName}': ${totalStaff} staff user(s) are assigned to this branch. Reassign staff members before deleting the branch.`
      );
    }

    await db.update(branchesTable).set({ isActive: false, deletedAt: new Date() }).where(eq(branchesTable.id, id));
    return { message: 'Branch deleted successfully' };
  }
}
