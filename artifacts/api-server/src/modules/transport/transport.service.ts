import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  vehiclesTable,
  driversTable,
  tripsTable,
} from '@workspace/db';

const parseTrip = (t: any) => ({
  ...t,
  fare: t.fare != null ? parseFloat(t.fare) : 0,
  extraCharges: t.extraCharges != null ? parseFloat(t.extraCharges) : 0,
  totalAmount: t.totalAmount != null ? parseFloat(t.totalAmount) : 0,
  distance: t.distance != null ? parseFloat(t.distance) : null,
});

@Injectable()
export class TransportService {
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);

    const [vehicleStats, driverStats, tripStats, todayTrips, revenueRows] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          available: sql<number>`count(*) filter (where status = 'available')::int`,
        })
        .from(vehiclesTable)
        .where(eq(vehiclesTable.isActive, true)),
      db
        .select({
          total: sql<number>`count(*)::int`,
          available: sql<number>`count(*) filter (where status = 'available')::int`,
        })
        .from(driversTable)
        .where(eq(driversTable.isActive, true)),
      db
        .select({
          total: sql<number>`count(*)::int`,
          scheduled: sql<number>`count(*) filter (where status = 'scheduled')::int`,
        })
        .from(tripsTable)
        .where(eq(tripsTable.isActive, true)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(tripsTable)
        .where(and(sql`date(${tripsTable.scheduledTime}) = ${today}`, eq(tripsTable.isActive, true))),
      db
        .select({ total: sql<string>`coalesce(sum(total_amount), 0)` })
        .from(tripsTable)
        .where(and(eq(tripsTable.status, 'completed'), eq(tripsTable.isActive, true))),
    ]);

    return {
      totalVehicles: vehicleStats[0]?.total ?? 0,
      availableVehicles: vehicleStats[0]?.available ?? 0,
      totalDrivers: driverStats[0]?.total ?? 0,
      availableDrivers: driverStats[0]?.available ?? 0,
      totalTrips: tripStats[0]?.total ?? 0,
      scheduledTrips: tripStats[0]?.scheduled ?? 0,
      todayTrips: todayTrips[0]?.count ?? 0,
      totalRevenue: parseFloat(revenueRows[0]?.total ?? '0'),
    };
  }

  async getVehicles(q: any) {
    const conds: any[] = [eq(vehiclesTable.isActive, true)];
    if (q.status) conds.push(eq(vehiclesTable.status, q.status));
    if (q.vehicleType) conds.push(eq(vehiclesTable.vehicleType, q.vehicleType));

    const rows = await db
      .select({
        ...getTableColumns(vehiclesTable),
        driverFirstName: driversTable.firstName,
        driverLastName: driversTable.lastName,
      })
      .from(vehiclesTable)
      .leftJoin(driversTable, eq(vehiclesTable.currentDriverId, driversTable.id))
      .where(and(...conds))
      .orderBy(vehiclesTable.vehicleNumber);

    return rows.map((r) => ({
      ...r,
      driverName: r.driverFirstName ? `${r.driverFirstName} ${r.driverLastName}` : null,
    }));
  }

  async createVehicle(b: any) {
    const [v] = await db
      .insert(vehiclesTable)
      .values({
        vehicleNumber: b.vehicleNumber,
        vehicleType: b.vehicleType,
        make: b.make ?? null,
        model: b.model ?? null,
        year: b.year ?? null,
        color: b.color ?? null,
        capacity: b.capacity ?? 4,
        fuelType: b.fuelType ?? 'petrol',
        plateNumber: b.plateNumber ?? null,
        status: 'available',
      })
      .returning();
    return v;
  }

  async updateVehicle(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'currentDriverId', 'notes', 'serviceDate', 'insuranceExpiry', 'plateNumber', 'color']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    const [v] = await db.update(vehiclesTable).set(u).where(eq(vehiclesTable.id, id)).returning();
    if (!v) throw new NotFoundException(`Vehicle ${id} not found`);
    return v;
  }

  async getDrivers(q: any) {
    const conds: any[] = [eq(driversTable.isActive, true)];
    if (q.status) conds.push(eq(driversTable.status, q.status));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(driversTable.firstName, s), like(driversTable.lastName, s), like(driversTable.phone, s)));
    }

    const rows = await db
      .select()
      .from(driversTable)
      .where(and(...conds))
      .orderBy(driversTable.firstName);

    return rows.map((r) => ({
      ...r,
      rating: r.rating != null ? parseFloat(r.rating as string) : null,
    }));
  }

  async createDriver(b: any) {
    const driverCode = 'DRV-' + Date.now().toString(36).toUpperCase();
    const [d] = await db
      .insert(driversTable)
      .values({
        driverCode,
        firstName: b.firstName,
        lastName: b.lastName,
        phone: b.phone,
        licenseNumber: b.licenseNumber ?? null,
        licenseType: b.licenseType ?? null,
        licenseExpiry: b.licenseExpiry ?? null,
        availability: b.availability ?? 'full_time',
        status: 'available',
      })
      .returning();
    return { ...d, rating: d.rating != null ? parseFloat(d.rating as string) : null };
  }

  async updateDriver(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'notes', 'phone', 'availability']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.rating !== undefined) u.rating = String(b.rating);
    const [d] = await db.update(driversTable).set(u).where(eq(driversTable.id, id)).returning();
    if (!d) throw new NotFoundException(`Driver ${id} not found`);
    return { ...d, rating: d.rating != null ? parseFloat(d.rating as string) : null };
  }

  async getTrips(q: any) {
    const conds: any[] = [eq(tripsTable.isActive, true)];
    if (q.status) conds.push(eq(tripsTable.status, q.status));
    if (q.tripType) conds.push(eq(tripsTable.tripType, q.tripType));
    if (q.driverId) conds.push(eq(tripsTable.driverId, q.driverId));
    if (q.vehicleId) conds.push(eq(tripsTable.vehicleId, q.vehicleId));
    if (q.date) conds.push(sql`date(${tripsTable.scheduledTime}) = ${q.date}`);

    const rows = await db
      .select({
        ...getTableColumns(tripsTable),
        vehicleNumber: vehiclesTable.vehicleNumber,
        driverFirstName: driversTable.firstName,
        driverLastName: driversTable.lastName,
      })
      .from(tripsTable)
      .leftJoin(vehiclesTable, eq(tripsTable.vehicleId, vehiclesTable.id))
      .leftJoin(driversTable, eq(tripsTable.driverId, driversTable.id))
      .where(and(...conds))
      .orderBy(desc(tripsTable.scheduledTime));

    return rows.map((r) => ({
      ...parseTrip(r),
      vehicleNumber: r.vehicleNumber ?? null,
      driverName: r.driverFirstName ? `${r.driverFirstName} ${r.driverLastName}` : null,
    }));
  }

  async createTrip(b: any) {
    const tripNumber = 'TRP-' + Date.now().toString(36).toUpperCase();

    if (b.vehicleId) {
      const [v] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, b.vehicleId));
      if (!v) throw new NotFoundException(`Vehicle ${b.vehicleId} not found`);
      if (v.status !== 'available') throw new BadRequestException(`Vehicle is not available (status: ${v.status})`);
      await db.update(vehiclesTable).set({ status: 'assigned' }).where(eq(vehiclesTable.id, b.vehicleId));
    }

    if (b.driverId) {
      await db.update(driversTable).set({ status: 'assigned' }).where(eq(driversTable.id, b.driverId));
    }

    const fare = parseFloat(String(b.fare ?? 0));
    const extraCharges = parseFloat(String(b.extraCharges ?? 0));
    const totalAmount = fare + extraCharges;
    const status = b.vehicleId ? 'assigned' : 'scheduled';

    const [trip] = await db
      .insert(tripsTable)
      .values({
        tripNumber,
        tripType: b.tripType,
        vehicleId: b.vehicleId ?? null,
        driverId: b.driverId ?? null,
        reservationId: b.reservationId ?? null,
        roomServiceId: b.roomServiceId ?? null,
        guestName: b.guestName ?? null,
        guestPhone: b.guestPhone ?? null,
        passengerCount: b.passengerCount ?? 1,
        pickupLocation: b.pickupLocation,
        dropoffLocation: b.dropoffLocation,
        flightNumber: b.flightNumber ?? null,
        scheduledTime: new Date(b.scheduledTime),
        fare: String(fare),
        extraCharges: String(extraCharges),
        totalAmount: String(totalAmount),
        chargeToRoom: b.chargeToRoom ?? false,
        notes: b.notes ?? null,
        status: status as any,
      })
      .returning();

    // Return with joins
    const [row] = await db
      .select({
        ...getTableColumns(tripsTable),
        vehicleNumber: vehiclesTable.vehicleNumber,
        driverFirstName: driversTable.firstName,
        driverLastName: driversTable.lastName,
      })
      .from(tripsTable)
      .leftJoin(vehiclesTable, eq(tripsTable.vehicleId, vehiclesTable.id))
      .leftJoin(driversTable, eq(tripsTable.driverId, driversTable.id))
      .where(eq(tripsTable.id, trip.id));

    return {
      ...parseTrip(row),
      vehicleNumber: row.vehicleNumber ?? null,
      driverName: row.driverFirstName ? `${row.driverFirstName} ${row.driverLastName}` : null,
    };
  }

  async findOne(id: string) {
    const [row] = await db
      .select({
        ...getTableColumns(tripsTable),
        vehicleNumber: vehiclesTable.vehicleNumber,
        driverFirstName: driversTable.firstName,
        driverLastName: driversTable.lastName,
      })
      .from(tripsTable)
      .leftJoin(vehiclesTable, eq(tripsTable.vehicleId, vehiclesTable.id))
      .leftJoin(driversTable, eq(tripsTable.driverId, driversTable.id))
      .where(eq(tripsTable.id, id));
    if (!row) throw new NotFoundException(`Trip ${id} not found`);
    return {
      ...parseTrip(row),
      vehicleNumber: row.vehicleNumber ?? null,
      driverName: row.driverFirstName ? `${row.driverFirstName} ${row.driverLastName}` : null,
    };
  }

  async updateTrip(id: string, b: any) {
    const [existing] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!existing) throw new NotFoundException(`Trip ${id} not found`);

    const u: any = {};
    for (const k of ['driverId', 'vehicleId', 'driverNotes', 'notes', 'paymentStatus', 'paymentMethod', 'status']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.fare !== undefined) u.fare = String(b.fare);
    if (b.completedAt !== undefined) u.completedAt = new Date(b.completedAt);

    if (b.status === 'completed') {
      u.completedAt = new Date();
      if (existing.vehicleId) {
        await db.update(vehiclesTable).set({ status: 'available' }).where(eq(vehiclesTable.id, existing.vehicleId));
      }
      if (existing.driverId) {
        await db
          .update(driversTable)
          .set({ status: 'available', totalTrips: sql`total_trips + 1` })
          .where(eq(driversTable.id, existing.driverId));
      }
    }

    if (b.status === 'cancelled') {
      u.cancelledAt = new Date();
      if (existing.vehicleId) {
        await db.update(vehiclesTable).set({ status: 'available' }).where(eq(vehiclesTable.id, existing.vehicleId));
      }
      if (existing.driverId) {
        await db.update(driversTable).set({ status: 'available' }).where(eq(driversTable.id, existing.driverId));
      }
    }

    const [updated] = await db.update(tripsTable).set(u).where(eq(tripsTable.id, id)).returning();

    const [row] = await db
      .select({
        ...getTableColumns(tripsTable),
        vehicleNumber: vehiclesTable.vehicleNumber,
        driverFirstName: driversTable.firstName,
        driverLastName: driversTable.lastName,
      })
      .from(tripsTable)
      .leftJoin(vehiclesTable, eq(tripsTable.vehicleId, vehiclesTable.id))
      .leftJoin(driversTable, eq(tripsTable.driverId, driversTable.id))
      .where(eq(tripsTable.id, id));

    return {
      ...parseTrip(row),
      vehicleNumber: row.vehicleNumber ?? null,
      driverName: row.driverFirstName ? `${row.driverFirstName} ${row.driverLastName}` : null,
    };
  }
}
