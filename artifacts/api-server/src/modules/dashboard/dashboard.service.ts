import { Injectable } from '@nestjs/common';
import { eq, and, sql, gte, getTableColumns } from 'drizzle-orm';
import {
  db, roomsTable, reservationsTable, paymentsTable, maintenanceRequestsTable,
  inventoryItemsTable, restaurantOrdersTable, auditLogsTable, usersTable,
  hotelsTable, branchesTable, buildingsTable, floorsTable,
} from '@workspace/db';

const auditCols = getTableColumns(auditLogsTable);

@Injectable()
export class DashboardService {
  async getStats() {
    const today = new Date().toISOString().slice(0, 10);
    const ms = new Date(); ms.setDate(1); const monthStart = ms.toISOString().slice(0, 10);
    const [
      roomStats, todayArr, todayDep, revToday, revMonth,
      pendMaint, lowStock, restToday, activeGuests,
      hotels, branches, buildings, floors,
    ] = await Promise.all([
      db.select({ status: roomsTable.status, count: sql<number>`count(*)::int` }).from(roomsTable).where(eq(roomsTable.isActive, true)).groupBy(roomsTable.status),
      db.select({ count: sql<number>`count(*)::int` }).from(reservationsTable).where(and(eq(reservationsTable.checkInDate, today), sql`${reservationsTable.status} in ('pending','confirmed')`)),
      db.select({ count: sql<number>`count(*)::int` }).from(reservationsTable).where(and(eq(reservationsTable.checkOutDate, today), sql`${reservationsTable.status} = 'checked_in'`)),
      db.select({ total: sql<number>`coalesce(sum(amount::numeric),0)::float` }).from(paymentsTable).where(sql`date(${paymentsTable.createdAt}) = ${today}`),
      db.select({ total: sql<number>`coalesce(sum(amount::numeric),0)::float` }).from(paymentsTable).where(sql`date(${paymentsTable.createdAt}) >= ${monthStart}`),
      db.select({ count: sql<number>`count(*)::int` }).from(maintenanceRequestsTable).where(sql`${maintenanceRequestsTable.status} in ('open','in_progress')`),
      db.select({ count: sql<number>`count(*)::int` }).from(inventoryItemsTable).where(sql`${inventoryItemsTable.currentStock}::numeric <= ${inventoryItemsTable.minStock}::numeric`),
      db.select({ count: sql<number>`count(*)::int` }).from(restaurantOrdersTable).where(sql`date(${restaurantOrdersTable.createdAt}) = ${today}`),
      db.select({ count: sql<number>`count(*)::int` }).from(reservationsTable).where(eq(reservationsTable.status, 'checked_in')),
      db.select({ count: sql<number>`count(*)::int` }).from(hotelsTable).where(eq(hotelsTable.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(branchesTable).where(eq(branchesTable.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(buildingsTable).where(eq(buildingsTable.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(floorsTable).where(eq(floorsTable.isActive, true)),
    ]);
    const byStatus = Object.fromEntries(roomStats.map(r => [r.status, r.count]));
    const totalRooms = roomStats.reduce((s, r) => s + r.count, 0);
    const occupiedRooms = byStatus['occupied'] ?? 0;
    return {
      // Hotel hierarchy
      totalHotels: hotels[0].count, totalBranches: branches[0].count,
      totalBuildings: buildings[0].count, totalFloors: floors[0].count,
      // Rooms
      totalRooms, availableRooms: byStatus['available'] ?? 0, occupiedRooms,
      reservedRooms: byStatus['reserved'] ?? 0,
      maintenanceRooms: (byStatus['maintenance'] ?? 0) + (byStatus['under_maintenance'] ?? 0),
      cleaningRooms: (byStatus['cleaning'] ?? 0) + (byStatus['dirty'] ?? 0),
      blockedRooms: byStatus['blocked'] ?? 0, readyRooms: byStatus['ready'] ?? 0,
      outOfServiceRooms: byStatus['out_of_service'] ?? 0,
      occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      // Operations
      todayArrivals: todayArr[0].count, todayDepartures: todayDep[0].count,
      revenueToday: revToday[0].total, revenueMonth: revMonth[0].total,
      activeGuests: activeGuests[0].count, pendingMaintenance: pendMaint[0].count,
      lowStockAlerts: lowStock[0].count, restaurantOrdersToday: restToday[0].count,
    };
  }

  async getOccupancy(period = 'month') {
    const days = period === 'week' ? 7 : period === 'year' ? 365 : 30;
    const from = new Date(); from.setDate(from.getDate() - days); const fromStr = from.toISOString().slice(0, 10);
    const [{ totalRooms }] = await db.select({ totalRooms: sql<number>`count(*)::int` }).from(roomsTable).where(eq(roomsTable.isActive, true));
    const checkins = await db.select({ date: reservationsTable.checkInDate, count: sql<number>`count(*)::int` }).from(reservationsTable).where(and(gte(reservationsTable.checkInDate, fromStr), sql`${reservationsTable.status} in ('checked_in','checked_out')`)).groupBy(reservationsTable.checkInDate);
    const dataMap = new Map(checkins.map(r => [r.date, r.count]));
    const data = [];
    for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const date = d.toISOString().slice(0, 10); const occupied = dataMap.get(date) ?? 0; data.push({ date, rate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0, occupied, total: totalRooms }); }
    return { averageOccupancy: Math.round(data.reduce((s, d) => s + d.rate, 0) / data.length), data };
  }

  async getRevenue(period = 'month') {
    const days = period === 'week' ? 7 : period === 'year' ? 365 : 30;
    const from = new Date(); from.setDate(from.getDate() - days);
    const [payments, restaurants] = await Promise.all([
      db.select({ date: sql<string>`date(${paymentsTable.createdAt})::text`, total: sql<number>`sum(${paymentsTable.amount}::numeric)::float` }).from(paymentsTable).where(gte(paymentsTable.createdAt, from)).groupBy(sql`date(${paymentsTable.createdAt})`),
      db.select({ date: sql<string>`date(${restaurantOrdersTable.createdAt})::text`, total: sql<number>`sum(${restaurantOrdersTable.totalAmount}::numeric)::float` }).from(restaurantOrdersTable).where(gte(restaurantOrdersTable.createdAt, from)).groupBy(sql`date(${restaurantOrdersTable.createdAt})`),
    ]);
    const payMap = new Map(payments.map(r => [r.date, r.total]));
    const restMap = new Map(restaurants.map(r => [r.date, r.total]));
    const data = []; let totalRevenue = 0;
    for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const date = d.toISOString().slice(0, 10); const rooms = payMap.get(date) ?? 0; const restaurant = restMap.get(date) ?? 0; const revenue = rooms + restaurant; totalRevenue += revenue; data.push({ date, revenue, rooms, restaurant }); }
    return { totalRevenue, data };
  }

  async getActivity() {
    const logs = await db.select({
      ...auditCols,
      userName: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
    }).from(auditLogsTable).leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id)).orderBy(sql`${auditLogsTable.createdAt} desc`).limit(20);
    return logs.map(l => ({ id: l.id, type: l.resource, action: l.action, description: `${l.action} ${l.resource}${l.resourceId ? ` (${l.resourceId.slice(0, 8)})` : ''}`, userId: l.userId ?? null, userName: (l as any).userName ?? null, resourceId: l.resourceId ?? null, createdAt: l.createdAt.toISOString() }));
  }
}
