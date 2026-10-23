import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { db, hotelsTable, branchesTable, buildingsTable, floorsTable, roomsTable } from '@workspace/db';

const fmt = (h: any) => ({ ...h, starRating: h.starRating ?? null, settings: h.settings ?? {}, deletedAt: h.deletedAt?.toISOString() ?? null, createdAt: h.createdAt.toISOString(), updatedAt: h.updatedAt.toISOString() });

@Injectable()
export class HotelService {
  async findAll() {
    const rows = await db.select().from(hotelsTable).where(eq(hotelsTable.isActive, true)).orderBy(hotelsTable.hotelName);
    return rows.map(fmt);
  }
  async getStats() {
    const [hotels, branches, buildings, floors, rooms] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(hotelsTable).where(eq(hotelsTable.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(branchesTable).where(eq(branchesTable.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(buildingsTable).where(eq(buildingsTable.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(floorsTable).where(eq(floorsTable.isActive, true)),
      db.select({ status: roomsTable.status, count: sql<number>`count(*)::int` }).from(roomsTable).where(eq(roomsTable.isActive, true)).groupBy(roomsTable.status),
    ]);
    const byStatus = Object.fromEntries(rooms.map(r => [r.status, r.count]));
    const totalRooms = rooms.reduce((s, r) => s + r.count, 0);
    return { totalHotels: hotels[0].count, totalBranches: branches[0].count, totalBuildings: buildings[0].count, totalFloors: floors[0].count, totalRooms, roomsAvailable: byStatus['available'] ?? 0, roomsOccupied: byStatus['occupied'] ?? 0, roomsUnderMaintenance: (byStatus['under_maintenance'] ?? 0) + (byStatus['maintenance'] ?? 0), roomsOutOfService: byStatus['out_of_service'] ?? 0 };
  }
  async findOne(id: string) {
    const [h] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, id));
    if (!h) throw new NotFoundException('Hotel not found');
    return fmt(h);
  }
  async create(b: any) {
    const [exist] = await db.select().from(hotelsTable).where(eq(hotelsTable.hotelCode, b.hotelCode));
    if (exist) throw new ConflictException('Hotel code already exists');
    const [h] = await db.insert(hotelsTable).values({ hotelName: b.hotelName, legalName: b.legalName, hotelCode: b.hotelCode, logo: b.logo, email: b.email, phone: b.phone, website: b.website, country: b.country ?? 'Ethiopia', region: b.region, city: b.city, subCity: b.subCity, address: b.address, postalCode: b.postalCode, latitude: b.latitude, longitude: b.longitude, description: b.description, timezone: b.timezone ?? 'Africa/Addis_Ababa', currencyCode: b.currencyCode ?? 'ETB', taxNumber: b.taxNumber, licenseNumber: b.licenseNumber, starRating: b.starRating, checkInTime: b.checkInTime ?? '14:00', checkOutTime: b.checkOutTime ?? '12:00', settings: b.settings ?? {}, createdBy: b.createdBy }).returning();
    return fmt(h);
  }
  async update(id: string, b: any) {
    const u: any = {};
    const fields = ['hotelName','legalName','logo','email','phone','website','country','region','city','subCity','address','postalCode','latitude','longitude','description','timezone','currencyCode','taxNumber','licenseNumber','starRating','checkInTime','checkOutTime','status','isActive','settings'];
    for (const k of fields) if (b[k] !== undefined) u[k] = b[k];
    u.updatedBy = b.updatedBy;
    const [h] = await db.update(hotelsTable).set(u).where(eq(hotelsTable.id, id)).returning();
    if (!h) throw new NotFoundException('Hotel not found');
    return fmt(h);
  }
  async remove(id: string) {
    await db.update(hotelsTable).set({ isActive: false, deletedAt: new Date() }).where(eq(hotelsTable.id, id));
    return { message: 'Hotel deleted' };
  }
}
