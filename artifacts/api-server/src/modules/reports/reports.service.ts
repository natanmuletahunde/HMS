import { Injectable } from '@nestjs/common';
import { sql, and, gte, lte, eq, desc } from 'drizzle-orm';
import {
  db,
  roomsTable,
  reservationsTable,
  transactionsTable,
  housekeepingAssignmentsTable,
  maintenanceRequestsTable,
  posOrdersTable,
  inventoryItemsTable,
  stockMovementsTable,
  purchaseOrdersTable,
  suppliersTable,
  employeesTable,
  attendanceRecordsTable,
  leaveRequestsTable,
  complaintsTable,
  invoicesTable,
  cashRegistersTable,
  conferenceBookingsTable,
  tripsTable,
  guestsTable,
} from '@workspace/db';

@Injectable()
export class ReportsService {
  private dateFilter(table: any, col: any, q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [];
    if (q.startDate) conds.push(gte(col, new Date(q.startDate)));
    if (q.endDate) conds.push(lte(col, new Date(q.endDate)));
    return conds;
  }

  async getOccupancyReport(q: { startDate?: string; endDate?: string }) {
    const [roomStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(roomsTable)
      .where(eq(roomsTable.isActive, true));

    const resConds: any[] = [
      sql`status in ('confirmed','checked_in','checked_out')`,
    ];
    if (q.startDate) resConds.push(sql`check_in_date >= ${q.startDate}`);
    if (q.endDate) resConds.push(sql`check_out_date <= ${q.endDate}`);

    const [resStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(reservationsTable)
      .where(and(...resConds));

    const byRoomType = await db
      .select({
        roomTypeId: reservationsTable.roomTypeId,
        count: sql<number>`count(*)::int`,
      })
      .from(reservationsTable)
      .where(and(...resConds))
      .groupBy(reservationsTable.roomTypeId);

    const totalRooms = roomStats?.total ?? 0;
    const totalReservations = resStats?.total ?? 0;
    const occupancyRate = totalRooms > 0 ? parseFloat(((totalReservations / totalRooms) * 100).toFixed(2)) : 0;

    return { totalRooms, totalReservations, occupancyRate, byRoomType };
  }

  async getRevenueReport(q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [eq(transactionsTable.isActive, true)];
    if (q.startDate) conds.push(sql`transaction_date >= ${q.startDate}`);
    if (q.endDate) conds.push(sql`transaction_date <= ${q.endDate}`);

    const [totals] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(amount) filter (where transaction_type = 'revenue'), 0)`,
        totalExpenses: sql<string>`coalesce(sum(amount) filter (where transaction_type = 'expense'), 0)`,
      })
      .from(transactionsTable)
      .where(and(...conds));

    const byCategory = await db
      .select({
        category: transactionsTable.category,
        total: sql<string>`coalesce(sum(amount), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactionsTable)
      .where(and(...conds))
      .groupBy(transactionsTable.category)
      .orderBy(sql`sum(amount) desc`);

    const byPaymentMethod = await db
      .select({
        paymentMethod: transactionsTable.paymentMethod,
        total: sql<string>`coalesce(sum(amount), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactionsTable)
      .where(and(...conds))
      .groupBy(transactionsTable.paymentMethod)
      .orderBy(sql`sum(amount) desc`);

    const totalRevenue = parseFloat(totals?.totalRevenue ?? '0');
    const totalExpenses = parseFloat(totals?.totalExpenses ?? '0');
    const netIncome = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      byCategory: byCategory.map((r) => ({ ...r, total: parseFloat(r.total || '0') })),
      byPaymentMethod: byPaymentMethod.map((r) => ({ ...r, total: parseFloat(r.total || '0') })),
    };
  }

  async getReservationReport(q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [];
    if (q.startDate) conds.push(sql`check_in_date >= ${q.startDate}`);
    if (q.endDate) conds.push(sql`check_out_date <= ${q.endDate}`);

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        confirmed: sql<number>`count(*) filter (where status = 'confirmed')::int`,
        checkedIn: sql<number>`count(*) filter (where status = 'checked_in')::int`,
        checkedOut: sql<number>`count(*) filter (where status = 'checked_out')::int`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
        noShow: sql<number>`count(*) filter (where status = 'no_show')::int`,
      })
      .from(reservationsTable)
      .where(conds.length > 0 ? and(...conds) : undefined);

    const total = stats?.total ?? 0;
    const cancelled = stats?.cancelled ?? 0;
    const cancellationRate = total > 0 ? parseFloat(((cancelled / total) * 100).toFixed(2)) : 0;

    return {
      total,
      confirmed: stats?.confirmed ?? 0,
      checkedIn: stats?.checkedIn ?? 0,
      checkedOut: stats?.checkedOut ?? 0,
      cancelled,
      noShow: stats?.noShow ?? 0,
      cancellationRate,
    };
  }

  async getHousekeepingReport(q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [];
    if (q.startDate) conds.push(sql`scheduled_date >= ${q.startDate}`);
    if (q.endDate) conds.push(sql`scheduled_date <= ${q.endDate}`);

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where status = 'completed')::int`,
        pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      })
      .from(housekeepingAssignmentsTable)
      .where(conds.length > 0 ? and(...conds) : undefined);

    const byType = await db
      .select({
        areaType: housekeepingAssignmentsTable.areaType,
        count: sql<number>`count(*)::int`,
      })
      .from(housekeepingAssignmentsTable)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .groupBy(housekeepingAssignmentsTable.areaType);

    return {
      total: stats?.total ?? 0,
      completed: stats?.completed ?? 0,
      pending: stats?.pending ?? 0,
      byType,
    };
  }

  async getMaintenanceReport(q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [eq(maintenanceRequestsTable.isActive, true)];
    if (q.startDate) conds.push(gte(maintenanceRequestsTable.createdAt, new Date(q.startDate)));
    if (q.endDate) conds.push(lte(maintenanceRequestsTable.createdAt, new Date(q.endDate)));

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where status in ('pending','assigned','in_progress'))::int`,
        resolved: sql<number>`count(*) filter (where status = 'completed')::int`,
      })
      .from(maintenanceRequestsTable)
      .where(and(...conds));

    const byPriority = await db
      .select({
        priority: maintenanceRequestsTable.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(maintenanceRequestsTable)
      .where(and(...conds))
      .groupBy(maintenanceRequestsTable.priority);

    const byCategory = await db
      .select({
        categoryId: maintenanceRequestsTable.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(maintenanceRequestsTable)
      .where(and(...conds))
      .groupBy(maintenanceRequestsTable.categoryId);

    return {
      total: stats?.total ?? 0,
      open: stats?.open ?? 0,
      resolved: stats?.resolved ?? 0,
      byPriority,
      byCategory,
    };
  }

  async getRestaurantReport(q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [eq(posOrdersTable.isActive, true)];
    if (q.startDate) conds.push(gte(posOrdersTable.createdAt, new Date(q.startDate)));
    if (q.endDate) conds.push(lte(posOrdersTable.createdAt, new Date(q.endDate)));

    const [stats] = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        totalRevenue: sql<string>`coalesce(sum(total_amount), 0)`,
        avgOrderValue: sql<string>`coalesce(avg(total_amount), 0)`,
      })
      .from(posOrdersTable)
      .where(and(...conds));

    return {
      totalOrders: stats?.totalOrders ?? 0,
      totalRevenue: parseFloat(stats?.totalRevenue ?? '0'),
      avgOrderValue: parseFloat(stats?.avgOrderValue ?? '0'),
      topItems: [],
    };
  }

  async getInventoryReport(q: { startDate?: string; endDate?: string }) {
    const [stats] = await db
      .select({
        totalItems: sql<number>`count(*)::int`,
        lowStock: sql<number>`count(*) filter (where status = 'low_stock')::int`,
        outOfStock: sql<number>`count(*) filter (where status = 'out_of_stock')::int`,
        totalValue: sql<string>`coalesce(sum(current_stock::numeric * coalesce(unit_cost::numeric, 0)), 0)`,
      })
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.isActive, true));

    const byCategory = await db
      .select({
        category: inventoryItemsTable.category,
        count: sql<number>`count(*)::int`,
        totalValue: sql<string>`coalesce(sum(current_stock::numeric * coalesce(unit_cost::numeric, 0)), 0)`,
      })
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.isActive, true))
      .groupBy(inventoryItemsTable.category);

    return {
      totalItems: stats?.totalItems ?? 0,
      lowStock: stats?.lowStock ?? 0,
      outOfStock: stats?.outOfStock ?? 0,
      totalValue: parseFloat(stats?.totalValue ?? '0'),
      byCategory: byCategory.map((r) => ({ ...r, totalValue: parseFloat(r.totalValue || '0') })),
    };
  }

  async getProcurementReport(q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [];
    if (q.startDate) conds.push(gte(purchaseOrdersTable.createdAt, new Date(q.startDate)));
    if (q.endDate) conds.push(lte(purchaseOrdersTable.createdAt, new Date(q.endDate)));

    const [stats] = await db
      .select({
        totalPOs: sql<number>`count(*)::int`,
        totalSpend: sql<string>`coalesce(sum(total_amount), 0)`,
      })
      .from(purchaseOrdersTable)
      .where(conds.length > 0 ? and(...conds) : undefined);

    const byStatus = await db
      .select({
        status: purchaseOrdersTable.status,
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(total_amount), 0)`,
      })
      .from(purchaseOrdersTable)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .groupBy(purchaseOrdersTable.status);

    const bySupplier = await db
      .select({
        supplierId: purchaseOrdersTable.supplierId,
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(total_amount), 0)`,
      })
      .from(purchaseOrdersTable)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .groupBy(purchaseOrdersTable.supplierId)
      .orderBy(sql`sum(total_amount) desc`)
      .limit(10);

    return {
      totalPOs: stats?.totalPOs ?? 0,
      totalSpend: parseFloat(stats?.totalSpend ?? '0'),
      byStatus: byStatus.map((r) => ({ ...r, total: parseFloat(r.total || '0') })),
      bySupplier: bySupplier.map((r) => ({ ...r, total: parseFloat(r.total || '0') })),
    };
  }

  async getHrReport(q: { startDate?: string; endDate?: string }) {
    const [empStats] = await db
      .select({
        totalEmployees: sql<number>`count(*)::int`,
        activeEmployees: sql<number>`count(*) filter (where is_active = true)::int`,
      })
      .from(employeesTable);

    const byDepartment = await db
      .select({
        departmentId: employeesTable.departmentId,
        count: sql<number>`count(*)::int`,
      })
      .from(employeesTable)
      .where(eq(employeesTable.isActive, true))
      .groupBy(employeesTable.departmentId);

    const leaveConds: any[] = [];
    if (q.startDate) leaveConds.push(gte(leaveRequestsTable.createdAt, new Date(q.startDate)));
    if (q.endDate) leaveConds.push(lte(leaveRequestsTable.createdAt, new Date(q.endDate)));

    const [leaveStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where status = 'pending')::int`,
        approved: sql<number>`count(*) filter (where status = 'approved')::int`,
      })
      .from(leaveRequestsTable)
      .where(leaveConds.length > 0 ? and(...leaveConds) : undefined);

    return {
      totalEmployees: empStats?.totalEmployees ?? 0,
      activeEmployees: empStats?.activeEmployees ?? 0,
      byDepartment,
      leaveStats: {
        total: leaveStats?.total ?? 0,
        pending: leaveStats?.pending ?? 0,
        approved: leaveStats?.approved ?? 0,
      },
    };
  }

  async getComplaintReport(q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [eq(complaintsTable.isActive, true)];
    if (q.startDate) conds.push(gte(complaintsTable.createdAt, new Date(q.startDate)));
    if (q.endDate) conds.push(lte(complaintsTable.createdAt, new Date(q.endDate)));

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        resolved: sql<number>`count(*) filter (where status = 'resolved')::int`,
        satisfactionAvg: sql<string>`coalesce(avg(satisfaction_rating), 0)`,
      })
      .from(complaintsTable)
      .where(and(...conds));

    const byCategory = await db
      .select({
        category: complaintsTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(complaintsTable)
      .where(and(...conds))
      .groupBy(complaintsTable.category);

    const byPriority = await db
      .select({
        priority: complaintsTable.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(complaintsTable)
      .where(and(...conds))
      .groupBy(complaintsTable.priority);

    return {
      total: stats?.total ?? 0,
      resolved: stats?.resolved ?? 0,
      byCategory,
      byPriority,
      satisfactionAvg: parseFloat(stats?.satisfactionAvg ?? '0'),
    };
  }

  async getFinancialSummary(q: { startDate?: string; endDate?: string }) {
    const txnConds: any[] = [eq(transactionsTable.isActive, true)];
    if (q.startDate) txnConds.push(sql`transaction_date >= ${q.startDate}`);
    if (q.endDate) txnConds.push(sql`transaction_date <= ${q.endDate}`);

    const [txnStats] = await db
      .select({
        revenue: sql<string>`coalesce(sum(amount) filter (where transaction_type = 'revenue'), 0)`,
        expenses: sql<string>`coalesce(sum(amount) filter (where transaction_type = 'expense'), 0)`,
      })
      .from(transactionsTable)
      .where(and(...txnConds));

    const [invoiceStats] = await db
      .select({
        openInvoices: sql<number>`count(*) filter (where status in ('draft','issued'))::int`,
      })
      .from(invoicesTable);

    const [cashStats] = await db
      .select({
        cashOnHand: sql<string>`coalesce(sum(current_balance), 0)`,
      })
      .from(cashRegistersTable)
      .where(and(eq(cashRegistersTable.isActive, true), eq(cashRegistersTable.status, 'open')));

    const revenue = parseFloat(txnStats?.revenue ?? '0');
    const expenses = parseFloat(txnStats?.expenses ?? '0');

    return {
      revenue,
      expenses,
      netIncome: revenue - expenses,
      openInvoices: invoiceStats?.openInvoices ?? 0,
      cashOnHand: parseFloat(cashStats?.cashOnHand ?? '0'),
    };
  }

  async getConferenceReport(q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [eq(conferenceBookingsTable.isActive, true)];
    if (q.startDate) conds.push(sql`booking_date >= ${q.startDate}`);
    if (q.endDate) conds.push(sql`booking_date <= ${q.endDate}`);

    const [stats] = await db
      .select({
        totalBookings: sql<number>`count(*)::int`,
        confirmed: sql<number>`count(*) filter (where status = 'confirmed')::int`,
        revenue: sql<string>`coalesce(sum(total_amount) filter (where status != 'cancelled'), 0)`,
      })
      .from(conferenceBookingsTable)
      .where(and(...conds));

    const byEventType = await db
      .select({
        eventType: conferenceBookingsTable.eventType,
        count: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(total_amount), 0)`,
      })
      .from(conferenceBookingsTable)
      .where(and(...conds))
      .groupBy(conferenceBookingsTable.eventType);

    return {
      totalBookings: stats?.totalBookings ?? 0,
      confirmed: stats?.confirmed ?? 0,
      revenue: parseFloat(stats?.revenue ?? '0'),
      byEventType: byEventType.map((r) => ({ ...r, revenue: parseFloat(r.revenue || '0') })),
    };
  }

  async getTransportReport(q: { startDate?: string; endDate?: string }) {
    const conds: any[] = [eq(tripsTable.isActive, true)];
    if (q.startDate) conds.push(gte(tripsTable.createdAt, new Date(q.startDate)));
    if (q.endDate) conds.push(lte(tripsTable.createdAt, new Date(q.endDate)));

    const [stats] = await db
      .select({
        totalTrips: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where status = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
        revenue: sql<string>`coalesce(sum(fare), 0)`,
      })
      .from(tripsTable)
      .where(and(...conds));

    const byTripType = await db
      .select({
        tripType: tripsTable.tripType,
        count: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(fare), 0)`,
      })
      .from(tripsTable)
      .where(and(...conds))
      .groupBy(tripsTable.tripType);

    return {
      totalTrips: stats?.totalTrips ?? 0,
      completed: stats?.completed ?? 0,
      cancelled: stats?.cancelled ?? 0,
      revenue: parseFloat(stats?.revenue ?? '0'),
      byTripType: byTripType.map((r) => ({ ...r, revenue: parseFloat(r.revenue || '0') })),
    };
  }

  async getExecutiveSummary(q: { startDate?: string; endDate?: string }) {
    const [
      occupancy,
      revenue,
      guestStats,
      complaints,
      inventory,
      employees,
    ] = await Promise.all([
      this.getOccupancyReport(q),
      this.getRevenueReport(q),
      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where status = 'checked_in')::int`,
        })
        .from(reservationsTable),
      db
        .select({
          total: sql<number>`count(*)::int`,
          open: sql<number>`count(*) filter (where status not in ('resolved','closed'))::int`,
        })
        .from(complaintsTable)
        .where(eq(complaintsTable.isActive, true)),
      db
        .select({
          lowStock: sql<number>`count(*) filter (where status = 'low_stock')::int`,
        })
        .from(inventoryItemsTable)
        .where(eq(inventoryItemsTable.isActive, true)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(employeesTable)
        .where(eq(employeesTable.isActive, true)),
    ]);

    const totalComplaints = complaints[0]?.total ?? 0;
    const openComplaints = complaints[0]?.open ?? 0;
    const resolvedComplaints = totalComplaints - openComplaints;
    const complaintResolutionRate =
      totalComplaints > 0
        ? parseFloat(((resolvedComplaints / totalComplaints) * 100).toFixed(2))
        : 0;

    return {
      occupancyRate: occupancy.occupancyRate,
      totalRevenue: revenue.totalRevenue,
      netIncome: revenue.netIncome,
      totalGuests: guestStats[0]?.total ?? 0,
      totalReservations: occupancy.totalReservations,
      activeGuests: guestStats[0]?.active ?? 0,
      openComplaints,
      lowStockItems: inventory[0]?.lowStock ?? 0,
      employeeCount: employees[0]?.count ?? 0,
      complaintResolutionRate,
    };
  }
}
