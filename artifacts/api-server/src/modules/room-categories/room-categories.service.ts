import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, like, sql } from 'drizzle-orm';
import { db, roomCategoriesTable } from '@workspace/db';

const fmt = (r: any) => ({ ...r, deletedAt: r.deletedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });

@Injectable()
export class RoomCategoriesService {
  async findAll(q: any) {
    const { search, page = 1, limit = 100 } = q;
    const conds: any[] = [eq(roomCategoriesTable.isActive, true)];
    if (search) conds.push(like(roomCategoriesTable.name, `%${search}%`));
    const rows = await db.select().from(roomCategoriesTable).where(and(...conds)).orderBy(roomCategoriesTable.sortOrder, roomCategoriesTable.name);
    return rows.map(fmt);
  }
  async findOne(id: string) {
    const [r] = await db.select().from(roomCategoriesTable).where(eq(roomCategoriesTable.id, id));
    if (!r) throw new NotFoundException('Room category not found');
    return fmt(r);
  }
  async create(b: any) {
    const [exist] = await db.select().from(roomCategoriesTable).where(eq(roomCategoriesTable.name, b.name));
    if (exist) throw new ConflictException('Room category name already exists');
    const [r] = await db.insert(roomCategoriesTable).values({ name: b.name, description: b.description, sortOrder: b.sortOrder ?? 0, createdBy: b.createdBy }).returning();
    return fmt(r);
  }
  async update(id: string, b: any) {
    const u: any = {};
    for (const k of ['name','description','sortOrder','isActive']) if (b[k] !== undefined) u[k] = b[k];
    u.updatedBy = b.updatedBy;
    const [r] = await db.update(roomCategoriesTable).set(u).where(eq(roomCategoriesTable.id, id)).returning();
    if (!r) throw new NotFoundException('Room category not found');
    return fmt(r);
  }
  async remove(id: string) {
    await db.update(roomCategoriesTable).set({ isActive: false, deletedAt: new Date() }).where(eq(roomCategoriesTable.id, id));
    return { message: 'Room category deleted' };
  }
}
