import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, sql, gte, lte, ne, not, inArray, isNotNull, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  guestsTable,
  reservationsTable,
  checkinsTable,
  checkoutsTable,
  roomsTable,
  roomTypesTable,
  housekeepingAssignmentsTable,
  paymentsTable,
  invoicesTable,
  notificationsTable,
  preCheckoutInspectionsTable,
  usersTable,
} from '@workspace/db';
import { EventBusService } from '../event-bus/event-bus.service';

const fmtDate = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const fmtReservation = (r: any) => {
  const gName =
    r.guestName ||
    [r.guestFirstName, r.guestLastName]
      .filter(Boolean)
      .map((s: string) => String(s).trim())
      .filter(Boolean)
      .join(' ') ||
    (r.guestEmail ? String(r.guestEmail).split('@')[0] : null);

  return {
    ...r,
    guestName: gName,
    totalAmount: r.totalAmount != null ? parseFloat(r.totalAmount) : null,
    paidAmount: r.paidAmount != null ? parseFloat(r.paidAmount) : null,
    discountAmount: r.discountAmount != null ? parseFloat(r.discountAmount) : null,
    taxAmount: r.taxAmount != null ? parseFloat(r.taxAmount) : null,
    serviceCharge: r.serviceCharge != null ? parseFloat(r.serviceCharge) : null,
    depositRequired: r.depositRequired != null ? parseFloat(r.depositRequired) : null,
    depositPaid: r.depositPaid != null ? parseFloat(r.depositPaid) : null,
    actualCheckIn: fmtDate(r.actualCheckIn),
    actualCheckOut: fmtDate(r.actualCheckOut),
    cancelledAt: fmtDate(r.cancelledAt),
    createdAt: fmtDate(r.createdAt),
    updatedAt: fmtDate(r.updatedAt),
  };
};

const resCols = getTableColumns(reservationsTable);

const joinedSelect = {
  ...resCols,
  guestFirstName: guestsTable.firstName,
  guestLastName: guestsTable.lastName,
  guestPhone: guestsTable.phone,
  guestEmail: guestsTable.email,
  guestNationalId: guestsTable.nationalId,
  guestIdNumber: guestsTable.idNumber,
  guestCode: guestsTable.guestCode,
  guestVipStatus: guestsTable.vipStatus,
  roomNumber: roomsTable.number,
  roomTypeName: roomTypesTable.name,
};

const baseQuery = () =>
  db
    .select(joinedSelect)
    .from(reservationsTable)
    .leftJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
    .leftJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
    .leftJoin(roomTypesTable, eq(reservationsTable.roomTypeId, roomTypesTable.id));

const calcNights = (checkIn: string, checkOut: string) =>
  Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

@Injectable()
export class ReservationsService {
  constructor(private readonly eventBus: EventBusService) {}

  async findAll(query: {
    status?: string;
    reservationType?: string;
    checkIn?: string;
    checkOut?: string;
    guestId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, +(query.page ?? 1));
    const limit = Math.min(+(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;

    const conds: any[] = [];
    if (query.status) conds.push(sql`${reservationsTable.status} = ${query.status}`);
    if (query.reservationType) conds.push(sql`${reservationsTable.reservationType} = ${query.reservationType}`);
    if (query.checkIn) conds.push(gte(reservationsTable.checkInDate, query.checkIn));
    if (query.checkOut) conds.push(lte(reservationsTable.checkOutDate, query.checkOut));
    if (query.guestId) conds.push(eq(reservationsTable.guestId, query.guestId));
    if (query.search) {
      const s = `%${query.search}%`;
      conds.push(
        or(
          like(reservationsTable.reservationNumber, s),
          like(reservationsTable.confirmationNumber, s),
          like(guestsTable.firstName, s),
          like(guestsTable.lastName, s),
          like(guestsTable.phone, s),
          like(guestsTable.nationalId, s),
          like(guestsTable.idNumber, s),
        ),
      );
    }

    const where = conds.length > 0 ? and(...conds) : undefined;

    const [rows, countRows] = await Promise.all([
      baseQuery().where(where).orderBy(desc(reservationsTable.createdAt)).limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(reservationsTable)
        .leftJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
        .where(where),
    ]);

    const total = countRows[0]?.count ?? 0;
    return {
      data: rows.map(fmtReservation),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(body: {
    guestId: string;
    roomId?: string;
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
    adults?: number;
    children?: number;
    reservationType?: string;
    bookingSource?: string;
    ratePlan?: string;
    discountAmount?: number;
    taxAmount?: number;
    serviceCharge?: number;
    depositRequired?: number;
    specialRequests?: string;
    remarks?: string;
    notes?: string;
  }) {
    const nights = calcNights(body.checkInDate, body.checkOutDate);

    if (!body.roomTypeId && body.roomId) {
      const [rm] = await db
        .select({ roomTypeId: roomsTable.roomTypeId })
        .from(roomsTable)
        .where(eq(roomsTable.id, body.roomId));
      if (rm?.roomTypeId) {
        body.roomTypeId = rm.roomTypeId;
      }
    }

    let basePrice = 0;
    if (body.roomTypeId) {
      const [rt] = await db
        .select({ basePrice: roomTypesTable.basePrice })
        .from(roomTypesTable)
        .where(eq(roomTypesTable.id, body.roomTypeId));
      if (rt?.basePrice) basePrice = parseFloat(rt.basePrice as string);
    } else if (body.roomId) {
      const [rm] = await db
        .select({ currentPrice: roomsTable.currentPrice })
        .from(roomsTable)
        .where(eq(roomsTable.id, body.roomId));
      if (rm?.currentPrice) basePrice = parseFloat(rm.currentPrice as string);
    }

    const discount = body.discountAmount ?? 0;
    const tax = body.taxAmount ?? 0;
    const service = body.serviceCharge ?? 0;
    const totalAmount = ((basePrice * nights) - discount + tax + service).toFixed(2);

    const [res] = await db
      .insert(reservationsTable)
      .values({
        guestId: body.guestId,
        roomId: body.roomId ?? null,
        roomTypeId: body.roomTypeId,
        checkInDate: body.checkInDate,
        checkOutDate: body.checkOutDate,
        nights,
        adults: body.adults ?? 1,
        children: body.children ?? 0,
        reservationType: (body.reservationType as any) ?? 'individual',
        bookingSource: body.bookingSource,
        ratePlan: body.ratePlan,
        totalAmount,
        discountAmount: String(discount),
        taxAmount: String(tax),
        serviceCharge: String(service),
        depositRequired: body.depositRequired != null ? String(body.depositRequired) : '0',
        status: 'pending',
        specialRequests: body.specialRequests,
        remarks: body.remarks,
        notes: body.notes,
      })
      .returning();

    if (body.roomId) {
      await db.update(roomsTable).set({ status: 'reserved' }).where(eq(roomsTable.id, body.roomId));
    }

    const [row] = await baseQuery().where(eq(reservationsTable.id, res.id));
    const result = fmtReservation(row);
    this.eventBus.publish('reservation.created', result);

    if (body.reservationType === 'online' || body.bookingSource === 'online' || body.bookingSource === 'ota') {
      try {
        const staffUsers = await db.select({ id: usersTable.id }).from(usersTable);
        if (staffUsers.length > 0) {
          const guestName = result.guestName || 'Online Guest';
          await db.insert(notificationsTable).values(
            staffUsers.map((u) => ({
              userId: u.id,
              type: 'info',
              title: '🌐 New Online Reservation',
              message: `Online booking ${res.reservationNumber} received for ${guestName} (${res.checkInDate} to ${res.checkOutDate}).`,
              resourceType: 'reservation',
              resourceId: res.id,
            }))
          );
        }
      } catch {
        // Notification creation is non-blocking
      }
    }

    return result;
  }

  async findOne(id: string) {
    const [row] = await baseQuery().where(eq(reservationsTable.id, id));
    if (!row) throw new NotFoundException(`Reservation ${id} not found`);
    return fmtReservation(row);
  }

  async update(id: string, body: any) {
    const [existing] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
    if (!existing) throw new NotFoundException(`Reservation ${id} not found`);

    const allowed = [
      'roomId', 'roomTypeId', 'checkInDate', 'checkOutDate', 'adults', 'children',
      'reservationType', 'bookingSource', 'ratePlan', 'totalAmount', 'paidAmount',
      'discountAmount', 'taxAmount', 'serviceCharge', 'depositRequired', 'depositPaid',
      'status', 'specialRequests', 'remarks', 'notes',
    ];
    const u: any = {};
    for (const k of allowed) if (body[k] !== undefined) u[k] = body[k];

    // Recalculate nights and total if dates changed
    const newCheckIn = body.checkInDate ?? existing.checkInDate;
    const newCheckOut = body.checkOutDate ?? existing.checkOutDate;
    if (body.checkInDate || body.checkOutDate) {
      u.nights = calcNights(newCheckIn, newCheckOut);
    }

    await db.update(reservationsTable).set(u).where(eq(reservationsTable.id, id));
    const [row] = await baseQuery().where(eq(reservationsTable.id, id));
    if (!row) throw new NotFoundException(`Reservation ${id} not found`);
    const result = fmtReservation(row);
    this.eventBus.publish('reservation.updated', result);
    return result;
  }

  async cancel(id: string, reason?: string) {
    const [res] = await db
      .update(reservationsTable)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason ?? null,
      })
      .where(eq(reservationsTable.id, id))
      .returning();
    if (!res) throw new NotFoundException(`Reservation ${id} not found`);
    if (res.roomId) {
      await db.update(roomsTable).set({ status: 'available' }).where(eq(roomsTable.id, res.roomId));
    }
    const [row] = await baseQuery().where(eq(reservationsTable.id, id));
    const result = fmtReservation(row);
    this.eventBus.publish('reservation.cancelled', result);
    return result;
  }

  async confirm(id: string) {
    const [res] = await db
      .update(reservationsTable)
      .set({ status: 'confirmed' })
      .where(eq(reservationsTable.id, id))
      .returning();
    if (!res) throw new NotFoundException(`Reservation ${id} not found`);
    if (res.roomId) {
      await db.update(roomsTable).set({ status: 'reserved' }).where(eq(roomsTable.id, res.roomId));
    }
    const [row] = await baseQuery().where(eq(reservationsTable.id, id));
    return fmtReservation(row);
  }

  async checkIn(
    id: string,
    body: {
      roomId?: string;
      keyCardNumber?: string;
      depositCollected?: boolean;
      depositAmount?: number;
      identityVerified?: boolean;
      registrationCardGenerated?: boolean;
      digitalSignature?: string;
      checkedInBy?: string;
      notes?: string;
    },
  ) {
    const [existing] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
    if (!existing) throw new NotFoundException(`Reservation ${id} not found`);
    if (!['confirmed', 'pending', 'guaranteed'].includes(existing.status)) {
      throw new BadRequestException(`Cannot check-in reservation with status: ${existing.status}`);
    }

    let assignedRoomId = body.roomId || existing.roomId;
    if (!assignedRoomId) {
      const [avail] = await db
        .select({ id: roomsTable.id })
        .from(roomsTable)
        .where(
          and(
            eq(roomsTable.status, 'available'),
            eq(roomsTable.isActive, true),
            existing.roomTypeId ? eq(roomsTable.roomTypeId, existing.roomTypeId) : sql`true`,
          ),
        )
        .limit(1);

      if (avail) {
        assignedRoomId = avail.id;
      } else {
        const [anyAvail] = await db
          .select({ id: roomsTable.id })
          .from(roomsTable)
          .where(and(eq(roomsTable.status, 'available'), eq(roomsTable.isActive, true)))
          .limit(1);
        if (anyAvail) assignedRoomId = anyAvail.id;
      }
    }

    if (!assignedRoomId) {
      throw new BadRequestException('No available rooms in the hotel to complete check-in. Please ensure a room is cleaned and available.');
    }

    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, assignedRoomId));
    if (!room) {
      throw new BadRequestException('Selected room does not exist');
    }
    if (room.status !== 'available' && room.id !== existing.roomId) {
      throw new BadRequestException(`Room ${room.number} is currently ${room.status}. Please choose an available room.`);
    }

    const [res] = await db
      .update(reservationsTable)
      .set({
        roomId: assignedRoomId,
        status: 'checked_in',
        actualCheckIn: new Date(),
      })
      .where(eq(reservationsTable.id, id))
      .returning();

    await db.update(roomsTable).set({ status: 'occupied' }).where(eq(roomsTable.id, assignedRoomId));

    await db.insert(checkinsTable).values({
      reservationId: id,
      guestId: existing.guestId,
      roomId: assignedRoomId,
      keyCardNumber: body.keyCardNumber,
      depositCollected: body.depositCollected ?? false,
      depositAmount: body.depositAmount != null ? String(body.depositAmount) : '0',
      identityVerified: body.identityVerified ?? false,
      registrationCardGenerated: body.registrationCardGenerated ?? false,
      digitalSignature: body.digitalSignature,
      checkedInBy: body.checkedInBy,
      notes: body.notes,
    });

    await db
      .update(guestsTable)
      .set({ totalStays: sql`${guestsTable.totalStays} + 1` })
      .where(eq(guestsTable.id, existing.guestId));

    const [row] = await baseQuery().where(eq(reservationsTable.id, id));
    return fmtReservation(row);
  }

  async checkOut(
    id: string,
    body: {
      lateCheckoutFee?: number;
      totalCharges?: number;
      depositRefunded?: boolean;
      feedbackRating?: number;
      feedbackNotes?: string;
      checkedOutBy?: string;
      notes?: string;
      overrideInspection?: boolean;
      paymentMethod?: string;
      amountPaidAtCheckout?: number;
      transactionReference?: string;
    },
  ) {
    const [existing] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
    if (!existing) throw new NotFoundException(`Reservation ${id} not found`);
    if (existing.status !== 'checked_in') {
      throw new BadRequestException(`Cannot check-out reservation with status: ${existing.status}`);
    }

    // Verify Housekeeping Pre-Checkout clearance
    if (!body.overrideInspection) {
      const [inspection] = await db
        .select()
        .from(preCheckoutInspectionsTable)
        .where(
          and(
            eq(preCheckoutInspectionsTable.reservationId, id),
            eq(preCheckoutInspectionsTable.isActive, true),
          ),
        )
        .orderBy(desc(preCheckoutInspectionsTable.createdAt))
        .limit(1);

      if (!inspection) {
        throw new BadRequestException(
          'Pre-checkout housekeeping inspection is required before checking out. Please request an inspection from Housekeeping first.',
        );
      }

      if (inspection.status !== 'cleared') {
        throw new BadRequestException(
          `Room inspection has not been cleared (Current status: "${inspection.status}"). Housekeeping must inspect the room amenities, minibar, and equipment before guest checkout.`,
        );
      }
    }

    const currentPaid = Number(existing.paidAmount || 0);
    const checkoutPayment = Number(body.amountPaidAtCheckout || 0);
    const updatedPaidTotal = checkoutPayment > 0 ? currentPaid + checkoutPayment : currentPaid;

    await db
      .update(reservationsTable)
      .set({
        status: 'checked_out',
        actualCheckOut: new Date(),
        paidAmount: String(updatedPaidTotal.toFixed(2)),
      })
      .where(eq(reservationsTable.id, id));

    if (existing.roomId) {
      await db.update(roomsTable).set({ status: 'cleaning' }).where(eq(roomsTable.id, existing.roomId));
      const taskNumber = 'HK-' + Date.now().toString(36).toUpperCase();
      await db.insert(housekeepingAssignmentsTable).values({
        taskNumber,
        roomId: existing.roomId,
        areaType: 'guest_room',
        cleaningType: 'checkout',
        priority: 'high',
        status: 'pending',
        scheduledDate: new Date().toISOString().slice(0, 10),
        notes: `Turnover cleaning after checkout for reservation ${existing.reservationNumber}`,
      });
    }

    const checkoutNote = body.notes || (body.paymentMethod
      ? `Settled $${checkoutPayment.toFixed(2)} via ${body.paymentMethod}${body.transactionReference ? ` (Ref: ${body.transactionReference})` : ''}`
      : undefined);

    await db.insert(checkoutsTable).values({
      reservationId: id,
      guestId: existing.guestId,
      roomId: existing.roomId!,
      lateCheckoutFee: body.lateCheckoutFee != null ? String(body.lateCheckoutFee) : '0',
      totalCharges: body.totalCharges != null ? String(body.totalCharges) : '0',
      depositRefunded: body.depositRefunded ?? false,
      feedbackRating: body.feedbackRating,
      feedbackNotes: body.feedbackNotes,
      checkedOutBy: body.checkedOutBy,
      notes: checkoutNote,
    });

    // Auto-record payment transaction if an active invoice exists for this reservation
    try {
      const [inv] = await db
        .select()
        .from(invoicesTable)
        .where(eq(invoicesTable.reservationId, id));
      if (inv) {
        const payAmount = checkoutPayment > 0 ? checkoutPayment : Number(inv.totalAmount || body.totalCharges || 0);
        if (payAmount > 0) {
          const ref = body.transactionReference || ('PAY-CHK-' + Math.floor(100000 + Math.random() * 900000));
          await db.insert(paymentsTable).values({
            invoiceId: inv.id,
            amount: String(payAmount.toFixed(2)),
            method: (body.paymentMethod as any) || 'card',
            reference: ref,
            notes: `Folio settled at checkout (${existing.reservationNumber}) via ${body.paymentMethod || 'card'}`,
          });
          const newInvoicePaid = Number(inv.paidAmount || 0) + payAmount;
          await db
            .update(invoicesTable)
            .set({
              paidAmount: String(newInvoicePaid.toFixed(2)),
              status: newInvoicePaid >= Number(inv.totalAmount || 0) ? 'paid' : 'issued',
            })
            .where(eq(invoicesTable.id, inv.id));
        }
      }
    } catch {
      // Continue checkout gracefully even if payment insert encounters an edge case
    }

    const [row] = await baseQuery().where(eq(reservationsTable.id, id));
    return fmtReservation(row);
  }

  async todayArrivals() {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await baseQuery().where(
      and(
        eq(reservationsTable.checkInDate, today),
        inArray(reservationsTable.status, ['pending', 'confirmed', 'guaranteed']),
      ),
    );
    return rows.map(fmtReservation);
  }

  async todayDepartures() {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await baseQuery().where(
      and(
        eq(reservationsTable.checkOutDate, today),
        eq(reservationsTable.status, 'checked_in'),
      ),
    );
    return rows.map(fmtReservation);
  }

  async inHouseGuests() {
    const rows = await baseQuery().where(eq(reservationsTable.status, 'checked_in'));
    return rows.map(fmtReservation);
  }

  async noShows() {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await baseQuery().where(
      and(
        lte(reservationsTable.checkInDate, today),
        inArray(reservationsTable.status, ['pending', 'confirmed', 'guaranteed']),
      ),
    );
    return rows.map(fmtReservation);
  }

  async getCalendar(startDate: string, endDate: string) {
    const rows = await baseQuery().where(
      and(
        lte(reservationsTable.checkInDate, endDate),
        gte(reservationsTable.checkOutDate, startDate),
      ),
    );
    return rows.map(fmtReservation);
  }

  async checkAvailability(checkIn: string, checkOut: string, roomTypeId?: string) {
    const unavailableRoomIds = db
      .select({ id: reservationsTable.roomId })
      .from(reservationsTable)
      .where(
        and(
          isNotNull(reservationsTable.roomId),
          not(inArray(reservationsTable.status, ['cancelled', 'checked_out', 'no_show'])),
          lte(reservationsTable.checkInDate, checkOut),
          gte(reservationsTable.checkOutDate, checkIn),
        ),
      );

    const conds: any[] = [
      eq(roomsTable.status, 'available'),
      eq(roomsTable.isActive, true),
      not(inArray(roomsTable.id, sql`(${unavailableRoomIds})`)),
    ];

    if (roomTypeId) conds.push(eq(roomsTable.roomTypeId, roomTypeId));

    const rows = await db
      .select({
        ...getTableColumns(roomsTable),
        roomTypeName: roomTypesTable.name,
        basePrice: roomTypesTable.basePrice,
        maximumAdults: roomTypesTable.maximumAdults,
        maximumChildren: roomTypesTable.maximumChildren,
      })
      .from(roomsTable)
      .leftJoin(roomTypesTable, eq(roomsTable.roomTypeId, roomTypesTable.id))
      .where(and(...conds))
      .orderBy(roomsTable.number);

    return rows.map((r) => {
      const bPrice = r.basePrice != null ? parseFloat(r.basePrice as string) : 100;
      const cPrice = r.currentPrice != null ? parseFloat(r.currentPrice as string) : bPrice;
      return {
        ...r,
        currentPrice: cPrice,
        basePrice: bPrice,
        maxAdults: r.capacityAdults ?? r.maximumAdults ?? 2,
        maxChildren: r.capacityChildren ?? r.maximumChildren ?? 1,
      };
    });
  }
}
