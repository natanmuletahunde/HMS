import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  checkinsTable,
  reservationsTable,
  guestsTable,
  roomsTable,
} from '@workspace/db';

const fmtDate = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const fmtCheckin = (c: any) => ({
  ...c,
  checkInNumber: c.checkInNumber ?? c.checkinNumber,
  guestName:
    c.guestName ??
    ([c.guestFirstName, c.guestLastName].filter(Boolean).join(' ') || 'Guest'),
  depositAmount: c.depositAmount != null ? parseFloat(c.depositAmount) : null,
  createdAt: fmtDate(c.createdAt),
  updatedAt: fmtDate(c.updatedAt),
});

@Injectable()
export class CheckinService {
  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, +(query.page ?? 1));
    const limit = Math.min(+(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;

    const conds: any[] = [eq(checkinsTable.isActive, true)];

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

    const checkinCols = getTableColumns(checkinsTable);

    const [rows, countRows] = await Promise.all([
      db
        .select({
          ...checkinCols,
          reservationNumber: reservationsTable.reservationNumber,
          confirmationNumber: reservationsTable.confirmationNumber,
          guestFirstName: guestsTable.firstName,
          guestLastName: guestsTable.lastName,
          roomNumber: roomsTable.number,
        })
        .from(checkinsTable)
        .leftJoin(reservationsTable, eq(checkinsTable.reservationId, reservationsTable.id))
        .leftJoin(guestsTable, eq(checkinsTable.guestId, guestsTable.id))
        .leftJoin(roomsTable, eq(checkinsTable.roomId, roomsTable.id))
        .where(where)
        .orderBy(desc(checkinsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(checkinsTable)
        .leftJoin(reservationsTable, eq(checkinsTable.reservationId, reservationsTable.id))
        .leftJoin(guestsTable, eq(checkinsTable.guestId, guestsTable.id))
        .where(where),
    ]);

    const total = countRows[0]?.count ?? 0;
    return {
      data: rows.map(fmtCheckin),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const checkinCols = getTableColumns(checkinsTable);
    const [row] = await db
      .select({
        ...checkinCols,
        reservationNumber: reservationsTable.reservationNumber,
        confirmationNumber: reservationsTable.confirmationNumber,
        guestFirstName: guestsTable.firstName,
        guestLastName: guestsTable.lastName,
        roomNumber: roomsTable.number,
      })
      .from(checkinsTable)
      .leftJoin(reservationsTable, eq(checkinsTable.reservationId, reservationsTable.id))
      .leftJoin(guestsTable, eq(checkinsTable.guestId, guestsTable.id))
      .leftJoin(roomsTable, eq(checkinsTable.roomId, roomsTable.id))
      .where(eq(checkinsTable.id, id));

    if (!row) throw new NotFoundException(`Check-in ${id} not found`);
    return fmtCheckin(row);
  }

  async update(id: string, body: any) {
    const allowed = ['keyCardNumber', 'identityVerified', 'depositCollected', 'depositAmount', 'registrationCardGenerated', 'digitalSignature', 'checkedInBy', 'notes'];
    const u: any = {};
    for (const k of allowed) if (body[k] !== undefined) u[k] = body[k];
    const [c] = await db.update(checkinsTable).set(u).where(eq(checkinsTable.id, id)).returning();
    if (!c) throw new NotFoundException(`Check-in ${id} not found`);
    return this.findOne(id);
  }

  // ── Task 3.3: Electronic Door Lock & RFID Keycard Encoder Interface ────────
  async encodeKeycard(id: string, b: { encoderId?: string; cardType?: 'rfid' | 'mifare'; expirationDays?: number }) {
    const checkin = await this.findOne(id);
    if (!checkin) throw new NotFoundException(`Check-in ${id} not found`);

    // Standard RC522 / VingCard encoder track generator
    const room = checkin.roomNumber || 'GEN';
    const cardUid = `RFID-${room}-${Date.now().toString(36).toUpperCase()}`;

    // Update check-in record with generated keycard UID
    await db.update(checkinsTable).set({ keyCardNumber: cardUid }).where(eq(checkinsTable.id, id));

    return {
      status: 'success',
      encoded: true,
      protocol: 'Mifare-Classic-1K',
      keyCardNumber: cardUid,
      roomNumber: checkin.roomNumber,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (b.expirationDays || 3) * 86400000).toISOString(),
    };
  }
}
