import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
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
  notificationsTable,
} from '@workspace/db';
import { EventBusService } from '../event-bus/event-bus.service';

export type CanonicalStation = 'hot' | 'grill' | 'cold' | 'pastry' | 'bar' | 'coffee' | 'juice';

export const resolveCanonicalStation = (
  kitchenSection?: string | null,
  category?: string | null,
  name?: string | null,
): CanonicalStation => {
  const s = (kitchenSection || '').toLowerCase().trim();
  const c = (category || '').toLowerCase().trim();
  const n = (name || '').toLowerCase().trim();

  // 1. Coffee Station (Barista / Coffee Attendant)
  if (
    s === 'coffee' || c === 'coffee' || c === 'tea' ||
    ['buna', 'jebena', 'espresso', 'macchiato', 'cappuccino', 'latte', 'shai', 'tea', 'chocolate', 'americano', 'cortado', 'mocha', 'cold brew', 'affogato'].some(k => k === 'tea' ? /\btea\b/.test(n) : n.includes(k))
  ) {
    return 'coffee';
  }

  // 2. Juice & Soft Drinks Station (Beverage Staff)
  if (
    s === 'juice' || c === 'juice' ||
    ['juice', 'spris', 'smoothie', 'milkshake', 'lemonade', 'water', 'coke', 'coca', 'fanta', 'sprite', 'pepsi', 'mirinda', 'energy drink', 'red bull', 'keribo', 'borde', 'irgo'].some(k => n.includes(k))
  ) {
    return 'juice';
  }

  // 3. Bar Station (Barman)
  if (
    s === 'bar' || c === 'drinks' ||
    ['beer', 'wine', 'spirit', 'cocktail', 'whisky', 'whiskey', 'vodka', 'gin', 'rum', 'brandy', 'mojito', 'margarita', 'martini', 'negroni', 'spritz', 'sour', 'daiquiri', 'tej', 'tella', 'areke'].some(k => n.includes(k))
  ) {
    return 'bar';
  }

  if (s === 'cold' || s === 'salad') return 'cold';
  if (s === 'bakery' || s === 'pastry' || c === 'dessert') return 'pastry';
  if (s === 'grill') return 'grill';
  return 'hot';
};

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
  pacingPreference: o.pacingPreference ?? 'drinks_first',
  createdAt: o.createdAt?.toISOString() ?? null,
  updatedAt: o.updatedAt?.toISOString() ?? null,
  items: items.map((i) => ({
    ...i,
    quantity: i.quantity,
    unitPrice: parseFloat(i.unitPrice),
    total: parseFloat(i.total),
    isComplimentary: !!i.isComplimentary,
    notes: i.notes ?? null,
    kitchenStatus: i.kitchenStatus ?? 'pending',
    isReady: i.kitchenStatus === 'ready' || i.kitchenStatus === 'served',
    roundNumber: i.roundNumber ?? 1,
    station: i.station ?? 'hot',
    category: i.category ?? null,
    kitchenSection: i.kitchenSection ?? null,
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

const fetchItems = async (orderId: string) => {
  const rows = await db
    .select({
      id: restaurantOrderItemsTable.id,
      orderId: restaurantOrderItemsTable.orderId,
      menuItemId: restaurantOrderItemsTable.menuItemId,
      name: restaurantOrderItemsTable.name,
      quantity: restaurantOrderItemsTable.quantity,
      unitPrice: restaurantOrderItemsTable.unitPrice,
      total: restaurantOrderItemsTable.total,
      isComplimentary: restaurantOrderItemsTable.isComplimentary,
      notes: restaurantOrderItemsTable.notes,
      kitchenStatus: restaurantOrderItemsTable.kitchenStatus,
      roundNumber: restaurantOrderItemsTable.roundNumber,
      station: restaurantOrderItemsTable.station,
      itemCategory: menuItemsTable.category,
      itemKitchenSection: menuItemsTable.kitchenSection,
    })
    .from(restaurantOrderItemsTable)
    .leftJoin(menuItemsTable, eq(restaurantOrderItemsTable.menuItemId, menuItemsTable.id))
    .where(eq(restaurantOrderItemsTable.orderId, orderId))
    .orderBy(asc(restaurantOrderItemsTable.roundNumber), asc(restaurantOrderItemsTable.name));

  return rows.map((r) => {
    const canonical = resolveCanonicalStation(r.itemKitchenSection || r.station, r.itemCategory);
    return {
      id: r.id,
      orderId: r.orderId,
      menuItemId: r.menuItemId,
      name: r.name,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      total: r.total,
      isComplimentary: r.isComplimentary,
      notes: r.notes,
      kitchenStatus: r.kitchenStatus || 'pending',
      roundNumber: r.roundNumber || 1,
      station: r.station || canonical,
      category: r.itemCategory || null,
      kitchenSection: r.itemKitchenSection || null,
    };
  });
};

@Injectable()
export class RestaurantService {
  constructor(
    @Optional() private readonly eventBus?: EventBusService,
  ) {}
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
    const nameMap = new Map(itemRows.map((i) => [i.name.toLowerCase().trim(), i]));

    const diningCase = b.diningCase || (b.orderType === 'room_service' ? 'room_service' : b.roomId ? 'in_house_table' : 'walk_in');
    const settlementType = b.settlementType || (b.isComplimentary ? 'complimentary_breakfast' : b.orderType === 'room_charge' ? 'room_charge' : 'direct_payment');

    // Auto-resolve roomId, reservationId, guestId, and guestName if roomNumber is provided
    let roomId = b.roomId ?? null;
    let reservationId = b.reservationId ?? null;
    let guestId = b.guestId ?? null;
    let guestName = b.guestName ?? null;

    if (!roomId && b.roomNumber) {
      try {
        const roomRows = await db
          .select()
          .from(roomsTable)
          .where(or(eq(roomsTable.number, String(b.roomNumber)), eq(roomsTable.roomName, String(b.roomNumber))))
          .limit(1);
        if (roomRows.length > 0) {
          roomId = roomRows[0].id;
          const activeRes = await db
            .select()
            .from(reservationsTable)
            .where(and(eq(reservationsTable.roomId, roomId), eq(reservationsTable.status, 'checked_in')))
            .limit(1);
          if (activeRes.length > 0) {
            reservationId = reservationId || activeRes[0].id;
            guestId = guestId || activeRes[0].guestId;
            if (!guestName && activeRes[0].guestId) {
              const guestRow = await db
                .select()
                .from(guestsTable)
                .where(eq(guestsTable.id, activeRes[0].guestId))
                .limit(1);
              if (guestRow.length > 0) {
                guestName = `${guestRow[0].firstName} ${guestRow[0].lastName}`.trim();
              }
            }
          }
        }
      } catch (err) {
        console.warn('Room/resident lookup warning:', err);
      }
    }

    let grossSubtotal = 0;
    let complimentaryDiscountAmount = 0;
    const ois: any[] = [];

    for (const item of (b.items ?? []) as any[]) {
      let mi = item.menuItemId ? menuMap.get(item.menuItemId) : undefined;

      // 1. If not found by menuItemId, try by exact name
      if (!mi && item.name) {
        mi = nameMap.get(item.name.toLowerCase().trim());
      }

      // 2. If not found, try stripped name (without parentheses, custom prefix, etc.)
      if (!mi) {
        const candidateRaw = (item.name || (typeof item.menuItemId === 'string' ? item.menuItemId.replace(/^custom-/, '') : '')).trim();
        const cleanCandidate = candidateRaw.replace(/\(.*?\)/g, '').trim().toLowerCase();
        if (cleanCandidate) {
          for (const row of itemRows) {
            const rowClean = row.name.replace(/\(.*?\)/g, '').trim().toLowerCase();
            if (rowClean === cleanCandidate || row.name.toLowerCase().includes(cleanCandidate) || cleanCandidate.includes(rowClean)) {
              mi = row;
              break;
            }
          }
        }
      }

      // 3. If still not found, create/persist a menu item row on the fly to fulfill foreign key constraints
      if (!mi) {
        const rawName = (item.name || (typeof item.menuItemId === 'string' ? item.menuItemId.replace(/^custom-/, '') : 'Special Item')).trim();
        const priceVal = item.price ?? item.unitPrice ?? 250;
        const validCategories = ['breakfast', 'lunch', 'dinner', 'drinks', 'dessert', 'coffee', 'juice', 'fast_food', 'traditional', 'other'];
        const cat = item.category && validCategories.includes(item.category) ? item.category : 'traditional';
        const validSections = ['hot', 'cold', 'bakery', 'bar', 'grill', 'salad', 'other'];
        const station = item.station && validSections.includes(item.station) ? item.station : 'hot';

        try {
          const [createdMi] = await db
            .insert(menuItemsTable)
            .values({
              name: rawName,
              category: cat as any,
              kitchenSection: station as any,
              price: String(Number(priceVal).toFixed(2)),
              preparationTime: 15,
              isAvailable: true,
              isActive: true,
            })
            .returning();
          mi = createdMi;
          menuMap.set(mi.id, mi);
          nameMap.set(mi.name.toLowerCase().trim(), mi);
        } catch (insertErr) {
          // Fallback if insertion fails: pick first available item to avoid foreign key violation
          mi = itemRows[0];
        }
      }

      if (!mi) {
        throw new BadRequestException(`Unable to resolve or initialize menu item for ${item.name || item.menuItemId}`);
      }

      item.menuItemId = mi.id;
      const unitPrice = item.price ?? item.unitPrice ?? parseFloat(mi.price as string);
      const qty = item.quantity || 1;
      const lt = parseFloat(String(unitPrice)) * qty;
      grossSubtotal += lt;

      // Check if item is complimentary breakfast for In-House table guest
      const isBreakfast = (mi.category || '').toLowerCase() === 'breakfast';
      const isItemComplimentary =
        item.isComplimentary ||
        (diningCase === 'in_house_table' && settlementType === 'complimentary_breakfast' && isBreakfast);

      if (isItemComplimentary) {
        complimentaryDiscountAmount += lt;
      }

      const canonicalStation = resolveCanonicalStation(mi.kitchenSection, mi.category, item.name || mi.name);
      ois.push({
        menuItemId: mi.id,
        name: item.name || mi.name,
        quantity: qty,
        unitPrice: String(parseFloat(String(unitPrice)).toFixed(2)),
        total: String(lt.toFixed(2)),
        isComplimentary: isItemComplimentary,
        notes: item.notes ?? null,
        kitchenStatus: 'pending',
        roundNumber: 1,
        station: item.station || canonicalStation,
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

    const routedVia = b.routedVia || 'coordinator';
    let coordinatorId = b.coordinatorId ?? null;
    let coordinatorStatus = b.coordinatorStatus;

    if (!coordinatorStatus) {
      coordinatorStatus = routedVia === 'direct_kitchen' ? 'bypassed' : 'pending';
    }

    if (!coordinatorId && routedVia === 'coordinator') {
      try {
        const coords = await this.getCoordinators();
        if (coords && coords.length > 0) {
          const sorted = [...coords].sort((a, b) => a.activeOrdersCount - b.activeOrdersCount);
          coordinatorId = sorted[0].id;
        }
      } catch (err) {
        console.error('Failed to auto-resolve coordinator:', err);
      }
    }

    const [order] = await db
      .insert(restaurantOrdersTable)
      .values({
        orderNumber,
        tableNumber: b.tableNumber ? Number(b.tableNumber) : null,
        tableId: b.tableId ? b.tableId : null,
        orderType: diningCase === 'room_service' ? 'room_service' : b.orderType ?? (roomId ? 'room_charge' : 'dine_in'),
        diningCase,
        settlementType,
        complimentaryDiscountAmount: String(complimentaryDiscountAmount.toFixed(2)),
        reservationId: reservationId ? reservationId : null,
        guestId: guestId ? guestId : null,
        roomId: roomId ? roomId : null,
        waiterId: b.waiterId ? b.waiterId : null,
        coordinatorId: coordinatorId ? coordinatorId : null,
        kitchenOfficerId: b.kitchenOfficerId ? b.kitchenOfficerId : null,
        routedVia: routedVia,
        coordinatorStatus: coordinatorStatus,
        coordinatorNotes: b.coordinatorNotes ?? null,
        guestName: guestName ?? null,
        status: 'pending',
        subtotal: String(grossSubtotal.toFixed(2)),
        taxAmount: String(taxAmount.toFixed(2)),
        serviceChargeAmount: String(serviceChargeAmount.toFixed(2)),
        discountAmount: String((b.discountAmount ?? 0).toFixed(2)),
        totalAmount: String(totalAmount.toFixed(2)),
        paymentStatus: settlementType === 'complimentary_breakfast' && totalAmount === 0 ? 'paid' : (b.paymentStatus ?? 'pending'),
        paymentMethod: settlementType === 'complimentary_breakfast' ? 'complimentary' : b.paymentMethod ?? null,
        pacingPreference: b.pacingPreference ?? 'drinks_first',
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
    if (diningCase === 'in_house_table' && complimentaryDiscountAmount > 0 && roomId) {
      const todayStr = new Date().toISOString().slice(0, 10);
      try {
        await db.insert(dailyMealClaimsTable).values({
          roomId: roomId,
          roomNumber: String(b.roomNumber || roomId),
          reservationId: reservationId ?? null,
          guestId: guestId ?? null,
          guestName: guestName ?? null,
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
    if ((settlementType === 'room_charge' || diningCase === 'room_service') && totalAmount > 0 && (reservationId || guestId)) {
      try {
        let invoice: any = null;
        if (reservationId) {
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
      'pacingPreference',
    ]) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (u.routedVia === 'coordinator') {
      if (!u.coordinatorStatus) u.coordinatorStatus = 'pending';
      if (!u.coordinatorId) {
        try {
          const coords = await this.getCoordinators();
          if (coords && coords.length > 0) {
            const sorted = [...coords].sort((a, b) => a.activeOrdersCount - b.activeOrdersCount);
            u.coordinatorId = sorted[0].id;
          }
        } catch (err) {}
      }
    }
    if (b.status === 'served') u.servedAt = new Date();
    if (b.status === 'ready' && !b.readyAt) u.readyAt = new Date();
    if (b.status === 'plated' && !b.platedAt) u.platedAt = new Date();
    if (b.coordinatorStatus === 'dispatched' && !b.dispatchedAt) u.dispatchedAt = new Date();

    let [o] = await db
      .update(restaurantOrdersTable)
      .set(u)
      .where(or(eq(restaurantOrdersTable.id, id), eq(restaurantOrdersTable.orderNumber, id)))
      .returning();

    if (!o && (id.startsWith('ticket-') || id.startsWith('ORD-') || /^\d+$/.test(id))) {
      const orderNum = id.startsWith('ticket-') ? id.replace('ticket-', '') : id;
      const [inserted] = await db
        .insert(restaurantOrdersTable)
        .values({
          id,
          orderNumber: orderNum,
          diningCase: 'walk_in',
          status: b.status || 'pending',
          ...u,
        })
        .returning();
      o = inserted;
    }

    if (!o) throw new NotFoundException(`Order ${id} not found`);

    if (o.tableId && (b.status === 'served' || b.status === 'cancelled')) {
      await db
        .update(restaurantTablesTable)
        .set({ status: 'available', currentOrderId: null })
        .where(eq(restaurantTablesTable.id, o.tableId));
    }

    const items = await fetchItems(o.id);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(o, items)]);
    return enriched;
  }

  async getKitchenOrders() {
    const orders = await db
      .select()
      .from(restaurantOrdersTable)
      .where(
        and(
          inArray(restaurantOrdersTable.status, ['pending', 'preparing', 'cooking', 'partially_ready', 'partially_served', 'ready', 'plated'] as any[]),
          eq(restaurantOrdersTable.isActive, true),
        ),
      )
      .orderBy(asc(restaurantOrdersTable.createdAt));

    const result = [];
    for (const o of orders) {
      const items = await fetchItems(o.id);
      // Strictly exclude beverage stations (bar, coffee, juice) from Kitchen Officer view
      const foodItems = items.filter((i) => !['bar', 'coffee', 'juice'].includes(i.station));
      if (foodItems.length > 0) {
        result.push(fmtOrder(o, foodItems));
      }
    }
    return enrichOrdersWithUserNames(result);
  }

  async getBarOrders() {
    const orders = await db
      .select()
      .from(restaurantOrdersTable)
      .where(
        and(
          inArray(restaurantOrdersTable.status, ['pending', 'preparing', 'cooking', 'partially_ready', 'partially_served', 'ready', 'plated'] as any[]),
          eq(restaurantOrdersTable.isActive, true),
        ),
      )
      .orderBy(asc(restaurantOrdersTable.createdAt));

    const result = [];
    for (const o of orders) {
      const items = await fetchItems(o.id);
      // Strictly include only bar/drink items for the Bar Man view
      const drinkItems = items.filter((i) => i.station === 'bar');
      if (drinkItems.length > 0) {
        result.push(fmtOrder(o, drinkItems));
      }
    }
    return enrichOrdersWithUserNames(result);
  }

  async getCoffeeOrders() {
    const orders = await db
      .select()
      .from(restaurantOrdersTable)
      .where(
        and(
          inArray(restaurantOrdersTable.status, ['pending', 'preparing', 'cooking', 'partially_ready', 'partially_served', 'ready', 'plated'] as any[]),
          eq(restaurantOrdersTable.isActive, true),
        ),
      )
      .orderBy(asc(restaurantOrdersTable.createdAt));

    const result = [];
    for (const o of orders) {
      const items = await fetchItems(o.id);
      const coffeeItems = items.filter((i) => i.station === 'coffee');
      if (coffeeItems.length > 0) {
        result.push(fmtOrder(o, coffeeItems));
      }
    }
    return enrichOrdersWithUserNames(result);
  }

  async getBeverageOrders() {
    const orders = await db
      .select()
      .from(restaurantOrdersTable)
      .where(
        and(
          inArray(restaurantOrdersTable.status, ['pending', 'preparing', 'cooking', 'partially_ready', 'partially_served', 'ready', 'plated'] as any[]),
          eq(restaurantOrdersTable.isActive, true),
        ),
      )
      .orderBy(asc(restaurantOrdersTable.createdAt));

    const result = [];
    for (const o of orders) {
      const items = await fetchItems(o.id);
      const juiceItems = items.filter((i) => i.station === 'juice');
      if (juiceItems.length > 0) {
        result.push(fmtOrder(o, juiceItems));
      }
    }
    return enrichOrdersWithUserNames(result);
  }

  async startPrep(orderId: string, stationSource: 'kitchen' | 'bar' | 'coffee' | 'juice', notes?: string) {
    let [o] = await db
      .select()
      .from(restaurantOrdersTable)
      .where(or(eq(restaurantOrdersTable.id, orderId), eq(restaurantOrdersTable.orderNumber, orderId)));
    if (!o) throw new NotFoundException(`Order ${orderId} not found`);

    const allItems = await fetchItems(o.id);
    const targetItems = allItems.filter((i) => {
      if (stationSource === 'bar') return i.station === 'bar';
      if (stationSource === 'coffee') return i.station === 'coffee';
      if (stationSource === 'juice') return i.station === 'juice';
      return !['bar', 'coffee', 'juice'].includes(i.station);
    });

    for (const it of targetItems) {
      if (it.kitchenStatus === 'pending') {
        await db
          .update(restaurantOrderItemsTable)
          .set({ kitchenStatus: 'cooking' })
          .where(eq(restaurantOrderItemsTable.id, it.id));
      }
    }

    if (o.status === 'pending') {
      await db
        .update(restaurantOrdersTable)
        .set({ status: 'cooking' })
        .where(eq(restaurantOrdersTable.id, o.id));
    }

    const items = await fetchItems(o.id);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(o, items)]);
    return enriched;
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

  async getWaiters() {
    const [role] = await db.select().from(rolesTable).where(sql`lower(${rolesTable.name}) = 'waiter'`);
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

    const tableCounts = await db
      .select({
        waiterId: restaurantTablesTable.waiterId,
        count: sql<number>`count(*)::int`,
      })
      .from(restaurantTablesTable)
      .where(and(eq(restaurantTablesTable.isActive, true), sql`${restaurantTablesTable.waiterId} IS NOT NULL`))
      .groupBy(restaurantTablesTable.waiterId);
    const tableCountMap = new Map(tableCounts.map((t) => [t.waiterId, t.count]));

    const activeOrderCounts = await db
      .select({
        waiterId: restaurantOrdersTable.waiterId,
        count: sql<number>`count(*)::int`,
      })
      .from(restaurantOrdersTable)
      .where(
        and(
          inArray(restaurantOrdersTable.status, ['pending', 'preparing', 'partially_ready', 'ready', 'partially_served'] as any[]),
          eq(restaurantOrdersTable.isActive, true),
        ),
      )
      .groupBy(restaurantOrdersTable.waiterId);
    const activeOrderCountMap = new Map(activeOrderCounts.map((o) => [o.waiterId, o.count]));

    return users.map((u) => ({
      ...u,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      assignedTablesCount: tableCountMap.get(u.id) || 0,
      activeOrdersCount: activeOrderCountMap.get(u.id) || 0,
    }));
  }

  async assignWaiterToSection(section: string, waiterId: string | null) {
    await db
      .update(restaurantTablesTable)
      .set({ waiterId: waiterId ?? null })
      .where(eq(restaurantTablesTable.section, section));

    return this.getTables({ section });
  }

  async dispatchToKitchen(orderId: string, coordinatorId?: string, notes?: string) {
    const u: any = {
      status: 'preparing',
      coordinatorStatus: 'dispatched',
      dispatchedAt: new Date(),
    };
    if (coordinatorId) u.coordinatorId = coordinatorId;
    if (notes) u.coordinatorNotes = notes;

    let [o] = await db
      .update(restaurantOrdersTable)
      .set(u)
      .where(or(eq(restaurantOrdersTable.id, orderId), eq(restaurantOrdersTable.orderNumber, orderId)))
      .returning();

    if (!o && (orderId.startsWith('ticket-') || orderId.startsWith('ORD-') || /^\d+$/.test(orderId))) {
      const orderNum = orderId.startsWith('ticket-') ? orderId.replace('ticket-', '') : orderId;
      const [inserted] = await db
        .insert(restaurantOrdersTable)
        .values({
          id: orderId,
          orderNumber: orderNum,
          diningCase: 'walk_in',
          status: 'pending',
          ...u,
        })
        .returning();
      o = inserted;
    }

    if (!o) throw new NotFoundException(`Order ${orderId} not found`);
    const items = await fetchItems(o.id);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(o, items)]);
    return enriched;
  }

  async notifyReady(
    orderId: string,
    notifiedParty: 'waiter' | 'coordinator' = 'waiter',
    kitchenOfficerId?: string,
    notes?: string,
    readyItemIds?: string[],
    stationSource?: 'kitchen' | 'bar' | 'coffee' | 'juice',
    targetStatus?: 'ready' | 'plated',
  ) {
    let [o] = await db
      .select()
      .from(restaurantOrdersTable)
      .where(or(eq(restaurantOrdersTable.id, orderId), eq(restaurantOrdersTable.orderNumber, orderId)));

    if (!o && (orderId.startsWith('ticket-') || orderId.startsWith('ORD-') || /^\d+$/.test(orderId))) {
      const orderNum = orderId.startsWith('ticket-') ? orderId.replace('ticket-', '') : orderId;
      const [inserted] = await db
        .insert(restaurantOrdersTable)
        .values({
          id: orderId,
          orderNumber: orderNum,
          diningCase: 'walk_in',
          status: targetStatus || 'ready',
          notifiedParty,
          kitchenOfficerId: kitchenOfficerId || null,
          kitchenNotes: notes || null,
          readyAt: new Date(),
          ...(targetStatus === 'plated' ? { platedAt: new Date() } : {}),
        })
        .returning();
      o = inserted;
    }

    if (!o) throw new NotFoundException(`Order ${orderId} not found`);

    const allItems = await fetchItems(o.id);
    const activeItems = allItems.filter((i) => i.kitchenStatus !== 'cancelled');

    // Determine target items by stationSource or readyItemIds
    let itemsToMarkReady: any[] = [];
    if (readyItemIds && Array.isArray(readyItemIds) && readyItemIds.length > 0) {
      itemsToMarkReady = activeItems.filter((i) => readyItemIds.includes(i.id));
    } else if (stationSource === 'bar') {
      itemsToMarkReady = activeItems.filter((i) => i.station === 'bar');
    } else if (stationSource === 'coffee') {
      itemsToMarkReady = activeItems.filter((i) => i.station === 'coffee');
    } else if (stationSource === 'juice') {
      itemsToMarkReady = activeItems.filter((i) => i.station === 'juice');
    } else if (stationSource === 'kitchen') {
      itemsToMarkReady = activeItems.filter((i) => !['bar', 'coffee', 'juice'].includes(i.station));
    } else {
      itemsToMarkReady = activeItems;
    }

    const itemNextStatus = targetStatus === 'plated' ? 'plated' : 'ready';

    for (const it of activeItems) {
      if (itemsToMarkReady.some((r) => r.id === it.id)) {
        await db
          .update(restaurantOrderItemsTable)
          .set({ kitchenStatus: itemNextStatus })
          .where(eq(restaurantOrderItemsTable.id, it.id));
      } else if (it.kitchenStatus === 'pending') {
        // If remaining items were pending, transition them to cooking/preparing
        await db
          .update(restaurantOrderItemsTable)
          .set({ kitchenStatus: 'preparing' })
          .where(eq(restaurantOrderItemsTable.id, it.id));
      }
    }

    // Refresh items to see if all active items are now ready or plated
    const updatedItems = await fetchItems(o.id);
    const allActiveReady = updatedItems
      .filter((i) => i.kitchenStatus !== 'cancelled')
      .every((i) => i.kitchenStatus === 'ready' || i.kitchenStatus === 'plated' || i.kitchenStatus === 'served');

    const finalStatus: 'ready' | 'partially_ready' | 'plated' = targetStatus === 'plated'
      ? 'plated'
      : (allActiveReady ? 'ready' : 'partially_ready');

    const u: any = {
      status: finalStatus,
      notifiedParty,
      readyAt: o.readyAt || new Date(),
    };
    if (finalStatus === 'plated') {
      u.platedAt = new Date();
    }
    if (kitchenOfficerId) u.kitchenOfficerId = kitchenOfficerId;
    if (notes) u.kitchenNotes = notes;

    const [updated] = await db
      .update(restaurantOrdersTable)
      .set(u)
      .where(eq(restaurantOrdersTable.id, o.id))
      .returning();

    let notifyTitle = finalStatus === 'plated' ? `Plated Food Ready at Kitchen Pass 🍽️` : `Food Cooked & Ready at Station 🛎️`;
    let notifyMsg = `Plated dishes for Table #${updated.tableNumber || '-'} are ready at the Kitchen Pass!`;

    const isBar = stationSource === 'bar' || (itemsToMarkReady.length > 0 && itemsToMarkReady.every((i) => i.station === 'bar'));
    const isCoffee = stationSource === 'coffee' || (itemsToMarkReady.length > 0 && itemsToMarkReady.every((i) => i.station === 'coffee'));
    const isJuice = stationSource === 'juice' || (itemsToMarkReady.length > 0 && itemsToMarkReady.every((i) => i.station === 'juice'));

    const tableLabel = updated.tableNumber ? `Table #${updated.tableNumber}` : `Room ${(updated as any).roomNumber || '-'}`;

    if (isBar) {
      notifyTitle = `Drinks Ready at Bar Pass 🍸`;
      notifyMsg = `Cocktails and drinks for ${tableLabel} are ready at the Bar Pass!`;
    } else if (isCoffee) {
      notifyTitle = `Coffee & Tea Ready at Coffee Pass ☕`;
      notifyMsg = `Ethiopian Buna and coffees for ${tableLabel} are brewed and ready at the Coffee Pass!`;
    } else if (isJuice) {
      notifyTitle = `Juices & Soft Drinks Ready at Beverage Pass 🧃`;
      notifyMsg = `Fresh juices and soft drinks for ${tableLabel} are ready at the Beverage Pass!`;
    }

    const targetUserId = updated.waiterId || updated.coordinatorId;
    if (targetUserId) {
      try {
        await db.insert(notificationsTable).values({
          userId: targetUserId,
          type: 'restaurant_ready',
          title: notifyTitle,
          message: notifyMsg,
          resourceType: 'restaurant_order',
          resourceId: updated.id,
        });
      } catch (err) {}
    }

    const items = await fetchItems(updated.id);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(updated, items)]);
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

  async updateItemStatus(orderId: string, itemId: string, kitchenStatus: string, notes?: string) {
    const validStatuses = ['pending', 'preparing', 'cooking', 'ready', 'plated', 'served', 'cancelled'];
    if (!validStatuses.includes(kitchenStatus)) {
      throw new BadRequestException(`Invalid kitchen status: ${kitchenStatus}`);
    }

    // 1. Locate order (by ID or orderNumber)
    let [order] = await db
      .select()
      .from(restaurantOrdersTable)
      .where(or(eq(restaurantOrdersTable.id, orderId), eq(restaurantOrdersTable.orderNumber, orderId)));

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // 2. Update the specific item
    const updateFields: any = { kitchenStatus };
    if (notes) updateFields.notes = notes;

    const [updatedItem] = await db
      .update(restaurantOrderItemsTable)
      .set(updateFields)
      .where(and(eq(restaurantOrderItemsTable.id, itemId), eq(restaurantOrderItemsTable.orderId, order.id)))
      .returning();

    if (!updatedItem) {
      throw new NotFoundException(`Item ${itemId} not found in order ${order.id}`);
    }

    // 3. Fetch all active items to calculate composite order status
    const allItems = await fetchItems(order.id);
    const activeItems = allItems.filter((i) => i.kitchenStatus !== 'cancelled');

    let compositeStatus = order.status;
    const allServed = activeItems.length > 0 && activeItems.every((i) => i.kitchenStatus === 'served');
    const allPlated = activeItems.length > 0 && activeItems.every((i) => i.kitchenStatus === 'plated' || i.kitchenStatus === 'served');
    const allReadyOrPlatedOrServed = activeItems.length > 0 && activeItems.every((i) => i.kitchenStatus === 'ready' || i.kitchenStatus === 'plated' || i.kitchenStatus === 'served');
    const anyServed = activeItems.some((i) => i.kitchenStatus === 'served');
    const anyPlated = activeItems.some((i) => i.kitchenStatus === 'plated');
    const anyReady = activeItems.some((i) => i.kitchenStatus === 'ready');
    const anyCooking = activeItems.some((i) => i.kitchenStatus === 'preparing' || i.kitchenStatus === 'cooking');

    if (allServed) {
      compositeStatus = 'served';
    } else if (allPlated && anyPlated) {
      compositeStatus = 'plated';
    } else if (allReadyOrPlatedOrServed && anyReady) {
      compositeStatus = 'ready';
    } else if (anyServed && (anyCooking || activeItems.some((i) => i.kitchenStatus === 'pending'))) {
      compositeStatus = 'partially_served';
    } else if ((anyPlated || anyReady) && (anyCooking || activeItems.some((i) => i.kitchenStatus === 'pending'))) {
      compositeStatus = 'partially_ready';
    } else if (anyCooking) {
      compositeStatus = 'cooking';
    }

    const orderUpdate: any = { status: compositeStatus as any };
    if (compositeStatus === 'served' && !order.servedAt) orderUpdate.servedAt = new Date();
    if (compositeStatus === 'plated' && !order.platedAt) orderUpdate.platedAt = new Date();
    if (compositeStatus === 'ready' && !order.readyAt) orderUpdate.readyAt = new Date();

    const [updatedOrder] = await db
      .update(restaurantOrdersTable)
      .set(orderUpdate)
      .where(eq(restaurantOrdersTable.id, order.id))
      .returning();

    // 4. Send notification if item or order reached ready
    if (kitchenStatus === 'ready' || compositeStatus === 'ready') {
      const targetUserId = updatedOrder.waiterId || updatedOrder.coordinatorId;
      if (targetUserId) {
        try {
          await db.insert(notificationsTable).values({
            userId: targetUserId,
            type: 'restaurant_ready',
            title: kitchenStatus === 'ready' ? `Dish Ready: ${updatedItem.name} 🛎️` : `Order #${updatedOrder.orderNumber} Ready 🛎️`,
            message: `${updatedItem.name} for ${updatedOrder.diningCase === 'room_service' ? 'Room Service' : `Table ${updatedOrder.tableNumber ?? '-'}`} is ready at the pass!`,
            resourceType: 'restaurant_order',
            resourceId: order.id,
          });
        } catch (err) {}
      }
      this.eventBus?.publish('notification.push', {
        type: 'restaurant_ready',
        orderId: order.id,
        itemId,
        dishName: updatedItem.name,
      });
    }

    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(updatedOrder, allItems)]);
    return enriched;
  }

  async appendItemsToOrder(orderId: string, b: { items: any[]; roundNumber?: number; notes?: string }) {
    const [order] = await db
      .select()
      .from(restaurantOrdersTable)
      .where(or(eq(restaurantOrdersTable.id, orderId), eq(restaurantOrdersTable.orderNumber, orderId)));

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (['cancelled'].includes(order.status)) {
      throw new BadRequestException(`Cannot add items to a cancelled order.`);
    }

    const existingItems = await fetchItems(order.id);
    const maxRound = existingItems.reduce((max, it) => Math.max(max, it.roundNumber || 1), 1);
    const nextRound = b.roundNumber || (maxRound + 1);

    const itemRows = await db
      .select()
      .from(menuItemsTable)
      .where(and(eq(menuItemsTable.isAvailable, true), eq(menuItemsTable.isActive, true)));
    const menuMap = new Map(itemRows.map((i) => [i.id, i]));
    const nameMap = new Map(itemRows.map((i) => [i.name.toLowerCase().trim(), i]));

    let additionalSubtotal = 0;
    const newOrderItems: any[] = [];

    for (const item of (b.items || []) as any[]) {
      let mi = item.menuItemId ? menuMap.get(item.menuItemId) : undefined;
      if (!mi && item.name) {
        mi = nameMap.get(item.name.toLowerCase().trim());
      }
      if (!mi) {
        mi = itemRows[0];
      }

      const unitPrice = item.price ?? item.unitPrice ?? parseFloat((mi?.price as string) ?? '18');
      const qty = item.quantity || 1;
      const lt = parseFloat(String(unitPrice)) * qty;
      additionalSubtotal += lt;

      const canonicalStation = resolveCanonicalStation(mi?.kitchenSection, mi?.category);

      newOrderItems.push({
        orderId: order.id,
        menuItemId: mi ? mi.id : itemRows[0].id,
        name: item.name || mi?.name || 'Item',
        quantity: qty,
        unitPrice: String(parseFloat(String(unitPrice)).toFixed(2)),
        total: String(lt.toFixed(2)),
        isComplimentary: false,
        notes: item.notes ?? null,
        kitchenStatus: 'pending',
        roundNumber: nextRound,
        station: item.station || canonicalStation,
      });
    }

    for (const oi of newOrderItems) {
      await db.insert(restaurantOrderItemsTable).values(oi);
    }

    // Recalculate totals
    const oldSubtotal = parseFloat(order.subtotal || '0');
    const oldComplimentary = parseFloat(order.complimentaryDiscountAmount || '0');
    const newGrossSubtotal = oldSubtotal + additionalSubtotal;
    const chargeableSubtotal = Math.max(0, newGrossSubtotal - oldComplimentary - parseFloat(order.discountAmount || '0'));
    const taxRate = 0.1;
    const serviceRate = order.diningCase === 'room_service' ? 0.1 : 0.05;
    const newTax = chargeableSubtotal * taxRate;
    const newService = chargeableSubtotal * serviceRate;
    const newTotalAmount = chargeableSubtotal + newTax + newService;

    // Reset status to preparing or partially_served since new dishes are cooking
    const newStatus = order.status === 'served' ? 'partially_served' : 'preparing';

    const [updatedOrder] = await db
      .update(restaurantOrdersTable)
      .set({
        subtotal: String(newGrossSubtotal.toFixed(2)),
        taxAmount: String(newTax.toFixed(2)),
        serviceChargeAmount: String(newService.toFixed(2)),
        totalAmount: String(newTotalAmount.toFixed(2)),
        status: newStatus as any,
        notes: b.notes ? `${order.notes ? order.notes + ' • ' : ''}Round ${nextRound}: ${b.notes}` : order.notes,
      })
      .where(eq(restaurantOrdersTable.id, order.id))
      .returning();

    // If attached to a guest stay invoice, auto-update folio with added round
    if ((order.settlementType === 'room_charge' || order.diningCase === 'room_service') && (order.reservationId || order.guestId)) {
      try {
        const [invoice] = await db
          .select()
          .from(invoicesTable)
          .where(
            and(
              or(eq(invoicesTable.reservationId, order.reservationId!), eq(invoicesTable.guestId, order.guestId!)),
              or(eq(invoicesTable.status, 'draft'), eq(invoicesTable.status, 'issued')),
            ),
          )
          .orderBy(desc(invoicesTable.createdAt))
          .limit(1);

        if (invoice) {
          const descText = `In-Room Dining Order #${order.orderNumber} (Round ${nextRound} Additions)`;
          await db.insert(invoiceLineItemsTable).values({
            invoiceId: invoice.id,
            description: descText,
            quantity: '1',
            unitPrice: String((additionalSubtotal * 1.15).toFixed(2)),
            total: String((additionalSubtotal * 1.15).toFixed(2)),
          });
          const currSub = parseFloat(invoice.subtotal || '0') + additionalSubtotal * 1.15;
          const currTot = parseFloat(invoice.totalAmount || '0') + additionalSubtotal * 1.15;
          await db
            .update(invoicesTable)
            .set({ subtotal: String(currSub.toFixed(2)), totalAmount: String(currTot.toFixed(2)) })
            .where(eq(invoicesTable.id, invoice.id));
        }
      } catch (folioErr) {
        console.error('Failed to update invoice folio for added round:', folioErr);
      }
    }

    const items = await fetchItems(order.id);
    const [enriched] = await enrichOrdersWithUserNames([fmtOrder(updatedOrder, items)]);
    return enriched;
  }
}
