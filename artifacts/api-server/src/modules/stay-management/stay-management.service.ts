import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, getTableColumns, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  db,
  stayChangesTable,
  reservationsTable,
  roomsTable,
  guestsTable,
} from '@workspace/db';

const fmtDate = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const fmtStayChange = (s: any) => ({
  ...s,
  createdAt: fmtDate(s.createdAt),
  updatedAt: fmtDate(s.updatedAt),
});

const calcNights = (checkIn: string, checkOut: string) =>
  Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

@Injectable()
export class StayManagementService {
  async findAll(query: {
    reservationId?: string;
    guestId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, +(query.page ?? 1));
    const limit = Math.min(+(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;

    const conds: any[] = [eq(stayChangesTable.isActive, true)];
    if (query.reservationId) conds.push(eq(stayChangesTable.reservationId, query.reservationId));
    if (query.guestId) conds.push(eq(stayChangesTable.guestId, query.guestId));

    const where = and(...conds);
    const cols = getTableColumns(stayChangesTable);
    const fromRooms = alias(roomsTable, 'from_rooms');
    const toRooms = alias(roomsTable, 'to_rooms');

    const [rows, countRows] = await Promise.all([
      db
        .select({
          ...cols,
          reservationNumber: reservationsTable.reservationNumber,
          guestName: sql<string>`concat(${guestsTable.firstName}, ' ', ${guestsTable.lastName})`,
          fromRoomNumber: fromRooms.number,
          toRoomNumber: toRooms.number,
        })
        .from(stayChangesTable)
        .leftJoin(reservationsTable, eq(stayChangesTable.reservationId, reservationsTable.id))
        .leftJoin(guestsTable, eq(stayChangesTable.guestId, guestsTable.id))
        .leftJoin(fromRooms, eq(stayChangesTable.fromRoomId, fromRooms.id))
        .leftJoin(toRooms, eq(stayChangesTable.toRoomId, toRooms.id))
        .where(where)
        .orderBy(desc(stayChangesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(stayChangesTable).where(where),
    ]);

    const total = countRows[0]?.count ?? 0;
    return {
      data: rows.map(fmtStayChange),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const [row] = await db.select().from(stayChangesTable).where(eq(stayChangesTable.id, id));
    if (!row) throw new NotFoundException(`Stay change ${id} not found`);
    return fmtStayChange(row);
  }

  async create(body: {
    reservationId: string;
    guestId: string;
    actionType: string;
    fromRoomId?: string;
    toRoomId?: string;
    previousCheckOut?: string;
    newCheckOut?: string;
    reason?: string;
    performedBy?: string;
    notes?: string;
  }) {
    // Verify reservation exists
    const [reservation] = await db
      .select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, body.reservationId));
    if (!reservation) throw new NotFoundException(`Reservation ${body.reservationId} not found`);

    // Insert stay change record
    const [change] = await db
      .insert(stayChangesTable)
      .values({
        reservationId: body.reservationId,
        guestId: body.guestId,
        actionType: body.actionType,
        fromRoomId: body.fromRoomId ?? null,
        toRoomId: body.toRoomId ?? null,
        previousCheckOut: body.previousCheckOut ?? null,
        newCheckOut: body.newCheckOut ?? null,
        reason: body.reason,
        performedBy: body.performedBy,
        notes: body.notes,
      })
      .returning();

    // Handle room change actions (upgrade/downgrade/transfer)
    if (['upgrade', 'downgrade', 'transfer'].includes(body.actionType) && body.toRoomId) {
      await db
        .update(reservationsTable)
        .set({ roomId: body.toRoomId })
        .where(eq(reservationsTable.id, body.reservationId));

      if (body.fromRoomId) {
        await db
          .update(roomsTable)
          .set({ status: 'available' })
          .where(eq(roomsTable.id, body.fromRoomId));
      }

      await db
        .update(roomsTable)
        .set({ status: 'occupied' })
        .where(eq(roomsTable.id, body.toRoomId));
    }

    // Handle date change actions (extend/shorten)
    if (['extend', 'shorten'].includes(body.actionType) && body.newCheckOut) {
      const nights = calcNights(reservation.checkInDate, body.newCheckOut);
      await db
        .update(reservationsTable)
        .set({ checkOutDate: body.newCheckOut, nights })
        .where(eq(reservationsTable.id, body.reservationId));
    }

    return fmtStayChange(change);
  }
}
