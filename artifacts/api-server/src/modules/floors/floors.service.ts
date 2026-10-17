import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, like, sql, getTableColumns } from 'drizzle-orm';
import { db, floorsTable, buildingsTable, branchesTable } from '@workspace/db';

const flrCols = getTableColumns(floorsTable);
const fmt = (r: any) => ({ ...r, buildingName: r.buildingName ?? null, branchName: r.branchName ?? null, deletedAt: r.deletedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
const base = () => db.select({ ...flrCols, buildingName: buildingsTable.buildingName, branchName: branchesTable.branchName }).from(floorsTable).leftJoin(buildingsTable, eq(floorsTable.buildingId, buildingsTable.id)).leftJoin(branchesTable, eq(buildingsTable.branchId, branchesTable.id));

@Injectable()
export class FloorsService {
  async findAll(q: any) {
    const { buildingId, search, page = 1, limit = 100 } = q;
    const l = Math.min(+limit, 500); const offset = (+page - 1) * l;
    const conds: any[] = [eq(floorsTable.isActive, true)];
    if (buildingId) conds.push(eq(floorsTable.buildingId, buildingId));
    if (search) conds.push(like(floorsTable.floorName, `%${search}%`));
    const where = and(...conds);
    const [rows, [{ count }]] = await Promise.all([
      base().where(where).limit(l).offset(offset).orderBy(floorsTable.floorNumber),
      db.select({ count: sql<number>`count(*)::int` }).from(floorsTable).where(where),
    ]);
    return { data: rows.map(fmt), meta: { total: count, page: +page, limit: l, totalPages: Math.ceil(count / l) } };
  }
  async findOne(id: string) {
    const [r] = await base().where(eq(floorsTable.id, id));
    if (!r) throw new NotFoundException('Floor not found');
    return fmt(r);
  }
  async create(b: any) {
    const [row] = await db.insert(floorsTable).values({ buildingId: b.buildingId, floorName: b.floorName, floorNumber: +b.floorNumber, description: b.description, createdBy: b.createdBy }).returning();
    const [r] = await base().where(eq(floorsTable.id, row.id));
    return fmt(r);
  }
  async update(id: string, b: any) {
    const u: any = {};
    for (const k of ['floorName','floorNumber','description','isActive']) if (b[k] !== undefined) u[k] = b[k];
    u.updatedBy = b.updatedBy;
    const [row] = await db.update(floorsTable).set(u).where(eq(floorsTable.id, id)).returning();
    if (!row) throw new NotFoundException('Floor not found');
    const [r] = await base().where(eq(floorsTable.id, id));
    return fmt(r);
  }
  async remove(id: string) {
    await db.update(floorsTable).set({ isActive: false, deletedAt: new Date() }).where(eq(floorsTable.id, id));
    return { message: 'Floor deleted' };
  }
}
