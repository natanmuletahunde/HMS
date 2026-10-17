import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, roomTypesTable } from '@workspace/db';
const fmt = (rt: any) => ({ ...rt, description: rt.description ?? null, imageUrl: rt.imageUrl ?? null, basePrice: parseFloat(rt.basePrice), maxOccupancy: parseInt(rt.maxOccupancy, 10), createdAt: rt.createdAt instanceof Date ? rt.createdAt.toISOString() : rt.createdAt });
@Injectable()
export class RoomTypesService {
  findAll() { return db.select().from(roomTypesTable).where(eq(roomTypesTable.isActive, true)).orderBy(roomTypesTable.name).then(r => r.map(fmt)); }
  async create(b: any) { const [rt] = await db.insert(roomTypesTable).values({ name: b.name, description: b.description, basePrice: String(b.basePrice), maxOccupancy: String(b.maxOccupancy ?? 2), amenities: b.amenities ?? [], imageUrl: b.imageUrl }).returning(); return fmt(rt); }
  async findOne(id: string) { const [rt] = await db.select().from(roomTypesTable).where(eq(roomTypesTable.id, id)); if (!rt) throw new NotFoundException(); return fmt(rt); }
  async update(id: string, b: any) { const u: any = {}; if (b.name) u.name = b.name; if (b.description !== undefined) u.description = b.description; if (b.basePrice !== undefined) u.basePrice = String(b.basePrice); if (b.maxOccupancy !== undefined) u.maxOccupancy = String(b.maxOccupancy); if (b.amenities) u.amenities = b.amenities; if (b.imageUrl !== undefined) u.imageUrl = b.imageUrl; if (b.isActive !== undefined) u.isActive = b.isActive; const [rt] = await db.update(roomTypesTable).set(u).where(eq(roomTypesTable.id, id)).returning(); if (!rt) throw new NotFoundException(); return fmt(rt); }
  async remove(id: string) { await db.update(roomTypesTable).set({ isActive: false }).where(eq(roomTypesTable.id, id)); return { message: 'Room type deleted' }; }
}
