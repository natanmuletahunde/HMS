import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  roomServiceRequestsTable,
  roomServiceItemsTable,
  guestsTable,
  roomsTable,
  usersTable,
  invoicesTable,
  invoiceLineItemsTable,
  reservationsTable,
} from '@workspace/db';

const rsCols = getTableColumns(roomServiceRequestsTable);

const joinedFields = {
  ...rsCols,
  guestFirstName: guestsTable.firstName,
  guestLastName: guestsTable.lastName,
  roomNumberCol: roomsTable.number,
  assignedToName: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
};

const base = () =>
  db
    .select(joinedFields)
    .from(roomServiceRequestsTable)
    .leftJoin(guestsTable, eq(roomServiceRequestsTable.guestId, guestsTable.id))
    .leftJoin(roomsTable, eq(roomServiceRequestsTable.roomId, roomsTable.id))
    .leftJoin(usersTable, eq(roomServiceRequestsTable.assignedToId, usersTable.id));

const fmt = (r: any) => ({
  ...r,
  guestFirstName: r.guestFirstName ?? null,
  guestLastName: r.guestLastName ?? null,
  assignedToName: r.assignedToName ?? null,
  description: r.description ?? null,
  specialInstructions: r.specialInstructions ?? null,
  notes: r.notes ?? null,
  cancelReason: r.cancelReason ?? null,
  chargeAmount: r.chargeAmount != null ? parseFloat(r.chargeAmount) : 0,
  estimatedCompletion: r.estimatedCompletion?.toISOString() ?? null,
  actualCompletion: r.actualCompletion?.toISOString() ?? null,
  createdAt: r.createdAt?.toISOString() ?? null,
  updatedAt: r.updatedAt?.toISOString() ?? null,
});

const getDepartment = (serviceType: string): string => {
  if (['food', 'drinks'].includes(serviceType)) return 'restaurant';
  if (serviceType === 'laundry') return 'laundry';
  if (serviceType === 'spa') return 'spa';
  if (['taxi', 'airport_pickup', 'airport_dropoff'].includes(serviceType)) return 'transport';
  if (serviceType === 'housekeeping') return 'housekeeping';
  if (serviceType === 'maintenance') return 'maintenance';
  return 'reception';
};

const getSla = (serviceType: string): number => {
  if (['food', 'drinks'].includes(serviceType)) return 30;
  if (serviceType === 'laundry') return 120;
  if (serviceType === 'spa') return 60;
  if (['taxi', 'airport_pickup', 'airport_dropoff'].includes(serviceType)) return 60;
  if (serviceType === 'housekeeping') return 45;
  if (serviceType === 'maintenance') return 90;
  return 30;
};

@Injectable()
export class RoomServiceService {
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const [statusRows, todayRows] = await Promise.all([
      db
        .select({ status: roomServiceRequestsTable.status, count: sql<number>`count(*)::int` })
        .from(roomServiceRequestsTable)
        .groupBy(roomServiceRequestsTable.status),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(roomServiceRequestsTable)
        .where(sql`date(${roomServiceRequestsTable.createdAt}) = ${today}`),
    ]);

    const s: any = { total: 0, requested: 0, accepted: 0, assigned: 0, inProgress: 0, completed: 0, cancelled: 0, todayRequests: todayRows[0]?.count ?? 0 };
    for (const r of statusRows) {
      if (r.status === 'requested') s.requested = r.count;
      else if (r.status === 'accepted') s.accepted = r.count;
      else if (r.status === 'assigned') s.assigned = r.count;
      else if (r.status === 'in_progress') s.inProgress = r.count;
      else if (r.status === 'completed') s.completed = r.count;
      else if (r.status === 'cancelled') s.cancelled = r.count;
      s.total += r.count;
    }
    return s;
  }

  async findAll(q: any) {
    const conds: any[] = [];
    if (q.status) conds.push(eq(roomServiceRequestsTable.status, q.status));
    if (q.serviceType) conds.push(eq(roomServiceRequestsTable.serviceType, q.serviceType));
    if (q.department) conds.push(eq(roomServiceRequestsTable.department, q.department));
    if (q.priority) conds.push(eq(roomServiceRequestsTable.priority, q.priority));
    if (q.reservationId) conds.push(eq(roomServiceRequestsTable.reservationId, q.reservationId));
    if (q.roomNumber) conds.push(eq(roomServiceRequestsTable.roomNumber, q.roomNumber));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(
        or(
          like(roomServiceRequestsTable.roomNumber, s),
          like(roomServiceRequestsTable.guestName, s),
        ),
      );
    }
    const rows = await base()
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(roomServiceRequestsTable.createdAt));
    return rows.map(fmt);
  }

  private async postChargeToInvoice(req: any, staffName?: string | null) {
    const amountToAdd = parseFloat(req.chargeAmount || '0');
    if (amountToAdd <= 0 || (!req.guestId && !req.reservationId)) return;

    // Check if line item already exists for this request
    const existingItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(like(invoiceLineItemsTable.description, `%${req.requestNumber}%`));
    if (existingItems.length > 0) return; // already posted to avoid double counting

    // Find open or draft invoice for reservation or guest
    let invoice: any = null;
    if (req.reservationId) {
      const [inv] = await db
        .select()
        .from(invoicesTable)
        .where(
          and(
            eq(invoicesTable.reservationId, req.reservationId),
            or(eq(invoicesTable.status, 'draft'), eq(invoicesTable.status, 'issued')),
          ),
        )
        .orderBy(desc(invoicesTable.createdAt))
        .limit(1);
      invoice = inv;
    }
    if (!invoice && req.guestId) {
      const [inv] = await db
        .select()
        .from(invoicesTable)
        .where(
          and(
            eq(invoicesTable.guestId, req.guestId),
            or(eq(invoicesTable.status, 'draft'), eq(invoicesTable.status, 'issued')),
          ),
        )
        .orderBy(desc(invoicesTable.createdAt))
        .limit(1);
      invoice = inv;
    }

    const isPhoneOrder = req.requestNumber?.startsWith('RS-PHONE-') || req.notes?.includes('[Phone Order');
    const sourceLabel = isPhoneOrder ? 'Phone Order (Reception)' : 'In-Room Online Portal';
    const staffLabel = staffName ? ` | Staff: ${staffName}` : '';
    const descText = `${sourceLabel} #${req.requestNumber} (${req.serviceType}: ${req.description || 'Service'})${staffLabel}`;

    if (invoice) {
      await db.insert(invoiceLineItemsTable).values({
        invoiceId: invoice.id,
        description: descText,
        quantity: '1',
        unitPrice: String(amountToAdd.toFixed(2)),
        total: String(amountToAdd.toFixed(2)),
      });

      const newSubtotal = parseFloat(invoice.subtotal || '0') + amountToAdd;
      const newTotal = parseFloat(invoice.totalAmount || '0') + amountToAdd;

      await db
        .update(invoicesTable)
        .set({
          subtotal: String(newSubtotal.toFixed(2)),
          totalAmount: String(newTotal.toFixed(2)),
        })
        .where(eq(invoicesTable.id, invoice.id));
    } else {
      const invoiceNumber = 'INV-' + Date.now().toString(36).toUpperCase();
      const [newInv] = await db
        .insert(invoicesTable)
        .values({
          invoiceNumber,
          guestId: req.guestId ?? null,
          reservationId: req.reservationId ?? null,
          subtotal: String(amountToAdd.toFixed(2)),
          taxAmount: '0.00',
          totalAmount: String(amountToAdd.toFixed(2)),
          status: 'draft',
          notes: `Stay folio with ${sourceLabel}`,
        })
        .returning();

      if (newInv) {
        await db.insert(invoiceLineItemsTable).values({
          invoiceId: newInv.id,
          description: descText,
          quantity: '1',
          unitPrice: String(amountToAdd.toFixed(2)),
          total: String(amountToAdd.toFixed(2)),
        });
      }
    }
  }

  async create(b: any) {
    const isPhone = b.orderSource === 'phone' || b.source === 'phone';
    const prefix = isPhone ? 'RS-PHONE-' : (b.orderSource === 'online' ? 'RS-GUEST-' : 'RS-');
    const requestNumber = prefix + Date.now().toString(36).toUpperCase();
    const department = (b.department || getDepartment(b.serviceType)) as any;
    const slaMinutes = getSla(b.serviceType);
    const estimatedCompletion = new Date(Date.now() + slaMinutes * 60000);
    const initialStatus = b.status || (b.assignedToId ? 'assigned' : 'requested');
    const notes = b.notes || (isPhone ? '[Phone Order logged by Receptionist]' : null);

    const [req] = await db
      .insert(roomServiceRequestsTable)
      .values({
        requestNumber,
        reservationId: b.reservationId ?? null,
        guestId: b.guestId ?? null,
        roomId: b.roomId ?? null,
        roomNumber: b.roomNumber ?? null,
        guestName: b.guestName ?? null,
        serviceType: b.serviceType,
        department,
        status: initialStatus,
        priority: b.priority ?? 'normal',
        description: b.description ?? null,
        specialInstructions: b.specialInstructions ?? null,
        assignedToId: b.assignedToId ?? null,
        slaMinutes,
        estimatedCompletion,
        chargeAmount: b.chargeAmount != null ? String(b.chargeAmount) : '0',
        chargeToRoom: b.chargeToRoom ?? false,
        notes,
      })
      .returning();

    // Insert items if provided
    if (b.items && Array.isArray(b.items) && b.items.length > 0) {
      for (const item of b.items as { menuItemId?: string; name: string; quantity: number; unitPrice?: number; notes?: string }[]) {
        const unitPrice = item.unitPrice ?? 0;
        await db.insert(roomServiceItemsTable).values({
          requestId: req.id,
          menuItemId: item.menuItemId ?? null,
          name: item.name,
          quantity: item.quantity ?? 1,
          unitPrice: String(unitPrice.toFixed(2)),
          total: String((unitPrice * (item.quantity ?? 1)).toFixed(2)),
          notes: item.notes ?? null,
        });
      }
    }

    const [row] = await base().where(eq(roomServiceRequestsTable.id, req.id));

    // If charged to room upon creation (standard for Reception Phone Orders), post to invoice immediately
    if (req.chargeToRoom && parseFloat(req.chargeAmount || '0') > 0) {
      await this.postChargeToInvoice(req, row?.assignedToName);
    }

    return fmt(row);
  }

  async findOne(id: string) {
    const [row] = await base().where(eq(roomServiceRequestsTable.id, id));
    if (!row) throw new NotFoundException(`Room service request ${id} not found`);
    const items = await db
      .select()
      .from(roomServiceItemsTable)
      .where(eq(roomServiceItemsTable.requestId, id));
    return { ...fmt(row), items };
  }

  async update(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'assignedToId', 'notes', 'priority', 'chargeAmount', 'paymentStatus', 'cancelReason', 'department']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.chargeAmount !== undefined) u.chargeAmount = String(b.chargeAmount);
    if (b.status === 'completed') u.actualCompletion = new Date();
    // Auto-progress to assigned if assignedToId is set on a requested task
    if (b.assignedToId && !b.status) {
      u.status = 'assigned';
    }

    const [req] = await db
      .update(roomServiceRequestsTable)
      .set(u)
      .where(eq(roomServiceRequestsTable.id, id))
      .returning();
    if (!req) throw new NotFoundException(`Room service request ${id} not found`);

    const [row] = await base().where(eq(roomServiceRequestsTable.id, id));

    // Sync folio billing when order is completed or charged to room
    if ((req.status === 'completed' || req.chargeToRoom) && parseFloat(req.chargeAmount || '0') > 0) {
      await this.postChargeToInvoice(req, row?.assignedToName);
    }

    return fmt(row);
  }
}
