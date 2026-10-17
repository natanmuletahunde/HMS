import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, like } from 'drizzle-orm';
import { db, bedTypesTable } from '@workspace/db';

const fmt = (r: any) => ({ ...r, deletedAt: r.deletedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });

@Injectable()
export class BedTypesService {
  async findAll(q: any) {
    const { search } = q;
    const conds: any[] = [eq(bedTypesTable.isActive, true)];
    if (search) conds.push(like(bedTypesTable.name, `%${search}%`));
    return (await db.select().from(bedTypesTable).where(and(...conds)).orderBy(bedTypesTable.sortOrder, bedTypesTable.name)).map(fmt);
  }
  async findOne(id: string) {
    const [r] = await db.select().from(bedTypesTable).where(eq(bedTypesTable.id, id));
    if (!r) throw new NotFoundException('Bed type not found');
    return fmt(r);
  }
  async create(b: any) {
    const [exist] = await db.select().from(bedTypesTable).where(eq(bedTypesTable.name, b.name));
    if (exist) throw new ConflictException('Bed type name already exists');
    const [r] = await db.insert(bedTypesTable).values({ name: b.name, description: b.description, capacity: b.capacity ?? 2, sortOrder: b.sortOrder ?? 0, createdBy: b.createdBy }).returning();
    return fmt(r);
  }
  async update(id: string, b: any) {
    const u: any = {};
    for (const k of ['name','description','capacity','sortOrder','isActive']) if (b[k] !== undefined) u[k] = b[k];
    u.updatedBy = b.updatedBy;
    const [r] = await db.update(bedTypesTable).set(u).where(eq(bedTypesTable.id, id)).returning();
    if (!r) throw new NotFoundException('Bed type not found');
    return fmt(r);
  }
  async remove(id: string) {
    await db.update(bedTypesTable).set({ isActive: false, deletedAt: new Date() }).where(eq(bedTypesTable.id, id));
    return { message: 'Bed type deleted' };
  }
}
