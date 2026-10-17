import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, like } from 'drizzle-orm';
import { db, roomAmenitiesTable } from '@workspace/db';

const fmt = (r: any) => ({ ...r, deletedAt: r.deletedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });

@Injectable()
export class RoomAmenitiesService {
  async findAll(q: any) {
    const { search, category } = q;
    const conds: any[] = [eq(roomAmenitiesTable.isActive, true)];
    if (search) conds.push(like(roomAmenitiesTable.name, `%${search}%`));
    if (category) conds.push(eq(roomAmenitiesTable.category, category));
    return (await db.select().from(roomAmenitiesTable).where(and(...conds)).orderBy(roomAmenitiesTable.category, roomAmenitiesTable.sortOrder, roomAmenitiesTable.name)).map(fmt);
  }
  async findOne(id: string) {
    const [r] = await db.select().from(roomAmenitiesTable).where(eq(roomAmenitiesTable.id, id));
    if (!r) throw new NotFoundException('Amenity not found');
    return fmt(r);
  }
  async create(b: any) {
    const [exist] = await db.select().from(roomAmenitiesTable).where(eq(roomAmenitiesTable.name, b.name));
    if (exist) throw new ConflictException('Amenity name already exists');
    const [r] = await db.insert(roomAmenitiesTable).values({ name: b.name, description: b.description, icon: b.icon, category: b.category ?? 'other', sortOrder: b.sortOrder ?? 0, createdBy: b.createdBy }).returning();
    return fmt(r);
  }
  async update(id: string, b: any) {
    const u: any = {};
    for (const k of ['name','description','icon','category','sortOrder','isActive']) if (b[k] !== undefined) u[k] = b[k];
    u.updatedBy = b.updatedBy;
    const [r] = await db.update(roomAmenitiesTable).set(u).where(eq(roomAmenitiesTable.id, id)).returning();
    if (!r) throw new NotFoundException('Amenity not found');
    return fmt(r);
  }
  async remove(id: string) {
    await db.update(roomAmenitiesTable).set({ isActive: false, deletedAt: new Date() }).where(eq(roomAmenitiesTable.id, id));
    return { message: 'Amenity deleted' };
  }
}
