import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, inArray, desc, asc } from 'drizzle-orm';
import {
  db,
  menuItemsTable,
  restaurantTablesTable,
  restaurantOrdersTable,
  restaurantOrderItemsTable,
  usersTable,
  rolesTable,
  roomsTable,
  reservationsTable,
  guestsTable,
  dailyMealClaimsTable,
  invoicesTable,
  invoiceLineItemsTable,
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
  diningCase: o.diningCase ?? 'walk_in',
  settlementType: o.settlementType ?? 'direct_payment',
  coordinatorId: o.coordinatorId ?? null,
  kitchenOfficerId: o.kitchenOfficerId ?? null,
  routedVia: o.routedVia ?? 'direct_kitchen',
  coordinatorStatus: o.coordinatorStatus ?? 'pending',
  coordinatorNotes: o.coordinatorNotes ?? null,
  kitchenNotes: o.kitchenNotes ?? null,
  notifiedParty: o.notifiedParty ?? null,
  readyAt: o.readyAt?.toISOString() ?? null,
  dispatchedAt: o.dispatchedAt?.toISOString() ?? null,
  complimentaryDiscountAmount: o.complimentaryDiscountAmount != null ? parseFloat(o.complimentaryDiscountAmount) : 0,
  subtotal: o.subtotal != null ? parseFloat(o.subtotal) : 0,
  taxAmount: o.taxAmount != null ? parseFloat(o.taxAmount) : 0,
  serviceChargeAmount: o.serviceChargeAmount != null ? parseFloat(o.serviceChargeAmount) : 0,
  discountAmount: o.discountAmount != null ? parseFloat(o.discountAmount) : 0,
  totalAmount: o.totalAmount != null ? parseFloat(o.totalAmount) : 0,
  servedAt: o.servedAt?.toISOString() ?? null,
  billingStatus: o.billingStatus ?? 'open_tab',
  billRequestedAt: o.billRequestedAt?.toISOString() ?? null,
  receiptPrintedAt: o.receiptPrintedAt?.toISOString() ?? null,
  cashierId: o.cashierId ?? null,
  cashierNotes: o.cashierNotes ?? null,
  createdAt: o.createdAt?.toISOString() ?? null,
  updatedAt: o.updatedAt?.toISOString() ?? null,
  items: items.map((i) => ({
    ...i,
    quantity: i.quantity,
    unitPrice: parseFloat(i.unitPrice),
    total: parseFloat(i.total),
    isComplimentary: !!i.isComplimentary,
    notes: i.notes ?? null,
  })),
});

const enrichOrdersWithUserNames = async (orders: any[]) => {
  const userIds = new Set<string>();
  for (const o of orders) {
    if (o.waiterId) userIds.add(o.waiterId);
    if (o.coordinatorId) userIds.add(o.coordinatorId);
    if (o.kitchenOfficerId) userIds.add(o.kitchenOfficerId);
    if (o.cashierId) userIds.add(o.cashierId);
  }
  const userMap = new Map<string, string>();
  if (userIds.size > 0) {
    const users = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(inArray(usersTable.id, Array.from(userIds)));
    for (const u of users) {
      userMap.set(u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim());
    }
  }
  return orders.map((o) => ({
    ...o,
    waiterName: o.waiterId ? userMap.get(o.waiterId) || null : null,
    coordinatorName: o.coordinatorId ? userMap.get(o.coordinatorId) || null : null,
    kitchenOfficerName: o.kitchenOfficerId ? userMap.get(o.kitchenOfficerId) || null : null,
    cashierName: o.cashierId ? userMap.get(o.cashierId) || null : null,
  }));
};

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
    if (q.coordinatorId) conds.push(eq(restaurantOrdersTable.coordinatorId, q.coordinatorId));
    if (q.routedVia) conds.push(eq(restaurantOrdersTable.routedVia, q.routedVia));
    if (q.coordinatorStatus) conds.push(eq(restaurantOrdersTable.coordinatorStatus, q.coordinatorStatus));
    if (q.diningCase) conds.push(eq(restaurantOrdersTable.diningCase, q.diningCase));

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
    return enrichOrdersWithUserNames(result);
  }

  async verifyResident(roomNumber: string) {
    const cleanRoom = (roomNumber || '').trim();
    if (!cleanRoom) {
      return { valid: false, message: 'Please provide a valid room number.' };
    }

    const [room] = await db
      .select()
      .from(roomsTable)
      .where(eq(roomsTable.number, cleanRoom));

    if (!room) {
      return { valid: false, message: `Room ${cleanRoom} does not exist in the hotel.` };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const reservations = await db
      .select()
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.roomId, room.id),
          inArray(reservationsTable.status, ['checked_in', 'confirmed']),
        ),
      )
      .orderBy(desc(reservationsTable.createdAt))
      .limit(1);

    const activeRes = reservations[0];
    let guest: any = null;
    if (activeRes?.guestId) {
      const [g] = await db.select().from(guestsTable).where(eq(guestsTable.id, activeRes.guestId));
      guest = g;
    }

    if (room.status !== 'occupied' && !activeRes) {
      return {
        valid: false,
        isOccupied: false,
        roomNumber: room.number,
        message: `Room ${cleanRoom} is currently vacant (no active guest check-in).`,
      };
    }

    // Check breakfast claim for today
    const [existingClaim] = await db
      .select()
      .from(dailyMealClaimsTable)
      .where(
        and(
          eq(dailyMealClaimsTable.roomId, room.id),
          eq(dailyMealClaimsTable.claimDate, todayStr),
          eq(dailyMealClaimsTable.mealType, 'breakfast'),
        ),
      )
      .limit(1);

    const guestName =
      (guest ? `${guest.firstName} ${guest.lastName || ''}`.trim() : null) ||
      'In-House Resident';

    const adults = activeRes?.adults || 1;

    return {
      valid: true,
      isOccupied: true,
      roomId: room.id,
      roomNumber: room.number,
      reservationId: activeRes?.id || null,
      guestId: guest?.id || activeRes?.guestId || null,
      guestName,
      adults,
      complimentaryBreakfast: {
        isEligible: !existingClaim,
        alreadyClaimed: !!existingClaim,
        coversClaimed: existingClaim?.coversClaimed || 0,
        claimDate: todayStr,
        claimTime: existingClaim?.createdAt || null,
        message: existingClaim
          ? `Breakfast was already claimed today for Room ${cleanRoom} (${existingClaim.coversClaimed} covers). Additional orders will be charged.`
          : `Room ${cleanRoom} is eligible for 100% complimentary hotel breakfast today (${adults} covers).`,
      },
    };
  }

  async createOrder(b: any) {
    const itemRows = await db
      .select()
      .from(menuItemsTable)
      .where(and(eq(menuItemsTable.isAvailable, true), eq(menuItemsTable.isActive, true)));
    const menuMap = new Map(itemRows.map((i) => [i.id, i]));

    const diningCase = b.diningCase || (b.orderType === 'room_service' ? 'room_service' : b.roomId ? 'in_house_table' : 'walk_in');
    const settlementType = b.settlementType || (b.isComplimentary ? 'complimentary_breakfast' : b.orderType === 'room_charge' ? 'room_charge' : 'direct_payment');

    let grossSubtotal = 0;
    let complimentaryDiscountAmount = 0;
    const ois: any[] = [];

    for (const item of (b.items ?? []) as { menuItemId: string; quantity: number; notes?: string; isComplimentary?: boolean }[]) {
      const mi = menuMap.get(item.menuItemId);
      if (!mi) throw new BadRequestException(`Menu item ${item.menuItemId} not found`);
      const lt = parseFloat(mi.price as string) * item.quantity;
      grossSubtotal += lt;

      // Check if item is complimentary breakfast for In-House table guest
      const isBreakfast = (mi.category || '').toLowerCase() === 'breakfast';
      const isItemComplimentary =
        item.isComplimentary ||
        (diningCase === 'in_house_table' && settlementType === 'complimentary_breakfast' && isBreakfast);

      if (isItemComplimentary) {
        complimentaryDiscountAmount += lt;
      }

      ois.push({
        menuItemId: item.menuItemId,
        name: mi.name,
        quantity: item.quantity,
        unitPrice: String(parseFloat(mi.price as string).toFixed(2)),
        total: String(lt.toFixed(2)),
        isComplimentary: isItemComplimentary,
        notes: item.notes ?? null,
      });
    }

    // Chargeable subtotal is after complimentary discount and promotional discount
    const chargeableSubtotal = Math.max(0, grossSubtotal - complimentaryDiscountAmount - (b.discountAmount ?? 0));
    const taxRate = b.taxRate ?? 0.1;
    const serviceChargeRate = b.serviceChargeRate ?? (diningCase === 'room_service' ? 0.1 : 0.05);

    const taxAmount = chargeableSubtotal * taxRate;
    const serviceChargeAmount = chargeableSubtotal * serviceChargeRate;
    const totalAmount = chargeableSubtotal + taxAmount + serviceChargeAmount;
    const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();

    const [order] = await db
      .insert(restaurantOrdersTable)
      .values({
        orderNumber,
        tableNumber: b.tableNumber ?? null,
        tableId: b.tableId ?? null,
        orderType: diningCase === 'room_service' ? 'room_service' : b.orderType ?? (b.roomId ? 'room_charge' : 'dine_in'),
        diningCase,
        settlementType,
        complimentaryDiscountAmount: String(complimentaryDiscountAmount.toFixed(2)),
        reservationId: b.reservationId ?? null,
        guestId: b.guestId ?? null,
        roomId: b.roomId ?? null,
        waiterId: b.waiterId ?? null,
        coordinatorId: b.coordinatorId ?? null,
        kitchenOfficerId: b.kitchenOfficerId ?? null,
        routedVia: b.routedVia || (b.coordinatorId ? 'coordinator' : 'direct_kitchen'),
        coordinatorStatus: b.coordinatorId ? 'pending' : 'bypassed',
        coordinatorNotes: b.coordinatorNotes ?? null,
        guestName: diningCase === 'in_house_table' ? (b.guestName ?? null) : null,
        status: 'pending',
        subtotal: String(grossSubtotal.toFixed(2)),
        taxAmount: String(taxAmount.toFixed(2)),
        serviceChargeAmount: String(serviceChargeAmount.toFixed(2)),
        discountAmount: String((b.discountAmount ?? 0).toFixed(2)),
        totalAmount: String(totalAmount.toFixed(2)),
        paymentStatus: settlementType === 'complimentary_breakfast' && totalAmount === 0 ? 'paid' : (b.paymentStatus ?? 'pending'),
        paymentMethod: settlementType === 'complimentary_breakfast' ? 'complimentary' : b.paymentMethod ?? null,
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

    // Record breakfast claim in dailyMealClaimsTable
    if (diningCase === 'in_house_table' && complimentaryDiscountAmount > 0 && b.roomId) {
      const todayStr = new Date().toISOString().slice(0, 10);
      try {
        await db.insert(dailyMealClaimsTable).values({
          roomId: b.roomId,
          roomNumber: String(b.roomNumber || b.roomId),
          reservationId: b.reservationId ?? null,
          guestId: b.guestId ?? null,
          guestName: b.guestName ?? null,
          claimDate: todayStr,
          mealType: 'breakfast',
          coversClaimed: b.coversCount || 1,
          orderId: order.id,
          notes: `Complimentary breakfast claim at Table ${b.tableNumber || 'Dine-In'}`,
        });
      } catch (claimErr) {
        console.error('Failed to record daily meal claim:', claimErr);
      }
    }

    // Auto-tally to guest stay invoice if charged to room folio
    if ((settlementType === 'room_charge' || diningCase === 'room_service') && totalAmount > 0 && (b.reservationId || b.guestId)) {
      try {
        let invoice: any = null;
        if (b.reservationId) {
          const [inv] = await db
            .select()
            .from(invoicesTable)
            .where(
              and(
                eq(invoicesTable.reservationId, b.reservationId),
                or(eq(invoicesTable.status, 'draft'), eq(invoicesTable.status, 'issued')),
              ),
            )
            .orderBy(desc(invoicesTable.createdAt))
            .limit(1);
          invoice = inv;
        }
        if (!invoice && b.guestId) {
          const [inv] = await db
            .select()
            .from(invoicesTable)
            .where(
              and(
                eq(invoicesTable.guestId, b.guestId),
                or(eq(invoicesTable.status, 'draft'), eq(invoicesTable.status, 'issued')),
              ),
            )
            .orderBy(desc(invoicesTable.createdAt))
            .limit(1);
          invoice = inv;
        }

        const descText = diningCase === 'room_service'
          ? `In-Room Dining Order #${orderNumber} (${b.roomNumber ? `Room ${b.roomNumber}` : 'Room Service'})`
          : `Restaurant Table ${b.tableNumber || ''} Dining (${orderNumber})`;

        if (invoice) {
          await db.insert(invoiceLineItemsTable).values({
            invoiceId: invoice.id,
            description: descText,
            quantity: '1',
            unitPrice: String(totalAmount.toFixed(2)),
            total: String(totalAmount.toFixed(2)),
          });
          const newSubtotal = parseFloat(invoice.subtotal || '0') + totalAmount;
          const newTotal = parseFloat(invoice.totalAmount || '0') + totalAmount;
          await db
            .update(invoicesTable)
            .set({
              subtotal: String(newSubtotal.toFixed(2)),
              totalAmount: String(newTotal.toFixed(2)),
            })
            .where(eq(invoicesTable.id, invoice.id));
        } else if (b.guestId) {
          const invNum = 'INV-' + Date.now().toString(36).toUpperCase();
          const [newInv] = await db
            .insert(invoicesTable)
            .values({
              invoiceNumber: invNum,
              reservationId: b.reservationId ?? null,
              guestId: b.guestId,
              subtotal: String(totalAmount.toFixed(2)),
              taxAmount: '0',
              totalAmount: String(totalAmount.toFixed(2)),
              paidAmount: '0',
              status: 'draft',
              notes: `Auto-generated folio for Table ${b.tableNumber || ''}`,
            })
            .returning();

          await db.insert(invoiceLineItemsTable).values({
            invoiceId: newInv.id,
            description: descText,
            quantity: '1',
            unitPrice: String(totalAmount.toFixed(2)),
            total: String(totalAmount.toFixed(2)),
          });
        }
      } catch (folioErr) {
        console.error('Failed to post dining charge to folio:', folioErr);
      }
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
    for (const k of [
      'status', 'notes', 'paymentStatus', 'paymentMethod', 'waiterId',
      'coordinatorId', 'kitchenOfficerId', 'routedVia', 'coordinatorStatus',
      'coordinatorNotes', 'kitchenNotes', 'notifiedParty',
      'billingStatus', 'billRequestedAt', 'receiptPrintedAt', 'cashierId', 'cashierNotes',
    ]) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.status === 'served') u.servedAt = new Date();
    if (b.status === 'ready' && !b.readyAt) u.readyAt = new Date();
    if (b.coordinatorStatus === 'dispatched' && !b.dispatchedAt) u.dispatchedAt = new Date();

    const [o] = await db.update(restaurantOrdersTable).set(u).where(eq(restaurantOrdersTable.id, id)).returning();
    if (!o) throw new NotFoundException(`Order ${id} not found`);

    if (o.tableId && (b.status === 'served' || b.status === 'cancelled')) {
      await db
        .update(restaurantTablesTable)
        .set({ status: 'available', currentOrderId: null })
        .where(eq(restaurantTablesTable.id, o.tableId));
    }

    const items = await fetchItems(id);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(o, items)]);
    return enriched;
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
    return enrichOrdersWithUserNames(result);
  }

  async getCoordinators() {
    const [role] = await db.select().from(rolesTable).where(sql`lower(${rolesTable.name}) = 'coordinator'`);
    if (!role) return [];

    const users = await db
      .select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        phone: usersTable.phone,
        isOnDuty: usersTable.isOnDuty,
        isActive: usersTable.isActive,
      })
      .from(usersTable)
      .where(and(eq(usersTable.roleId, role.id), eq(usersTable.isActive, true)));

    const activeCounts = await db
      .select({
        coordinatorId: restaurantOrdersTable.coordinatorId,
        count: sql<number>`count(*)::int`,
      })
      .from(restaurantOrdersTable)
      .where(
        and(
          inArray(restaurantOrdersTable.status, ['pending', 'preparing'] as any[]),
          eq(restaurantOrdersTable.isActive, true),
        ),
      )
      .groupBy(restaurantOrdersTable.coordinatorId);

    const countMap = new Map(activeCounts.map((c) => [c.coordinatorId, c.count]));

    return users.map((u) => ({
      ...u,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      activeOrdersCount: countMap.get(u.id) || 0,
      isFree: (countMap.get(u.id) || 0) === 0,
    }));
  }

  async dispatchToKitchen(orderId: string, coordinatorId?: string, notes?: string) {
    const u: any = {
      coordinatorStatus: 'dispatched',
      dispatchedAt: new Date(),
    };
    if (coordinatorId) u.coordinatorId = coordinatorId;
    if (notes) u.coordinatorNotes = notes;

    const [o] = await db
      .update(restaurantOrdersTable)
      .set(u)
      .where(eq(restaurantOrdersTable.id, orderId))
      .returning();

    if (!o) throw new NotFoundException(`Order ${orderId} not found`);
    const items = await fetchItems(orderId);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(o, items)]);
    return enriched;
  }

  async notifyReady(
    orderId: string,
    notifiedParty: 'waiter' | 'coordinator' = 'waiter',
    kitchenOfficerId?: string,
    notes?: string,
  ) {
    const u: any = {
      status: 'ready',
      notifiedParty,
      readyAt: new Date(),
    };
    if (kitchenOfficerId) u.kitchenOfficerId = kitchenOfficerId;
    if (notes) u.kitchenNotes = notes;

    const [o] = await db
      .update(restaurantOrdersTable)
      .set(u)
      .where(eq(restaurantOrdersTable.id, orderId))
      .returning();

    if (!o) throw new NotFoundException(`Order ${orderId} not found`);
    const items = await fetchItems(orderId);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(o, items)]);
    return enriched;
  }

  async requestBill(id: string, notes?: string) {
    const u: any = {
      billingStatus: 'bill_requested',
      billRequestedAt: new Date(),
    };
    if (notes) u.notes = notes;

    const [o] = await db
      .update(restaurantOrdersTable)
      .set(u)
      .where(eq(restaurantOrdersTable.id, id))
      .returning();

    if (!o) throw new NotFoundException(`Order ${id} not found`);
    const items = await fetchItems(id);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(o, items)]);
    return enriched;
  }

  async printReceipt(id: string, cashierId?: string, notes?: string) {
    const u: any = {
      billingStatus: 'bill_printed',
      receiptPrintedAt: new Date(),
    };
    if (cashierId) u.cashierId = cashierId;
    if (notes) u.cashierNotes = notes;

    const [o] = await db
      .update(restaurantOrdersTable)
      .set(u)
      .where(eq(restaurantOrdersTable.id, id))
      .returning();

    if (!o) throw new NotFoundException(`Order ${id} not found`);
    const items = await fetchItems(id);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(o, items)]);
    return enriched;
  }

  async deliverReceipt(id: string) {
    const [o] = await db
      .update(restaurantOrdersTable)
      .set({
        billingStatus: 'delivered',
      })
      .where(eq(restaurantOrdersTable.id, id))
      .returning();

    if (!o) throw new NotFoundException(`Order ${id} not found`);
    const items = await fetchItems(id);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(o, items)]);
    return enriched;
  }

  async getCashierOrders(q: any = {}) {
    const conds: any[] = [eq(restaurantOrdersTable.isActive, true)];
    if (q.billingStatus) conds.push(eq(restaurantOrdersTable.billingStatus, q.billingStatus));
    if (q.diningCase) conds.push(eq(restaurantOrdersTable.diningCase, q.diningCase));

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
    return enrichOrdersWithUserNames(result);
  }
}
