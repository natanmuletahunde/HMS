import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, getTableColumns } from 'drizzle-orm';
import { db, roomTypesTable, roomCategoriesTable, bedTypesTable } from '@workspace/db';

const rtCols = getTableColumns(roomTypesTable);

const fmt = (rt: any) => ({
  ...rt,
  description: rt.description ?? null,
  imageUrl: rt.imageUrl ?? null,
  categoryId: rt.categoryId ?? null,
  categoryName: rt.categoryName ?? null,
  bedTypeId: rt.bedTypeId ?? null,
  bedTypeName: rt.bedTypeName ?? null,
  basePrice: parseFloat(rt.basePrice),
  maxOccupancy: parseInt(rt.maxOccupancy, 10),
  maximumAdults: rt.maximumAdults ?? 2,
  maximumChildren: rt.maximumChildren ?? 1,
  amenities: Array.isArray(rt.amenities) ? rt.amenities : [],
  createdAt: rt.createdAt instanceof Date ? rt.createdAt.toISOString() : rt.createdAt,
});

@Injectable()
export class RoomTypesService {
  findAll(categoryId?: string) {
    const conditions = [eq(roomTypesTable.isActive, true)];
    if (categoryId && categoryId !== 'all') {
      conditions.push(eq(roomTypesTable.categoryId, categoryId));
    }

    return db
      .select({
        ...rtCols,
        categoryName: roomCategoriesTable.name,
        bedTypeName: bedTypesTable.name,
      })
      .from(roomTypesTable)
      .leftJoin(roomCategoriesTable, eq(roomTypesTable.categoryId, roomCategoriesTable.id))
      .leftJoin(bedTypesTable, eq(roomTypesTable.bedTypeId, bedTypesTable.id))
      .where(and(...conditions))
      .orderBy(roomTypesTable.name)
      .then((r) => r.map(fmt));
  }

  async create(b: any) {
    const [rt] = await db
      .insert(roomTypesTable)
      .values({
        name: b.name,
        description: b.description,
        categoryId: b.categoryId || null,
        bedTypeId: b.bedTypeId || null,
        basePrice: String(b.basePrice),
        maxOccupancy: String((Number(b.maximumAdults) || 2) + (Number(b.maximumChildren) || 0)),
        maximumAdults: b.maximumAdults !== undefined ? Number(b.maximumAdults) : 2,
        maximumChildren: b.maximumChildren !== undefined ? Number(b.maximumChildren) : 1,
        amenities: Array.isArray(b.amenities) ? b.amenities : [],
        imageUrl: b.imageUrl,
      })
      .returning();
    return this.findOne(rt.id);
  }

  async findOne(id: string) {
    const [rt] = await db
      .select({
        ...rtCols,
        categoryName: roomCategoriesTable.name,
        bedTypeName: bedTypesTable.name,
      })
      .from(roomTypesTable)
      .leftJoin(roomCategoriesTable, eq(roomTypesTable.categoryId, roomCategoriesTable.id))
      .leftJoin(bedTypesTable, eq(roomTypesTable.bedTypeId, bedTypesTable.id))
      .where(eq(roomTypesTable.id, id));
    if (!rt) throw new NotFoundException();
    return fmt(rt);
  }

  async update(id: string, b: any) {
    const u: any = {};
    if (b.name) u.name = b.name;
    if (b.description !== undefined) u.description = b.description;
    if (b.categoryId !== undefined) u.categoryId = b.categoryId || null;
    if (b.bedTypeId !== undefined) u.bedTypeId = b.bedTypeId || null;
    if (b.basePrice !== undefined) u.basePrice = String(b.basePrice);
    if (b.maximumAdults !== undefined) u.maximumAdults = Number(b.maximumAdults);
    if (b.maximumChildren !== undefined) u.maximumChildren = Number(b.maximumChildren);
    if (b.maxOccupancy !== undefined) {
      u.maxOccupancy = String(b.maxOccupancy);
    } else if (b.maximumAdults !== undefined || b.maximumChildren !== undefined) {
      const adult = b.maximumAdults !== undefined ? Number(b.maximumAdults) : 2;
      const child = b.maximumChildren !== undefined ? Number(b.maximumChildren) : 1;
      u.maxOccupancy = String(adult + child);
    }
    if (b.amenities !== undefined) u.amenities = Array.isArray(b.amenities) ? b.amenities : [];
    if (b.imageUrl !== undefined) u.imageUrl = b.imageUrl;
    if (b.isActive !== undefined) u.isActive = b.isActive;

    const [rt] = await db.update(roomTypesTable).set(u).where(eq(roomTypesTable.id, id)).returning();
    if (!rt) throw new NotFoundException();
    return this.findOne(id);
  }

  async remove(id: string) {
    await db.update(roomTypesTable).set({ isActive: false }).where(eq(roomTypesTable.id, id));
    return { message: 'Room type deleted' };
  }
}
