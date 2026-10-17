import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, like, sql, getTableColumns } from 'drizzle-orm';
import { db, buildingsTable, branchesTable, hotelsTable, floorsTable } from '@workspace/db';

const bldCols = getTableColumns(buildingsTable);
const fmt = (r: any) => ({ ...r, branchName: r.branchName ?? null, hotelName: r.hotelName ?? null, deletedAt: r.deletedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
const base = () => db.select({ ...bldCols, branchName: branchesTable.branchName, hotelName: hotelsTable.hotelName }).from(buildingsTable).leftJoin(branchesTable, eq(buildingsTable.branchId, branchesTable.id)).leftJoin(hotelsTable, eq(branchesTable.hotelId, hotelsTable.id));

@Injectable()
export class BuildingsService {
  async findAll(q: any) {
    const { branchId, hotelId, search, page = 1, limit = 50 } = q;
    const l = Math.min(+limit, 200); const offset = (+page - 1) * l;
    const conds: any[] = [eq(buildingsTable.isActive, true)];
    if (branchId) conds.push(eq(buildingsTable.branchId, branchId));
    if (hotelId) conds.push(eq(branchesTable.hotelId, hotelId));
    if (search) conds.push(like(buildingsTable.buildingName, `%${search}%`));
    const where = and(...conds);
    const [rows, [{ count }]] = await Promise.all([
      base().where(where).limit(l).offset(offset).orderBy(buildingsTable.buildingName),
      db.select({ count: sql<number>`count(*)::int` }).from(buildingsTable).leftJoin(branchesTable, eq(buildingsTable.branchId, branchesTable.id)).where(where),
    ]);
    return { data: rows.map(fmt), meta: { total: count, page: +page, limit: l, totalPages: Math.ceil(count / l) } };
  }
  async findOne(id: string) {
    const [r] = await base().where(eq(buildingsTable.id, id));
    if (!r) throw new NotFoundException('Building not found');
    return fmt(r);
  }
  async create(b: any) {
    const [exist] = await db.select().from(buildingsTable).where(eq(buildingsTable.buildingCode, b.buildingCode));
    if (exist) throw new ConflictException('Building code already exists');
    const numFloors = Math.max(1, +(b.numberOfFloors || 1));
    const [row] = await db.insert(buildingsTable).values({ branchId: b.branchId, buildingName: b.buildingName, buildingCode: b.buildingCode, numberOfFloors: numFloors, description: b.description, createdBy: b.createdBy }).returning();
    const floorRows = [];
    for (let i = 1; i <= numFloors; i++) {
      floorRows.push({
        buildingId: row.id,
        floorName: `Floor ${i}`,
        floorNumber: i,
        description: `Level ${i} of ${b.buildingName}`,
        createdBy: b.createdBy,
      });
    }
    if (floorRows.length > 0) {
      await db.insert(floorsTable).values(floorRows).onConflictDoNothing();
    }
    const [r] = await base().where(eq(buildingsTable.id, row.id));
    return fmt(r);
  }
  async update(id: string, b: any) {
    const u: any = {};
    for (const k of ['buildingName','numberOfFloors','description','isActive']) if (b[k] !== undefined) u[k] = b[k];
    u.updatedBy = b.updatedBy;
    const [row] = await db.update(buildingsTable).set(u).where(eq(buildingsTable.id, id)).returning();
    if (!row) throw new NotFoundException('Building not found');
    const [r] = await base().where(eq(buildingsTable.id, id));
    return fmt(r);
  }
  async remove(id: string) {
    await db.update(buildingsTable).set({ isActive: false, deletedAt: new Date() }).where(eq(buildingsTable.id, id));
    return { message: 'Building deleted' };
  }
}
