import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  guestsTable,
  reservationsTable,
  checkinsTable,
  checkoutsTable,
  stayChangesTable,
  roomsTable,
  roomTypesTable,
} from '@workspace/db';

const fmtDate = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const fmtGuest = (g: any) => ({
  ...g,
  totalAmount: g.totalAmount != null ? parseFloat(g.totalAmount) : undefined,
  depositAmount: g.depositAmount != null ? parseFloat(g.depositAmount) : undefined,
  createdAt: fmtDate(g.createdAt),
  updatedAt: fmtDate(g.updatedAt),
});

@Injectable()
export class GuestsService {
  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    guestType?: string;
    vipStatus?: string;
  }) {
    const page = Math.max(1, +(query.page ?? 1));
    const limit = Math.min(+(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;

    const conds: any[] = [eq(guestsTable.isActive, true)];

    if (query.search) {
      const s = `%${query.search}%`;
      conds.push(
        or(
          like(guestsTable.firstName, s),
          like(guestsTable.lastName, s),
          like(guestsTable.email, s),
          like(guestsTable.phone, s),
          like(guestsTable.passportNumber, s),
          like(guestsTable.nationalId, s),
          like(guestsTable.guestCode, s),
        ),
      );
    }

    if (query.guestType) conds.push(eq(guestsTable.guestType, query.guestType));
    if (query.vipStatus !== undefined && query.vipStatus !== '') {
      conds.push(eq(guestsTable.vipStatus, query.vipStatus === 'true'));
    }

    const where = and(...conds);

    const [rows, [{ count }]] = await Promise.all([
      db
        .select()
        .from(guestsTable)
        .where(where)
        .orderBy(desc(guestsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(guestsTable).where(where),
    ]);

    return {
      data: rows.map(fmtGuest),
      meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getStats() {
    const rows = await db
      .select({
        guestType: guestsTable.guestType,
        vipStatus: guestsTable.vipStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(guestsTable)
      .where(eq(guestsTable.isActive, true))
      .groupBy(guestsTable.guestType, guestsTable.vipStatus);

    let total = 0;
    let vip = 0;
    let corporate = 0;
    let individual = 0;
    let travel_agency = 0;
    let government = 0;

    for (const r of rows) {
      total += r.count;
      if (r.vipStatus) vip += r.count;
      if (r.guestType === 'corporate') corporate += r.count;
      if (r.guestType === 'individual') individual += r.count;
      if (r.guestType === 'travel_agency') travel_agency += r.count;
      if (r.guestType === 'government') government += r.count;
    }

    return { total, vip, corporate, individual, travel_agency, government };
  }

  async create(body: any) {
    const guestCode = 'GST-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const [g] = await db
      .insert(guestsTable)
      .values({
        guestCode,
        firstName: body.firstName,
        middleName: body.middleName,
        lastName: body.lastName,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth,
        nationality: body.nationality,
        idType: body.idType,
        idNumber: body.idNumber,
        passportNumber: body.passportNumber,
        nationalId: body.nationalId,
        visaNumber: body.visaNumber,
        phone: body.phone,
        alternativePhone: body.alternativePhone,
        email: body.email,
        country: body.country,
        region: body.region,
        city: body.city,
        address: body.address,
        emergencyContactName: body.emergencyContactName,
        emergencyContactPhone: body.emergencyContactPhone,
        vipStatus: body.vipStatus ?? false,
        guestType: body.guestType ?? 'individual',
        smokingPreference: body.smokingPreference,
        bedPreference: body.bedPreference,
        floorPreference: body.floorPreference,
        foodPreference: body.foodPreference,
        specialRequests: body.specialRequests,
        profilePhoto: body.profilePhoto,
        remarks: body.remarks,
        notes: body.notes,
      })
      .returning();
    return fmtGuest(g);
  }

  async findOne(id: string) {
    const [g] = await db.select().from(guestsTable).where(eq(guestsTable.id, id));
    if (!g) throw new NotFoundException(`Guest ${id} not found`);
    return fmtGuest(g);
  }

  async update(id: string, body: any) {
    const allowed = [
      'firstName', 'middleName', 'lastName', 'gender', 'dateOfBirth',
      'nationality', 'idType', 'idNumber', 'passportNumber', 'nationalId',
      'visaNumber', 'phone', 'alternativePhone', 'email', 'country', 'region',
      'city', 'address', 'emergencyContactName', 'emergencyContactPhone',
      'vipStatus', 'guestType', 'smokingPreference', 'bedPreference',
      'floorPreference', 'foodPreference', 'specialRequests', 'profilePhoto',
      'remarks', 'notes', 'isActive',
    ];
    const u: any = {};
    for (const k of allowed) if (body[k] !== undefined) u[k] = body[k];
    const [g] = await db.update(guestsTable).set(u).where(eq(guestsTable.id, id)).returning();
    if (!g) throw new NotFoundException(`Guest ${id} not found`);
    return fmtGuest(g);
  }

  async remove(id: string) {
    const [g] = await db
      .update(guestsTable)
      .set({ isActive: false })
      .where(eq(guestsTable.id, id))
      .returning();
    if (!g) throw new NotFoundException(`Guest ${id} not found`);
    return { message: 'Guest deleted successfully' };
  }

  async getHistory(guestId: string) {
    // Verify guest exists
    const [guest] = await db.select({ id: guestsTable.id }).from(guestsTable).where(eq(guestsTable.id, guestId));
    if (!guest) throw new NotFoundException(`Guest ${guestId} not found`);

    const resCols = getTableColumns(reservationsTable);
    const checkinCols = getTableColumns(checkinsTable);
    const checkoutCols = getTableColumns(checkoutsTable);
    const stayChangeCols = getTableColumns(stayChangesTable);

    const [reservations, checkins, checkouts, stayChanges] = await Promise.all([
      db
        .select({
          ...resCols,
          roomNumber: roomsTable.number,
          roomTypeName: roomTypesTable.name,
        })
        .from(reservationsTable)
        .leftJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
        .leftJoin(roomTypesTable, eq(reservationsTable.roomTypeId, roomTypesTable.id))
        .where(eq(reservationsTable.guestId, guestId))
        .orderBy(desc(reservationsTable.createdAt)),

      db
        .select({
          ...checkinCols,
          roomNumber: roomsTable.number,
        })
        .from(checkinsTable)
        .leftJoin(roomsTable, eq(checkinsTable.roomId, roomsTable.id))
        .where(eq(checkinsTable.guestId, guestId))
        .orderBy(desc(checkinsTable.createdAt)),

      db
        .select({
          ...checkoutCols,
          roomNumber: roomsTable.number,
        })
        .from(checkoutsTable)
        .leftJoin(roomsTable, eq(checkoutsTable.roomId, roomsTable.id))
        .where(eq(checkoutsTable.guestId, guestId))
        .orderBy(desc(checkoutsTable.createdAt)),

      db
        .select(stayChangeCols)
        .from(stayChangesTable)
        .where(eq(stayChangesTable.guestId, guestId))
        .orderBy(desc(stayChangesTable.createdAt)),
    ]);

    return {
      reservations: reservations.map((r) => ({
        ...r,
        roomNumber: r.roomNumber ?? null,
        roomTypeName: r.roomTypeName ?? null,
        totalAmount: parseFloat(r.totalAmount as string),
        paidAmount: parseFloat(r.paidAmount as string),
        discountAmount: parseFloat(r.discountAmount as string),
        taxAmount: parseFloat(r.taxAmount as string),
        serviceCharge: parseFloat(r.serviceCharge as string),
        depositRequired: parseFloat(r.depositRequired as string),
        depositPaid: parseFloat(r.depositPaid as string),
        actualCheckIn: fmtDate(r.actualCheckIn),
        actualCheckOut: fmtDate(r.actualCheckOut),
        cancelledAt: fmtDate(r.cancelledAt),
        createdAt: fmtDate(r.createdAt),
        updatedAt: fmtDate(r.updatedAt),
      })),
      checkins: checkins.map((c) => ({
        ...c,
        roomNumber: (c as any).roomNumber ?? null,
        depositAmount: parseFloat(c.depositAmount as string),
        createdAt: fmtDate(c.createdAt),
        updatedAt: fmtDate(c.updatedAt),
      })),
      checkouts: checkouts.map((c) => ({
        ...c,
        roomNumber: (c as any).roomNumber ?? null,
        lateCheckoutFee: parseFloat(c.lateCheckoutFee as string),
        totalCharges: parseFloat(c.totalCharges as string),
        createdAt: fmtDate(c.createdAt),
        updatedAt: fmtDate(c.updatedAt),
      })),
      stayChanges: stayChanges.map((s) => ({
        ...s,
        createdAt: fmtDate(s.createdAt),
        updatedAt: fmtDate(s.updatedAt),
      })),
    };
  }
}
