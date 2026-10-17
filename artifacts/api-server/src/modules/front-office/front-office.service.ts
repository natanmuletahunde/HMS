import { Injectable } from '@nestjs/common';
import { eq, and, sql, inArray } from 'drizzle-orm';
import {
  db,
  reservationsTable,
  roomsTable,
  guestsTable,
} from '@workspace/db';

@Injectable()
export class FrontOfficeService {
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);

    const [
      reservationStats,
      roomStats,
      todayArrivalsCount,
      todayDeparturesCount,
      inHouseCount,
      noShowCount,
      guestStats,
      recentReservations,
    ] = await Promise.all([
      // Reservations by status
      db
        .select({
          status: reservationsTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(reservationsTable)
        .where(eq(reservationsTable.isActive, true))
        .groupBy(reservationsTable.status),

      // Rooms by status
      db
        .select({
          status: roomsTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(roomsTable)
        .where(eq(roomsTable.isActive, true))
        .groupBy(roomsTable.status),

      // Today arrivals count
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(reservationsTable)
        .where(
          and(
            eq(reservationsTable.checkInDate, today),
            inArray(reservationsTable.status, ['pending', 'confirmed', 'guaranteed']),
          ),
        ),

      // Today departures count
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(reservationsTable)
        .where(
          and(
            eq(reservationsTable.checkOutDate, today),
            eq(reservationsTable.status, 'checked_in'),
          ),
        ),

      // In-house count
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(reservationsTable)
        .where(eq(reservationsTable.status, 'checked_in')),

      // No shows count (past pending/confirmed)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(reservationsTable)
        .where(
          and(
            sql`${reservationsTable.checkInDate} < ${today}`,
            inArray(reservationsTable.status, ['pending', 'confirmed', 'guaranteed']),
          ),
        ),

      // Guest stats
      db
        .select({
          total: sql<number>`count(*)::int`,
          vip: sql<number>`count(*) filter (where ${guestsTable.vipStatus} = true)::int`,
        })
        .from(guestsTable)
        .where(eq(guestsTable.isActive, true)),

      // Recent reservations (last 5)
      db
        .select({
          id: reservationsTable.id,
          reservationNumber: reservationsTable.reservationNumber,
          status: reservationsTable.status,
          checkInDate: reservationsTable.checkInDate,
          checkOutDate: reservationsTable.checkOutDate,
          totalAmount: reservationsTable.totalAmount,
          guestFirstName: guestsTable.firstName,
          guestLastName: guestsTable.lastName,
          roomNumber: roomsTable.number,
          createdAt: reservationsTable.createdAt,
        })
        .from(reservationsTable)
        .leftJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
        .leftJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
        .orderBy(sql`${reservationsTable.createdAt} desc`)
        .limit(5),
    ]);

    // Build reservation status map
    const reservationByStatus: Record<string, number> = {};
    let totalReservations = 0;
    for (const r of reservationStats) {
      reservationByStatus[r.status] = r.count;
      totalReservations += r.count;
    }

    // Build room status map
    const roomByStatus: Record<string, number> = {};
    let totalRooms = 0;
    for (const r of roomStats) {
      roomByStatus[r.status] = r.count;
      totalRooms += r.count;
    }

    return {
      overview: {
        todayArrivals: todayArrivalsCount[0]?.count ?? 0,
        todayDepartures: todayDeparturesCount[0]?.count ?? 0,
        inHouseGuests: inHouseCount[0]?.count ?? 0,
        noShows: noShowCount[0]?.count ?? 0,
        totalGuests: guestStats[0]?.total ?? 0,
        vipGuests: guestStats[0]?.vip ?? 0,
      },
      reservations: {
        total: totalReservations,
        byStatus: {
          draft: reservationByStatus['draft'] ?? 0,
          pending: reservationByStatus['pending'] ?? 0,
          confirmed: reservationByStatus['confirmed'] ?? 0,
          guaranteed: reservationByStatus['guaranteed'] ?? 0,
          checkedIn: reservationByStatus['checked_in'] ?? 0,
          checkedOut: reservationByStatus['checked_out'] ?? 0,
          cancelled: reservationByStatus['cancelled'] ?? 0,
          noShow: reservationByStatus['no_show'] ?? 0,
          waitlisted: reservationByStatus['waitlisted'] ?? 0,
        },
      },
      rooms: {
        total: totalRooms,
        byStatus: {
          available: roomByStatus['available'] ?? 0,
          reserved: roomByStatus['reserved'] ?? 0,
          occupied: roomByStatus['occupied'] ?? 0,
          cleaning: roomByStatus['cleaning'] ?? 0,
          maintenance: roomByStatus['maintenance'] ?? 0,
          blocked: roomByStatus['blocked'] ?? 0,
        },
        occupancyRate: totalRooms > 0
          ? parseFloat(((roomByStatus['occupied'] ?? 0) / totalRooms * 100).toFixed(2))
          : 0,
      },
      recentReservations: recentReservations.map((r) => ({
        ...r,
        totalAmount: r.totalAmount != null ? parseFloat(r.totalAmount as string) : null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
    };
  }
}
