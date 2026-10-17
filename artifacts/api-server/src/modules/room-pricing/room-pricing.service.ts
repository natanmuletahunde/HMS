import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, getTableColumns } from 'drizzle-orm';
import { db, roomPricingTable, roomsTable } from '@workspace/db';

const priceCols = getTableColumns(roomPricingTable);
const fmt = (r: any) => ({ ...r, roomNumber: r.roomNumber ?? null, price: parseFloat(r.price), discountPercent: parseFloat(r.discountPercent ?? '0'), taxPercent: parseFloat(r.taxPercent ?? '0'), deletedAt: r.deletedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
const base = () => db.select({ ...priceCols, roomNumber: roomsTable.number }).from(roomPricingTable).leftJoin(roomsTable, eq(roomPricingTable.roomId, roomsTable.id));

@Injectable()
export class RoomPricingService {
  async findAll(q: any) {
    const { roomId, pricingType } = q;
    const conds: any[] = [eq(roomPricingTable.isActive, true)];
    if (roomId) conds.push(eq(roomPricingTable.roomId, roomId));
    if (pricingType) conds.push(eq(roomPricingTable.pricingType, pricingType));
    return (await base().where(and(...conds)).orderBy(roomPricingTable.pricingType)).map(fmt);
  }
  async findOne(id: string) {
    const [r] = await base().where(eq(roomPricingTable.id, id));
    if (!r) throw new NotFoundException('Pricing not found');
    return fmt(r);
  }
  async create(b: any) {
    const [row] = await db.insert(roomPricingTable).values({ roomId: b.roomId, pricingType: b.pricingType ?? 'base', price: String(b.price), discountPercent: b.discountPercent ? String(b.discountPercent) : '0', taxPercent: b.taxPercent ? String(b.taxPercent) : '0', effectiveDate: b.effectiveDate, expirationDate: b.expirationDate, notes: b.notes, createdBy: b.createdBy }).returning();
    // Update room's current price if base pricing
    if (b.pricingType === 'base' || !b.pricingType) {
      await db.update(roomsTable).set({ currentPrice: String(b.price) }).where(eq(roomsTable.id, b.roomId));
    }
    const [r] = await base().where(eq(roomPricingTable.id, row.id));
    return fmt(r);
  }
  async update(id: string, b: any) {
    const u: any = {};
    for (const k of ['pricingType','price','discountPercent','taxPercent','effectiveDate','expirationDate','notes','isActive']) if (b[k] !== undefined) u[k] = k.includes('rice') || k.includes('ercent') ? String(b[k]) : b[k];
    u.updatedBy = b.updatedBy;
    const [r] = await db.update(roomPricingTable).set(u).where(eq(roomPricingTable.id, id)).returning();
    if (!r) throw new NotFoundException('Pricing not found');
    const [row] = await base().where(eq(roomPricingTable.id, id));
    return fmt(row);
  }
  async remove(id: string) {
    await db.update(roomPricingTable).set({ isActive: false, deletedAt: new Date() }).where(eq(roomPricingTable.id, id));
    return { message: 'Pricing deleted' };
  }
}
