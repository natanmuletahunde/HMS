import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, inArray, desc, asc } from 'drizzle-orm';
import {
  db,
  menuItemsTable,
  restaurantTablesTable,
  restaurantOrdersTable,
  restaurantOrderItemsTable,
  usersTable,
} from '@workspace/db';

const fmtMenu = (m: any) => ({
  ...m,
  description: m.description ?? null,
  imageUrl: m.imageUrl ?? null,
  price: parseFloat(m.price),
  createdAt: m.createdAt?.toISOString() ?? null,
  updatedAt: m.updatedAt?.toISOString() ?? null,
});

const fmtOrder = (o: any, items: any[]) => ({
  ...o,
  notes: o.notes ?? null,
  reservationId: o.reservationId ?? null,
  guestName: o.guestName ?? null,
  subtotal: o.subtotal != null ? parseFloat(o.subtotal) : 0,
  taxAmount: o.taxAmount != null ? parseFloat(o.taxAmount) : 0,
  serviceChargeAmount: o.serviceChargeAmount != null ? parseFloat(o.serviceChargeAmount) : 0,
  discountAmount: o.discountAmount != null ? parseFloat(o.discountAmount) : 0,
  totalAmount: o.totalAmount != null ? parseFloat(o.totalAmount) : 0,
  servedAt: o.servedAt?.toISOString() ?? null,
  createdAt: o.createdAt?.toISOString() ?? null,
  updatedAt: o.updatedAt?.toISOString() ?? null,
  items: items.map((i) => ({
    ...i,
    quantity: i.quantity,
    unitPrice: parseFloat(i.unitPrice),
    total: parseFloat(i.total),
    notes: i.notes ?? null,
  })),
});

const fetchItems = async (orderId: string) =>
  db.select().from(restaurantOrderItemsTable).where(eq(restaurantOrderItemsTable.orderId, orderId));

@Injectable()
export class RestaurantService {
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const [orderStatusRows, tableStatusRows, revenueRows] = await Promise.all([
      db
        .select({ status: restaurantOrdersTable.status, count: sql<number>`count(*)::int` })
        .from(restaurantOrdersTable)
        .groupBy(restaurantOrdersTable.status),
      db
        .select({ status: restaurantTablesTable.status, count: sql<number>`count(*)::int` })
        .from(restaurantTablesTable)
        .where(eq(restaurantTablesTable.isActive, true))
        .groupBy(restaurantTablesTable.status),
      db
        .select({ total: sql<string>`coalesce(sum(total_amount), 0)` })
        .from(restaurantOrdersTable)
        .where(
          and(
            inArray(restaurantOrdersTable.status, ['served', 'completed'] as any[]),
            sql`date(${restaurantOrdersTable.createdAt}) = ${today}`,
          ),
        ),
    ]);

    const byStatus: any = {};
    let totalOrders = 0;
    let activeOrders = 0;
    for (const r of orderStatusRows) {
      byStatus[r.status] = r.count;
      totalOrders += r.count;
      if (['pending', 'preparing', 'ready'].includes(r.status)) activeOrders += r.count;
    }

    let totalTables = 0;
    let occupiedTables = 0;
    for (const r of tableStatusRows) {
      totalTables += r.count;
      if (r.status === 'occupied') occupiedTables = r.count;
    }

    return {
      totalOrders,
      activeOrders,
      totalTables,
      occupiedTables,
      todayRevenue: parseFloat(revenueRows[0]?.total ?? '0'),
      byStatus,
    };
  }

  async getMenuItems(q: any) {
    const conds: any[] = [eq(menuItemsTable.isActive, true)];
    if (q.category) conds.push(eq(menuItemsTable.category, q.category));
    if (q.isAvailable !== undefined) conds.push(eq(menuItemsTable.isAvailable, q.isAvailable === 'true'));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(menuItemsTable.name, s), like(menuItemsTable.description, s)));
    }
    const menuCols = getTableColumns(menuItemsTable);
    const rows = await db
      .select(menuCols)
      .from(menuItemsTable)
      .where(and(...conds))
      .orderBy(asc(menuItemsTable.category), asc(menuItemsTable.name));
    return rows.map(fmtMenu);
  }

  async createMenuItem(b: any) {
    const itemCode = 'MN-' + Date.now().toString(36).toUpperCase();
    const [m] = await db
      .insert(menuItemsTable)
      .values({
        itemCode,
        name: b.name,
        category: b.category,
        kitchenSection: b.kitchenSection ?? 'hot',
        description: b.description ?? null,
        price: String(b.price),
        preparationTime: b.preparationTime ?? 15,
        imageUrl: b.imageUrl ?? null,
        isAvailable: b.isAvailable ?? true,
      })
      .returning();
    return fmtMenu(m);
  }

  async updateMenuItem(id: string, b: any) {
    const u: any = {};
    for (const k of ['name', 'category', 'kitchenSection', 'description', 'imageUrl', 'isAvailable', 'preparationTime', 'itemCode']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.price !== undefined) u.price = String(b.price);
    const [m] = await db.update(menuItemsTable).set(u).where(eq(menuItemsTable.id, id)).returning();
    if (!m) throw new NotFoundException(`Menu item ${id} not found`);
    return fmtMenu(m);
  }

  async deleteMenuItem(id: string) {
    const [m] = await db
      .update(menuItemsTable)
      .set({ isActive: false })
      .where(eq(menuItemsTable.id, id))
      .returning();
    if (!m) throw new NotFoundException(`Menu item ${id} not found`);
    return { success: true };
  }

  async getTables(q: any) {
    const tblCols = getTableColumns(restaurantTablesTable);
    const fields = {
      ...tblCols,
      waiterName: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
    };
    const conds: any[] = [eq(restaurantTablesTable.isActive, true)];
    if (q.status) conds.push(eq(restaurantTablesTable.status, q.status));
    if (q.floor) conds.push(eq(restaurantTablesTable.floor, q.floor));
    if (q.section) conds.push(eq(restaurantTablesTable.section, q.section));

    return db
      .select(fields)
      .from(restaurantTablesTable)
      .leftJoin(usersTable, eq(restaurantTablesTable.waiterId, usersTable.id))
      .where(and(...conds))
      .orderBy(asc(restaurantTablesTable.tableNumber));
  }

  async createTable(b: any) {
    const { randomUUID } = await import('crypto');
    const [tbl] = await db
      .insert(restaurantTablesTable)
      .values({
        id: randomUUID(),
        tableNumber: b.tableNumber,
        name: b.name ?? null,
        capacity: b.capacity ?? 4,
        floor: b.floor ?? '1',
        section: b.section ?? null,
        status: 'available',
      })
      .returning();
    return tbl;
  }

  async updateTable(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'waiterId', 'name', 'capacity', 'section', 'floor', 'currentOrderId']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    const [tbl] = await db.update(restaurantTablesTable).set(u).where(eq(restaurantTablesTable.id, id)).returning();
    if (!tbl) throw new NotFoundException(`Table ${id} not found`);
    return tbl;
  }

  async getOrders(q: any) {
    const conds: any[] = [eq(restaurantOrdersTable.isActive, true)];
    if (q.status) conds.push(eq(restaurantOrdersTable.status, q.status));
    if (q.orderType) conds.push(eq(restaurantOrdersTable.orderType, q.orderType));
    if (q.tableNumber) conds.push(eq(restaurantOrdersTable.tableNumber, parseInt(q.tableNumber, 10)));

    const orders = await db
      .select()
      .from(restaurantOrdersTable)
      .where(and(...conds))
      .orderBy(desc(restaurantOrdersTable.createdAt));

    const result = [];
    for (const o of orders) {
      const items = await fetchItems(o.id);
      result.push(fmtOrder(o, items));
    }
    return result;
  }

  async createOrder(b: any) {
    const itemRows = await db
      .select()
      .from(menuItemsTable)
      .where(and(eq(menuItemsTable.isAvailable, true), eq(menuItemsTable.isActive, true)));
    const menuMap = new Map(itemRows.map((i) => [i.id, i]));

    let subtotal = 0;
    const ois: any[] = [];
    for (const item of (b.items ?? []) as { menuItemId: string; quantity: number; notes?: string }[]) {
      const mi = menuMap.get(item.menuItemId);
      if (!mi) throw new BadRequestException(`Menu item ${item.menuItemId} not found`);
      const lt = parseFloat(mi.price as string) * item.quantity;
      subtotal += lt;
      ois.push({
        menuItemId: item.menuItemId,
        name: mi.name,
        quantity: item.quantity,
        unitPrice: String(parseFloat(mi.price as string).toFixed(2)),
        total: String(lt.toFixed(2)),
        notes: item.notes ?? null,
      });
    }

    const taxAmount = subtotal * (b.taxRate ?? 0.1);
    const serviceChargeAmount = subtotal * (b.serviceChargeRate ?? 0.05);
    const discountAmount = b.discountAmount ?? 0;
    const totalAmount = subtotal + taxAmount + serviceChargeAmount - discountAmount;
    const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();

    const [order] = await db
      .insert(restaurantOrdersTable)
      .values({
        orderNumber,
        tableNumber: b.tableNumber ?? null,
        tableId: b.tableId ?? null,
        orderType: b.orderType ?? 'dine_in',
        reservationId: b.reservationId ?? null,
        guestId: b.guestId ?? null,
        roomId: b.roomId ?? null,
        waiterId: b.waiterId ?? null,
        guestName: b.guestName ?? null,
        status: 'pending',
        subtotal: String(subtotal.toFixed(2)),
        taxAmount: String(taxAmount.toFixed(2)),
        serviceChargeAmount: String(serviceChargeAmount.toFixed(2)),
        discountAmount: String(discountAmount.toFixed(2)),
        totalAmount: String(totalAmount.toFixed(2)),
        notes: b.notes ?? null,
      })
      .returning();

    for (const oi of ois) {
      await db.insert(restaurantOrderItemsTable).values({ orderId: order.id, ...oi });
    }

    if (b.tableId) {
      await db
        .update(restaurantTablesTable)
        .set({ status: 'occupied', currentOrderId: order.id })
        .where(eq(restaurantTablesTable.id, b.tableId));
    }

    const items = await fetchItems(order.id);
    return fmtOrder(order, items);
  }

  async getOrder(id: string) {
    const [o] = await db.select().from(restaurantOrdersTable).where(eq(restaurantOrdersTable.id, id));
    if (!o) throw new NotFoundException(`Order ${id} not found`);
    const items = await fetchItems(id);
    return fmtOrder(o, items);
  }

  async updateOrder(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'notes', 'paymentStatus', 'paymentMethod', 'waiterId']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.status === 'served') u.servedAt = new Date();

    const [o] = await db.update(restaurantOrdersTable).set(u).where(eq(restaurantOrdersTable.id, id)).returning();
    if (!o) throw new NotFoundException(`Order ${id} not found`);

    if (o.tableId && (b.status === 'served' || b.status === 'cancelled')) {
      await db
        .update(restaurantTablesTable)
        .set({ status: 'available', currentOrderId: null })
        .where(eq(restaurantTablesTable.id, o.tableId));
    }

    const items = await fetchItems(id);
    return fmtOrder(o, items);
  }

  async getKitchenOrders() {
    const orders = await db
      .select()
      .from(restaurantOrdersTable)
      .where(
        and(
          inArray(restaurantOrdersTable.status, ['pending', 'preparing', 'ready']),
          eq(restaurantOrdersTable.isActive, true),
        ),
      )
      .orderBy(asc(restaurantOrdersTable.createdAt));

    const result = [];
    for (const o of orders) {
      const items = await fetchItems(o.id);
      result.push(fmtOrder(o, items));
    }
    return result;
  }
}
