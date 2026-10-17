import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, getTableColumns, desc, inArray } from 'drizzle-orm';
import {
  db,
  posOrdersTable,
  posOrderItemsTable,
  menuItemsTable,
  restaurantTablesTable,
} from '@workspace/db';

const fmtOrder = (o: any, items: any[]) => ({
  ...o,
  subtotal: o.subtotal != null ? parseFloat(o.subtotal) : 0,
  discountValue: o.discountValue != null ? parseFloat(o.discountValue) : 0,
  discountAmount: o.discountAmount != null ? parseFloat(o.discountAmount) : 0,
  taxRate: o.taxRate != null ? parseFloat(o.taxRate) : 0,
  taxAmount: o.taxAmount != null ? parseFloat(o.taxAmount) : 0,
  serviceChargeRate: o.serviceChargeRate != null ? parseFloat(o.serviceChargeRate) : 0,
  serviceChargeAmount: o.serviceChargeAmount != null ? parseFloat(o.serviceChargeAmount) : 0,
  totalAmount: o.totalAmount != null ? parseFloat(o.totalAmount) : 0,
  paidAt: o.paidAt?.toISOString() ?? null,
  createdAt: o.createdAt?.toISOString() ?? null,
  updatedAt: o.updatedAt?.toISOString() ?? null,
  notes: o.notes ?? null,
  guestName: o.guestName ?? null,
  items: items.map((i) => ({
    ...i,
    quantity: i.quantity,
    unitPrice: parseFloat(i.unitPrice),
    discountAmount: parseFloat(i.discountAmount ?? '0'),
    total: parseFloat(i.total),
    notes: i.notes ?? null,
    createdAt: i.createdAt?.toISOString() ?? null,
  })),
});

const fetchItems = async (orderId: string) =>
  db.select().from(posOrderItemsTable).where(eq(posOrderItemsTable.orderId, orderId));

const recalcOrder = async (orderId: string) => {
  const items = await fetchItems(orderId);
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.total), 0);
  return { subtotal, items };
};

@Injectable()
export class PosService {
  async getSummary() {
    const today = new Date().toISOString().slice(0, 10);
    const [statusRows, revenueRows] = await Promise.all([
      db
        .select({ status: posOrdersTable.status, count: sql<number>`count(*)::int` })
        .from(posOrdersTable)
        .where(eq(posOrdersTable.isActive, true))
        .groupBy(posOrdersTable.status),
      db
        .select({
          total: sql<string>`coalesce(sum(total_amount), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(posOrdersTable)
        .where(
          and(
            eq(posOrdersTable.paymentStatus, 'paid'),
            sql`date(${posOrdersTable.createdAt}) = ${today}`,
            eq(posOrdersTable.isActive, true),
          ),
        ),
    ]);

    let total = 0;
    let openOrders = 0;
    let paidOrders = 0;
    for (const r of statusRows) {
      total += r.count;
      if (r.status === 'open' || r.status === 'pending' || r.status === 'preparing' || r.status === 'ready' || r.status === 'served') {
        openOrders += r.count;
      }
      if (r.status === 'paid') paidOrders = r.count;
    }

    return {
      total,
      openOrders,
      paidOrders,
      todayRevenue: parseFloat(revenueRows[0]?.total ?? '0'),
      todayOrders: revenueRows[0]?.count ?? 0,
    };
  }

  async getOrders(q: any) {
    const conds: any[] = [eq(posOrdersTable.isActive, true)];
    if (q.status) conds.push(eq(posOrdersTable.status, q.status));
    if (q.orderType) conds.push(eq(posOrdersTable.orderType, q.orderType));
    if (q.date) conds.push(sql`date(${posOrdersTable.createdAt}) = ${q.date}`);

    const orders = await db
      .select()
      .from(posOrdersTable)
      .where(and(...conds))
      .orderBy(desc(posOrdersTable.createdAt));

    const result = [];
    for (const o of orders) {
      const items = await fetchItems(o.id);
      result.push(fmtOrder(o, items));
    }
    return result;
  }

  async getOrder(id: string) {
    const [o] = await db.select().from(posOrdersTable).where(eq(posOrdersTable.id, id));
    if (!o) throw new NotFoundException(`POS order ${id} not found`);
    const items = await fetchItems(id);
    return fmtOrder(o, items);
  }

  async createOrder(b: any) {
    const orderNumber = 'POS-' + Date.now().toString(36).toUpperCase();

    const itemInputs: { menuItemId: string; quantity: number; notes?: string }[] = b.items ?? [];
    const menuIds = itemInputs.map((i) => i.menuItemId);

    let menuItems: any[] = [];
    if (menuIds.length > 0) {
      menuItems = await db
        .select()
        .from(menuItemsTable)
        .where(and(inArray(menuItemsTable.id, menuIds), eq(menuItemsTable.isActive, true)));
    }
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    let subtotal = 0;
    const ois: any[] = [];
    for (const item of itemInputs) {
      const mi = menuMap.get(item.menuItemId);
      const price = mi ? parseFloat(mi.price as string) : 0;
      const total = price * item.quantity;
      subtotal += total;
      ois.push({
        menuItemId: item.menuItemId,
        name: mi ? mi.name : 'Unknown',
        quantity: item.quantity,
        unitPrice: String(price.toFixed(2)),
        discountAmount: '0',
        total: String(total.toFixed(2)),
        notes: item.notes ?? null,
        kitchenStatus: 'pending',
      });
    }

    // Apply discount
    const discountType = b.discountType ?? 'none';
    const discountValue = b.discountValue ?? 0;
    let discountAmount = 0;
    if (discountType === 'percent') discountAmount = subtotal * (discountValue / 100);
    else if (discountType === 'fixed') discountAmount = discountValue;

    const taxRate = b.taxRate ?? 0;
    const serviceChargeRate = b.serviceChargeRate ?? 0;
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const serviceChargeAmount = (subtotal - discountAmount) * (serviceChargeRate / 100);
    const totalAmount = subtotal - discountAmount + taxAmount + serviceChargeAmount;

    const [order] = await db
      .insert(posOrdersTable)
      .values({
        orderNumber,
        orderType: b.orderType ?? 'dine_in',
        tableId: b.tableId ?? null,
        tableNumber: b.tableNumber ?? null,
        reservationId: b.reservationId ?? null,
        guestId: b.guestId ?? null,
        guestName: b.guestName ?? null,
        roomNumber: b.roomNumber ?? null,
        waiterId: b.waiterId ?? null,
        status: 'open',
        subtotal: String(subtotal.toFixed(2)),
        discountType: discountType as any,
        discountValue: String(discountValue.toFixed(2)),
        discountAmount: String(discountAmount.toFixed(2)),
        taxRate: String(taxRate.toFixed(2)),
        taxAmount: String(taxAmount.toFixed(2)),
        serviceChargeRate: String(serviceChargeRate.toFixed(2)),
        serviceChargeAmount: String(serviceChargeAmount.toFixed(2)),
        totalAmount: String(totalAmount.toFixed(2)),
        couponCode: b.couponCode ?? null,
        notes: b.notes ?? null,
      })
      .returning();

    for (const oi of ois) {
      await db.insert(posOrderItemsTable).values({ orderId: order.id, ...oi });
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

  async updateOrder(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'paymentStatus', 'paymentMethod', 'notes', 'guestName', 'waiterId']) {
      if (b[k] !== undefined) u[k] = b[k];
    }

    if (b.paymentStatus === 'paid') {
      u.paidAt = new Date();
      u.receiptNumber = 'RCP-' + Date.now().toString(36).toUpperCase();
      u.status = 'paid';
    }

    const [o] = await db.update(posOrdersTable).set(u).where(eq(posOrdersTable.id, id)).returning();
    if (!o) throw new NotFoundException(`POS order ${id} not found`);

    if (o.tableId && b.paymentStatus === 'paid') {
      await db
        .update(restaurantTablesTable)
        .set({ status: 'available', currentOrderId: null })
        .where(eq(restaurantTablesTable.id, o.tableId));
    }

    const items = await fetchItems(id);
    return fmtOrder(o, items);
  }

  async addItem(orderId: string, b: any) {
    const [o] = await db.select().from(posOrdersTable).where(eq(posOrdersTable.id, orderId));
    if (!o) throw new NotFoundException(`POS order ${orderId} not found`);

    const [mi] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, b.menuItemId));
    const price = mi ? parseFloat(mi.price as string) : parseFloat(b.unitPrice ?? '0');
    const total = price * (b.quantity ?? 1);

    await db.insert(posOrderItemsTable).values({
      orderId,
      menuItemId: b.menuItemId,
      name: mi ? mi.name : b.name,
      quantity: b.quantity ?? 1,
      unitPrice: String(price.toFixed(2)),
      discountAmount: String(parseFloat(b.discountAmount ?? '0').toFixed(2)),
      total: String(total.toFixed(2)),
      notes: b.notes ?? null,
      kitchenStatus: 'pending',
    });

    const { subtotal, items } = await recalcOrder(orderId);
    const discountAmount = parseFloat(o.discountAmount ?? '0');
    const taxRate = parseFloat(o.taxRate ?? '0');
    const serviceChargeRate = parseFloat(o.serviceChargeRate ?? '0');
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const serviceChargeAmount = (subtotal - discountAmount) * (serviceChargeRate / 100);
    const totalAmount = subtotal - discountAmount + taxAmount + serviceChargeAmount;

    const [updated] = await db
      .update(posOrdersTable)
      .set({
        subtotal: String(subtotal.toFixed(2)),
        taxAmount: String(taxAmount.toFixed(2)),
        serviceChargeAmount: String(serviceChargeAmount.toFixed(2)),
        totalAmount: String(totalAmount.toFixed(2)),
      })
      .where(eq(posOrdersTable.id, orderId))
      .returning();

    return fmtOrder(updated, items);
  }

  async removeItem(orderId: string, itemId: string) {
    const [o] = await db.select().from(posOrdersTable).where(eq(posOrdersTable.id, orderId));
    if (!o) throw new NotFoundException(`POS order ${orderId} not found`);

    await db.delete(posOrderItemsTable).where(eq(posOrderItemsTable.id, itemId));

    const { subtotal, items } = await recalcOrder(orderId);
    const discountAmount = parseFloat(o.discountAmount ?? '0');
    const taxRate = parseFloat(o.taxRate ?? '0');
    const serviceChargeRate = parseFloat(o.serviceChargeRate ?? '0');
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const serviceChargeAmount = (subtotal - discountAmount) * (serviceChargeRate / 100);
    const totalAmount = subtotal - discountAmount + taxAmount + serviceChargeAmount;

    const [updated] = await db
      .update(posOrdersTable)
      .set({
        subtotal: String(subtotal.toFixed(2)),
        taxAmount: String(taxAmount.toFixed(2)),
        serviceChargeAmount: String(serviceChargeAmount.toFixed(2)),
        totalAmount: String(totalAmount.toFixed(2)),
      })
      .where(eq(posOrdersTable.id, orderId))
      .returning();

    return fmtOrder(updated, items);
  }

  async voidOrder(orderId: string) {
    const [o] = await db
      .update(posOrdersTable)
      .set({ status: 'cancelled', isActive: false })
      .where(eq(posOrdersTable.id, orderId))
      .returning();
    if (!o) throw new NotFoundException(`POS order ${orderId} not found`);

    if (o.tableId) {
      await db
        .update(restaurantTablesTable)
        .set({ status: 'available', currentOrderId: null })
        .where(eq(restaurantTablesTable.id, o.tableId));
    }

    return { success: true, orderId };
  }
}
