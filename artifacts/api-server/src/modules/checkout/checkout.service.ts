import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  checkoutsTable,
  reservationsTable,
  guestsTable,
  roomsTable,
} from '@workspace/db';

const fmtDate = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const fmtCheckout = (c: any) => ({
  ...c,
  lateCheckoutFee: c.lateCheckoutFee != null ? parseFloat(c.lateCheckoutFee) : null,
  totalCharges: c.totalCharges != null ? parseFloat(c.totalCharges) : null,
  createdAt: fmtDate(c.createdAt),
  updatedAt: fmtDate(c.updatedAt),
});

@Injectable()
export class CheckoutService {
  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, +(query.page ?? 1));
    const limit = Math.min(+(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;

    const conds: any[] = [eq(checkoutsTable.isActive, true)];

    if (query.search) {
      const s = `%${query.search}%`;
      conds.push(
        or(
          like(reservationsTable.reservationNumber, s),
          like(reservationsTable.confirmationNumber, s),
          like(guestsTable.firstName, s),
          like(guestsTable.lastName, s),
        ),
      );
    }

    const where = and(...conds);
    const checkoutCols = getTableColumns(checkoutsTable);

    const [rows, countRows] = await Promise.all([
      db
        .select({
          ...checkoutCols,
          reservationNumber: reservationsTable.reservationNumber,
          confirmationNumber: reservationsTable.confirmationNumber,
          guestFirstName: guestsTable.firstName,
          guestLastName: guestsTable.lastName,
          roomNumber: roomsTable.number,
        })
        .from(checkoutsTable)
        .leftJoin(reservationsTable, eq(checkoutsTable.reservationId, reservationsTable.id))
        .leftJoin(guestsTable, eq(checkoutsTable.guestId, guestsTable.id))
        .leftJoin(roomsTable, eq(checkoutsTable.roomId, roomsTable.id))
        .where(where)
        .orderBy(desc(checkoutsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(checkoutsTable)
        .leftJoin(reservationsTable, eq(checkoutsTable.reservationId, reservationsTable.id))
        .leftJoin(guestsTable, eq(checkoutsTable.guestId, guestsTable.id))
        .where(where),
    ]);

    const total = countRows[0]?.count ?? 0;
    return {
      data: rows.map(fmtCheckout),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const checkoutCols = getTableColumns(checkoutsTable);
    const [row] = await db
      .select({
        ...checkoutCols,
        reservationNumber: reservationsTable.reservationNumber,
        confirmationNumber: reservationsTable.confirmationNumber,
        guestFirstName: guestsTable.firstName,
        guestLastName: guestsTable.lastName,
        roomNumber: roomsTable.number,
      })
      .from(checkoutsTable)
      .leftJoin(reservationsTable, eq(checkoutsTable.reservationId, reservationsTable.id))
      .leftJoin(guestsTable, eq(checkoutsTable.guestId, guestsTable.id))
      .leftJoin(roomsTable, eq(checkoutsTable.roomId, roomsTable.id))
      .where(eq(checkoutsTable.id, id));

    if (!row) throw new NotFoundException(`Check-out ${id} not found`);
    return fmtCheckout(row);
  }
}
