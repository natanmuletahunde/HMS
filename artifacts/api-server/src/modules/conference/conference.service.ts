import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc, not, inArray } from 'drizzle-orm';
import {
  db,
  conferenceHallsTable,
  conferenceEquipmentTable,
  conferenceBookingsTable,
  conferenceBookingServicesTable,
} from '@workspace/db';

const parseBooking = (b: any) => ({
  ...b,
  hallRate: b.hallRate != null ? parseFloat(b.hallRate) : 0,
  equipmentCharges: b.equipmentCharges != null ? parseFloat(b.equipmentCharges) : 0,
  cateringCharges: b.cateringCharges != null ? parseFloat(b.cateringCharges) : 0,
  otherCharges: b.otherCharges != null ? parseFloat(b.otherCharges) : 0,
  discountAmount: b.discountAmount != null ? parseFloat(b.discountAmount) : 0,
  taxAmount: b.taxAmount != null ? parseFloat(b.taxAmount) : 0,
  totalAmount: b.totalAmount != null ? parseFloat(b.totalAmount) : 0,
  depositAmount: b.depositAmount != null ? parseFloat(b.depositAmount) : 0,
});

@Injectable()
export class ConferenceService {
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);

    const [hallStats, bookingStats, todayBookings, revenueRows, upcomingRows] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          available: sql<number>`count(*) filter (where status = 'available')::int`,
          occupied: sql<number>`count(*) filter (where status = 'booked')::int`,
        })
        .from(conferenceHallsTable)
        .where(eq(conferenceHallsTable.isActive, true)),
      db
        .select({
          total: sql<number>`count(*)::int`,
          confirmed: sql<number>`count(*) filter (where status = 'confirmed')::int`,
        })
        .from(conferenceBookingsTable)
        .where(eq(conferenceBookingsTable.isActive, true)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(conferenceBookingsTable)
        .where(and(eq(conferenceBookingsTable.bookingDate, today), eq(conferenceBookingsTable.isActive, true))),
      db
        .select({ total: sql<string>`coalesce(sum(total_amount), 0)` })
        .from(conferenceBookingsTable)
        .where(and(not(eq(conferenceBookingsTable.status, 'cancelled')), eq(conferenceBookingsTable.isActive, true))),
      db
        .select({
          ...getTableColumns(conferenceBookingsTable),
          hallName: conferenceHallsTable.name,
        })
        .from(conferenceBookingsTable)
        .leftJoin(conferenceHallsTable, eq(conferenceBookingsTable.hallId, conferenceHallsTable.id))
        .where(and(sql`${conferenceBookingsTable.bookingDate} >= ${today}`, eq(conferenceBookingsTable.isActive, true)))
        .orderBy(conferenceBookingsTable.bookingDate, conferenceBookingsTable.startTime)
        .limit(5),
    ]);

    return {
      totalHalls: hallStats[0]?.total ?? 0,
      availableHalls: hallStats[0]?.available ?? 0,
      occupiedHalls: hallStats[0]?.occupied ?? 0,
      totalBookings: bookingStats[0]?.total ?? 0,
      confirmedBookings: bookingStats[0]?.confirmed ?? 0,
      todayBookings: todayBookings[0]?.count ?? 0,
      totalRevenue: parseFloat(revenueRows[0]?.total ?? '0'),
      upcomingBookings: upcomingRows.map(parseBooking),
    };
  }

  async getHalls(q: any) {
    const conds: any[] = [eq(conferenceHallsTable.isActive, true)];
    if (q.status) conds.push(eq(conferenceHallsTable.status, q.status));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(conferenceHallsTable.name, s), like(conferenceHallsTable.location, s)));
    }

    const rows = await db
      .select({
        ...getTableColumns(conferenceHallsTable),
        equipmentCount: sql<number>`(select count(*) from conference_equipment where hall_id = conference_halls.id and is_active = true)::int`,
      })
      .from(conferenceHallsTable)
      .where(and(...conds))
      .orderBy(conferenceHallsTable.name);

    return rows.map((r) => ({
      ...r,
      hourlyRate: r.hourlyRate != null ? parseFloat(r.hourlyRate as string) : null,
      halfDayRate: r.halfDayRate != null ? parseFloat(r.halfDayRate as string) : null,
      fullDayRate: r.fullDayRate != null ? parseFloat(r.fullDayRate as string) : null,
    }));
  }

  async createHall(b: any) {
    const [hall] = await db
      .insert(conferenceHallsTable)
      .values({
        name: b.name,
        location: b.location ?? null,
        floor: b.floor ?? null,
        capacity: b.capacity,
        hourlyRate: b.hourlyRate != null ? String(b.hourlyRate) : null,
        halfDayRate: b.halfDayRate != null ? String(b.halfDayRate) : null,
        fullDayRate: b.fullDayRate != null ? String(b.fullDayRate) : null,
        description: b.description ?? null,
        amenities: b.amenities != null ? (typeof b.amenities === 'string' ? b.amenities : JSON.stringify(b.amenities)) : null,
        status: 'available',
      })
      .returning();
    return hall;
  }

  async updateHall(id: string, b: any) {
    const u: any = {};
    for (const k of ['name', 'location', 'floor', 'capacity', 'status', 'description', 'amenities']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    for (const k of ['hourlyRate', 'halfDayRate', 'fullDayRate']) {
      if (b[k] !== undefined) u[k] = String(b[k]);
    }
    const [hall] = await db.update(conferenceHallsTable).set(u).where(eq(conferenceHallsTable.id, id)).returning();
    if (!hall) throw new NotFoundException(`Conference hall ${id} not found`);
    return hall;
  }

  async getEquipment(hallId?: string) {
    const conds: any[] = [eq(conferenceEquipmentTable.isActive, true)];
    if (hallId) conds.push(eq(conferenceEquipmentTable.hallId, hallId));
    return db.select().from(conferenceEquipmentTable).where(and(...conds));
  }

  async createEquipment(b: any) {
    const [eq_] = await db
      .insert(conferenceEquipmentTable)
      .values({
        hallId: b.hallId ?? null,
        name: b.name,
        quantity: b.quantity ?? 1,
        extraCharge: b.extraCharge != null ? String(b.extraCharge) : '0',
        notes: b.notes ?? null,
      })
      .returning();
    return eq_;
  }

  async getBookings(q: any) {
    const conds: any[] = [eq(conferenceBookingsTable.isActive, true)];
    if (q.status) conds.push(eq(conferenceBookingsTable.status, q.status));
    if (q.hallId) conds.push(eq(conferenceBookingsTable.hallId, q.hallId));
    if (q.date) conds.push(eq(conferenceBookingsTable.bookingDate, q.date));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(conferenceBookingsTable.customerName, s), like(conferenceBookingsTable.eventName, s), like(conferenceBookingsTable.bookingNumber, s)));
    }

    const rows = await db
      .select({
        ...getTableColumns(conferenceBookingsTable),
        hallName: conferenceHallsTable.name,
      })
      .from(conferenceBookingsTable)
      .leftJoin(conferenceHallsTable, eq(conferenceBookingsTable.hallId, conferenceHallsTable.id))
      .where(and(...conds))
      .orderBy(desc(conferenceBookingsTable.bookingDate));

    return rows.map(parseBooking);
  }

  async createBooking(b: any) {
    const bookingNumber = 'CB-' + Date.now().toString(36).toUpperCase();

    // Validate no double-booking
    const existing = await db
      .select({ id: conferenceBookingsTable.id })
      .from(conferenceBookingsTable)
      .where(
        and(
          eq(conferenceBookingsTable.hallId, b.hallId),
          eq(conferenceBookingsTable.bookingDate, b.bookingDate),
          not(eq(conferenceBookingsTable.status, 'cancelled')),
          eq(conferenceBookingsTable.isActive, true),
          sql`(
            (${conferenceBookingsTable.startTime} < ${b.endTime} AND ${conferenceBookingsTable.endTime} > ${b.startTime})
          )`,
        ),
      );

    if (existing.length > 0) {
      throw new BadRequestException('Hall is already booked for this date/time');
    }

    const services = b.services ?? [];
    let equipmentCharges = 0;
    let cateringCharges = 0;
    for (const s of services) {
      const total = parseFloat(String(s.unitPrice ?? 0)) * (s.quantity ?? 1);
      if (s.serviceType === 'catering') cateringCharges += total;
      else equipmentCharges += total;
    }

    const hallRate = parseFloat(String(b.hallRate ?? 0));
    const discountAmount = parseFloat(String(b.discountAmount ?? 0));
    const taxAmount = parseFloat(String(b.taxAmount ?? 0));
    const totalAmount = hallRate + equipmentCharges + cateringCharges - discountAmount + taxAmount;

    const [booking] = await db
      .insert(conferenceBookingsTable)
      .values({
        bookingNumber,
        hallId: b.hallId,
        customerName: b.customerName,
        customerEmail: b.customerEmail ?? null,
        customerPhone: b.customerPhone ?? null,
        companyName: b.companyName ?? null,
        eventName: b.eventName,
        eventType: b.eventType ?? null,
        layout: b.layout ?? 'theater',
        attendees: b.attendees,
        bookingDate: b.bookingDate,
        startTime: b.startTime,
        endTime: b.endTime,
        setupTime: b.setupTime ?? null,
        teardownTime: b.teardownTime ?? null,
        status: 'inquiry',
        hallRate: String(hallRate),
        equipmentCharges: String(equipmentCharges),
        cateringCharges: String(cateringCharges),
        discountAmount: String(discountAmount),
        taxAmount: String(taxAmount),
        totalAmount: String(totalAmount),
        cateringRequired: b.cateringRequired ?? false,
        specialRequirements: b.specialRequirements ?? null,
        notes: b.notes ?? null,
      })
      .returning();

    for (const s of services) {
      const total = parseFloat(String(s.unitPrice ?? 0)) * (s.quantity ?? 1);
      await db.insert(conferenceBookingServicesTable).values({
        bookingId: booking.id,
        serviceType: s.serviceType,
        name: s.name,
        quantity: s.quantity ?? 1,
        unitPrice: String(s.unitPrice ?? 0),
        total: String(total),
        notes: s.notes ?? null,
      });
    }

    const bookingServices = await db
      .select()
      .from(conferenceBookingServicesTable)
      .where(eq(conferenceBookingServicesTable.bookingId, booking.id));

    return { ...parseBooking(booking), services: bookingServices };
  }

  async updateBooking(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'customerName', 'customerEmail', 'notes', 'paymentStatus', 'depositPaid', 'cancellationReason']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.status === 'cancelled') u.cancelledAt = new Date();

    const [booking] = await db.update(conferenceBookingsTable).set(u).where(eq(conferenceBookingsTable.id, id)).returning();
    if (!booking) throw new NotFoundException(`Conference booking ${id} not found`);
    return parseBooking(booking);
  }

  async getCalendar(month: string) {
    // month: YYYY-MM
    const startDate = `${month}-01`;
    const [year, mon] = month.split('-').map(Number);
    const endDate = new Date(year, mon, 0).toISOString().slice(0, 10); // last day

    const rows = await db
      .select({
        ...getTableColumns(conferenceBookingsTable),
        hallName: conferenceHallsTable.name,
      })
      .from(conferenceBookingsTable)
      .leftJoin(conferenceHallsTable, eq(conferenceBookingsTable.hallId, conferenceHallsTable.id))
      .where(
        and(
          sql`${conferenceBookingsTable.bookingDate} >= ${startDate}`,
          sql`${conferenceBookingsTable.bookingDate} <= ${endDate}`,
          eq(conferenceBookingsTable.isActive, true),
        ),
      )
      .orderBy(conferenceBookingsTable.bookingDate, conferenceBookingsTable.startTime);

    const grouped: Record<string, any[]> = {};
    for (const r of rows) {
      const date = r.bookingDate;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(parseBooking(r));
    }
    return grouped;
  }

  async findOne(id: string) {
    const [row] = await db
      .select({
        ...getTableColumns(conferenceBookingsTable),
        hallName: conferenceHallsTable.name,
      })
      .from(conferenceBookingsTable)
      .leftJoin(conferenceHallsTable, eq(conferenceBookingsTable.hallId, conferenceHallsTable.id))
      .where(eq(conferenceBookingsTable.id, id));
    if (!row) throw new NotFoundException(`Conference booking ${id} not found`);
    const services = await db
      .select()
      .from(conferenceBookingServicesTable)
      .where(eq(conferenceBookingServicesTable.bookingId, id));
    return { ...parseBooking(row), services };
  }
}
