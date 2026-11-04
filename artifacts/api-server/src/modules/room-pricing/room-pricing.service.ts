import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, getTableColumns } from 'drizzle-orm';
import { db, roomPricingTable, roomsTable, roomTypesTable } from '@workspace/db';

const priceCols = getTableColumns(roomPricingTable);
const fmt = (r: any) => ({
  ...r,
  roomNumber: r.roomNumber ?? null,
  roomTypeId: r.roomTypeId ?? null,
  roomTypeName: r.roomTypeName ?? null,
  price: parseFloat(r.price),
  discountPercent: parseFloat(r.discountPercent ?? '0'),
  taxPercent: parseFloat(r.taxPercent ?? '0'),
  deletedAt: r.deletedAt?.toISOString() ?? null,
  createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
});
const base = () =>
  db
    .select({
      ...priceCols,
      roomNumber: roomsTable.number,
      roomTypeId: roomsTable.roomTypeId,
      roomTypeName: roomTypesTable.name,
    })
    .from(roomPricingTable)
    .leftJoin(roomsTable, eq(roomPricingTable.roomId, roomsTable.id))
    .leftJoin(roomTypesTable, eq(roomsTable.roomTypeId, roomTypesTable.id));

@Injectable()
export class RoomPricingService {
  async findAll(q: any) {
    const { roomId, roomTypeId, pricingType } = q;
    const conds: any[] = [eq(roomPricingTable.isActive, true)];
    if (roomId && roomId !== 'all') conds.push(eq(roomPricingTable.roomId, roomId));
    if (roomTypeId && roomTypeId !== 'all') conds.push(eq(roomsTable.roomTypeId, roomTypeId));
    if (pricingType && pricingType !== 'all') conds.push(eq(roomPricingTable.pricingType, pricingType));
    return (await base().where(and(...conds)).orderBy(roomPricingTable.pricingType)).map(fmt);
  }

  async findOne(id: string) {
    const [r] = await base().where(eq(roomPricingTable.id, id));
    if (!r) throw new NotFoundException('Pricing not found');
    return fmt(r);
  }

  async create(b: any) {
    // If roomTypeId is provided and user wants to apply to all rooms of this type
    if (b.roomTypeId && (!b.roomId || b.roomId === 'all')) {
      // 1. Update the base price of the Room Type itself
      if (b.pricingType === 'base' || !b.pricingType) {
        await db
          .update(roomTypesTable)
          .set({ basePrice: String(b.price) })
          .where(eq(roomTypesTable.id, b.roomTypeId));
      }

      // 2. Find all rooms of this type
      const targetRooms = await db
        .select({ id: roomsTable.id })
        .from(roomsTable)
        .where(and(eq(roomsTable.roomTypeId, b.roomTypeId), eq(roomsTable.isActive, true)));

      if (targetRooms.length > 0) {
        let lastCreated: any = null;
        for (const r of targetRooms) {
          const [row] = await db
            .insert(roomPricingTable)
            .values({
              roomId: r.id,
              pricingType: b.pricingType ?? 'base',
              price: String(b.price),
              discountPercent: b.discountPercent ? String(b.discountPercent) : '0',
              taxPercent: b.taxPercent ? String(b.taxPercent) : '0',
              effectiveDate: b.effectiveDate,
              expirationDate: b.expirationDate,
              notes: b.notes,
              createdBy: b.createdBy,
            })
            .returning();
          lastCreated = row;

          if (b.pricingType === 'base' || !b.pricingType) {
            await db.update(roomsTable).set({ currentPrice: String(b.price) }).where(eq(roomsTable.id, r.id));
          }
        }
        const [res] = await base().where(eq(roomPricingTable.id, lastCreated.id));
        return fmt(res);
      }

      return {
        id: crypto.randomUUID(),
        roomTypeId: b.roomTypeId,
        pricingType: b.pricingType ?? 'base',
        price: parseFloat(b.price),
        discountPercent: parseFloat(b.discountPercent ?? '0'),
        taxPercent: parseFloat(b.taxPercent ?? '0'),
        effectiveDate: b.effectiveDate,
        expirationDate: b.expirationDate,
        notes: b.notes,
        message: 'Updated Room Type base rate. No physical rooms currently assigned to this type.',
      };
    }

    // Direct room assignment
    const [row] = await db
      .insert(roomPricingTable)
      .values({
        roomId: b.roomId,
        pricingType: b.pricingType ?? 'base',
        price: String(b.price),
        discountPercent: b.discountPercent ? String(b.discountPercent) : '0',
        taxPercent: b.taxPercent ? String(b.taxPercent) : '0',
        effectiveDate: b.effectiveDate,
        expirationDate: b.expirationDate,
        notes: b.notes,
        createdBy: b.createdBy,
      })
      .returning();

    // Update room's current price if base pricing
    if (b.pricingType === 'base' || !b.pricingType) {
      await db.update(roomsTable).set({ currentPrice: String(b.price) }).where(eq(roomsTable.id, b.roomId));
    }
    const [r] = await base().where(eq(roomPricingTable.id, row.id));
    return fmt(r);
  }

  async update(id: string, b: any) {
    const u: any = {};
    for (const k of ['pricingType', 'price', 'discountPercent', 'taxPercent', 'effectiveDate', 'expirationDate', 'notes', 'isActive']) {
      if (b[k] !== undefined) u[k] = k.includes('rice') || k.includes('ercent') ? String(b[k]) : b[k];
    }
    u.updatedBy = b.updatedBy;
    const [r] = await db.update(roomPricingTable).set(u).where(eq(roomPricingTable.id, id)).returning();
    if (!r) throw new NotFoundException('Pricing not found');

    if ((r.pricingType === 'base' || !r.pricingType) && b.price !== undefined) {
      await db.update(roomsTable).set({ currentPrice: String(b.price) }).where(eq(roomsTable.id, r.roomId));
    }

    const [row] = await base().where(eq(roomPricingTable.id, id));
    return fmt(row);
  }

  async remove(id: string) {
    await db.update(roomPricingTable).set({ isActive: false, deletedAt: new Date() }).where(eq(roomPricingTable.id, id));
    return { message: 'Pricing deleted' };
  }
}
