import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, like, getTableColumns } from 'drizzle-orm';
import {
  db, roomsTable, roomTypesTable, roomCategoriesTable, bedTypesTable,
  buildingsTable, floorsTable, branchesTable, roomAmenityAssignmentsTable, roomAmenitiesTable,
  roomImagesTable, roomPricingTable,
} from '@workspace/db';
import { EventBusService } from '../event-bus/event-bus.service';

const roomCols = getTableColumns(roomsTable);
const joinedFields = () => ({
  ...roomCols,
  roomTypeName: roomTypesTable.name,
  roomTypeBasePrice: roomTypesTable.basePrice,
  roomCategoryName: roomCategoriesTable.name,
  bedTypeName: bedTypesTable.name,
  buildingName: buildingsTable.buildingName,
  branchId: buildingsTable.branchId,
  branchName: branchesTable.branchName,
  floorName: floorsTable.floorName,
  floorNumber: floorsTable.floorNumber,
});
const base = () => db.select(joinedFields())
  .from(roomsTable)
  .leftJoin(roomTypesTable, eq(roomsTable.roomTypeId, roomTypesTable.id))
  .leftJoin(roomCategoriesTable, eq(roomsTable.roomCategoryId, roomCategoriesTable.id))
  .leftJoin(bedTypesTable, eq(roomsTable.bedTypeId, bedTypesTable.id))
  .leftJoin(buildingsTable, eq(roomsTable.buildingId, buildingsTable.id))
  .leftJoin(branchesTable, eq(buildingsTable.branchId, branchesTable.id))
  .leftJoin(floorsTable, eq(roomsTable.floorId, floorsTable.id));

const fmt = (r: any) => ({
  ...r,
  roomTypeName: r.roomTypeName ?? null,
  roomTypeBasePrice: r.roomTypeBasePrice ? parseFloat(r.roomTypeBasePrice) : null,
  roomCategoryName: r.roomCategoryName ?? null,
  bedTypeName: r.bedTypeName ?? null,
  buildingName: r.buildingName ?? null,
  branchId: r.branchId ?? null,
  branchName: r.branchName ?? null,
  floorName: r.floorName ?? null,
  floorNumber: r.floorNumber ?? null,
  size: r.size ? parseFloat(r.size) : null,
  currentPrice: r.currentPrice ? parseFloat(r.currentPrice) : null,
  notes: r.notes ?? null,
  description: r.description ?? null,
  roomName: r.roomName ?? null,
  roomCode: r.roomCode ?? null,
  view: r.view ?? null,
  deletedAt: r.deletedAt?.toISOString() ?? null,
  createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
});

@Injectable()
export class RoomsService {
  constructor(private readonly eventBus: EventBusService) {}

  async findAll(q: any) {
    const { status, floor, roomTypeId, roomCategoryId, bedTypeId, buildingId, branchId, floorId, search, page = 1, limit = 50 } = q;
    const l = Math.min(+limit, 200); const offset = (+page - 1) * l;
    const conds: any[] = [eq(roomsTable.isActive, true)];
    if (status) conds.push(eq(roomsTable.status, status));
    if (floor) conds.push(eq(roomsTable.floor, floor));
    if (roomTypeId) conds.push(eq(roomsTable.roomTypeId, roomTypeId));
    if (roomCategoryId) conds.push(eq(roomsTable.roomCategoryId, roomCategoryId));
    if (bedTypeId) conds.push(eq(roomsTable.bedTypeId, bedTypeId));
    if (buildingId) conds.push(eq(roomsTable.buildingId, buildingId));
    if (branchId) conds.push(eq(buildingsTable.branchId, branchId));
    if (floorId) conds.push(eq(roomsTable.floorId, floorId));
    if (search) conds.push(sql`(${roomsTable.number} ilike ${'%' + search + '%'} or ${roomsTable.roomName} ilike ${'%' + search + '%'})`);
    const where = and(...conds);
    const [rows, [{ count }]] = await Promise.all([
      base().where(where).limit(l).offset(offset).orderBy(roomsTable.number),
      db.select({ count: sql<number>`count(*)::int` })
        .from(roomsTable)
        .leftJoin(buildingsTable, eq(roomsTable.buildingId, buildingsTable.id))
        .where(where),
    ]);
    return { data: rows.map(fmt), meta: { total: count, page: +page, limit: l, totalPages: Math.ceil(count / l) } };
  }

  async exportRooms(q: any) {
    const { status, buildingId } = q;
    const conds: any[] = [eq(roomsTable.isActive, true)];
    if (status) conds.push(eq(roomsTable.status, status));
    if (buildingId) conds.push(eq(roomsTable.buildingId, buildingId));
    const rows = await base().where(and(...conds)).orderBy(roomsTable.number);
    return { data: rows.map(fmt), total: rows.length };
  }

  async findAvailable(roomTypeId?: string) {
    const conds: any[] = [eq(roomsTable.status, 'available'), eq(roomsTable.isActive, true)];
    if (roomTypeId) conds.push(eq(roomsTable.roomTypeId, roomTypeId));
    return (await base().where(and(...conds))).map(fmt);
  }

  async create(b: any) {
    const [room] = await db.insert(roomsTable).values({
      number: b.number, floor: String(b.floor ?? '1'), notes: b.notes,
      roomName: b.roomName, roomCode: b.roomCode,
      roomTypeId: b.roomTypeId, roomCategoryId: b.roomCategoryId,
      bedTypeId: b.bedTypeId, buildingId: b.buildingId, floorId: b.floorId,
      capacityAdults: b.capacityAdults ?? 2, capacityChildren: b.capacityChildren ?? 1,
      size: b.size ? String(b.size) : undefined, view: b.view,
      smokingAllowed: b.smokingAllowed ?? false, description: b.description,
      currentPrice: b.currentPrice ? String(b.currentPrice) : undefined,
      createdBy: b.createdBy,
    }).returning();
    const [row] = await base().where(eq(roomsTable.id, room.id));
    const result = fmt(row);
    this.eventBus.publish('room.created', result);
    return result;
  }

  async findOne(id: string) {
    const [room] = await base().where(eq(roomsTable.id, id));
    if (!room) throw new NotFoundException('Room not found');
    return fmt(room);
  }

  async getDetail(id: string) {
    const room = await this.findOne(id);
    const [amenities, images, pricing] = await Promise.all([
      this.getRoomAmenities(id),
      this.getRoomImages(id),
      this.getRoomPricing(id),
    ]);
    return { ...room, amenities, images, pricing };
  }

  async getRoomAmenities(roomId: string) {
    const amenityCols = getTableColumns(roomAmenitiesTable);
    return db.select({ ...amenityCols, assignmentId: roomAmenityAssignmentsTable.id })
      .from(roomAmenityAssignmentsTable)
      .leftJoin(roomAmenitiesTable, eq(roomAmenityAssignmentsTable.amenityId, roomAmenitiesTable.id))
      .where(eq(roomAmenityAssignmentsTable.roomId, roomId));
  }

  async getRoomImages(roomId: string) {
    return db.select().from(roomImagesTable).where(eq(roomImagesTable.roomId, roomId)).orderBy(roomImagesTable.sortOrder);
  }

  async getRoomPricing(roomId: string) {
    const rows = await db.select().from(roomPricingTable).where(and(eq(roomPricingTable.roomId, roomId), eq(roomPricingTable.isActive, true))).orderBy(roomPricingTable.pricingType);
    return rows.map(r => ({ ...r, price: parseFloat(r.price), discountPercent: parseFloat(r.discountPercent ?? '0'), taxPercent: parseFloat(r.taxPercent ?? '0') }));
  }

  async update(id: string, b: any) {
    const u: any = {};
    const fields = ['number','floor','roomName','roomCode','roomTypeId','roomCategoryId','bedTypeId','buildingId','floorId','capacityAdults','capacityChildren','view','smokingAllowed','description','notes','status','isActive'];
    for (const k of fields) if (b[k] !== undefined) u[k] = b[k];
    if (b.size !== undefined) u.size = b.size ? String(b.size) : null;
    if (b.currentPrice !== undefined) u.currentPrice = b.currentPrice ? String(b.currentPrice) : null;
    if (b.floor !== undefined) u.floor = String(b.floor);
    u.updatedBy = b.updatedBy;
    await db.update(roomsTable).set(u).where(eq(roomsTable.id, id));
    const [room] = await base().where(eq(roomsTable.id, id));
    if (!room) throw new NotFoundException('Room not found');
    const result = fmt(room);
    this.eventBus.publish('room.updated', result);
    return result;
  }

  async changeStatus(id: string, status: string) {
    await db.update(roomsTable).set({ status: status as any }).where(eq(roomsTable.id, id));
    const [room] = await base().where(eq(roomsTable.id, id));
    if (!room) throw new NotFoundException('Room not found');
    const result = fmt(room);
    this.eventBus.publish('room.status_changed', result);
    return result;
  }

  async assignAmenities(roomId: string, amenityIds: string[]) {
    // Remove existing, re-assign
    await db.delete(roomAmenityAssignmentsTable).where(eq(roomAmenityAssignmentsTable.roomId, roomId));
    if (amenityIds?.length) {
      await db.insert(roomAmenityAssignmentsTable).values(amenityIds.map(amenityId => ({ roomId, amenityId })));
    }
    return this.getRoomAmenities(roomId);
  }

  async removeAmenity(roomId: string, amenityId: string) {
    await db.delete(roomAmenityAssignmentsTable).where(
      and(eq(roomAmenityAssignmentsTable.roomId, roomId), eq(roomAmenityAssignmentsTable.amenityId, amenityId))
    );
    return { message: 'Amenity removed' };
  }

  async addImage(roomId: string, b: any) {
    const [img] = await db.insert(roomImagesTable).values({ roomId, url: b.url, altText: b.altText, isPrimary: b.isPrimary ?? false, sortOrder: b.sortOrder ?? 0, createdBy: b.createdBy }).returning();
    if (b.isPrimary) {
      await db.update(roomImagesTable).set({ isPrimary: false }).where(and(eq(roomImagesTable.roomId, roomId), sql`${roomImagesTable.id} != ${img.id}`));
    }
    return img;
  }

  async removeImage(imageId: string) {
    await db.delete(roomImagesTable).where(eq(roomImagesTable.id, imageId));
    return { message: 'Image removed' };
  }

  async bulkImport(rooms: any[]) {
    const results = { created: 0, failed: 0, errors: [] as string[] };
    for (const r of rooms) {
      try {
        await this.create(r);
        results.created++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Room ${r.number}: ${e.message}`);
      }
    }
    return results;
  }

  async remove(id: string) {
    await db.update(roomsTable).set({ isActive: false, deletedAt: new Date() }).where(eq(roomsTable.id, id));
    return { message: 'Room deleted' };
  }
}
