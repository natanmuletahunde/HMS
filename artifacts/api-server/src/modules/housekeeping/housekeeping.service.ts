import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  housekeepingAssignmentsTable,
  cleaningAreasTable,
  cleaningInspectionsTable,
  preCheckoutInspectionsTable,
  reservationsTable,
  guestsTable,
  invoicesTable,
  invoiceLineItemsTable,
  notificationsTable,
  roomsTable,
  usersTable,
} from '@workspace/db';

const hkCols = getTableColumns(housekeepingAssignmentsTable);

const joinedFields = {
  ...hkCols,
  roomNumber: roomsTable.number,
  staffName: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
};

const base = () =>
  db
    .select(joinedFields)
    .from(housekeepingAssignmentsTable)
    .leftJoin(roomsTable, eq(housekeepingAssignmentsTable.roomId, roomsTable.id))
    .leftJoin(usersTable, eq(housekeepingAssignmentsTable.staffId, usersTable.id));

const fmt = (r: any) => ({
  ...r,
  roomNumber: r.roomNumber ?? null,
  staffName: r.staffName ?? null,
  notes: r.notes ?? null,
  rejectionReason: r.rejectionReason ?? null,
  startedAt: r.startedAt?.toISOString() ?? null,
  completedAt: r.completedAt?.toISOString() ?? null,
  createdAt: r.createdAt?.toISOString() ?? null,
  updatedAt: r.updatedAt?.toISOString() ?? null,
});

@Injectable()
export class HousekeepingService {
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const [statusRows, todayRows] = await Promise.all([
      db
        .select({ status: housekeepingAssignmentsTable.status, count: sql<number>`count(*)::int` })
        .from(housekeepingAssignmentsTable)
        .groupBy(housekeepingAssignmentsTable.status),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(housekeepingAssignmentsTable)
        .where(eq(housekeepingAssignmentsTable.scheduledDate, today)),
    ]);

    const s: any = { today: todayRows[0]?.count ?? 0, pending: 0, assigned: 0, inProgress: 0, readyForInspection: 0, completed: 0, total: 0 };
    for (const r of statusRows) {
      if (r.status === 'pending') s.pending = r.count;
      else if (r.status === 'assigned') s.assigned = r.count;
      else if (r.status === 'in_progress') s.inProgress = r.count;
      else if (r.status === 'ready_for_inspection') s.readyForInspection = r.count;
      else if (r.status === 'completed') s.completed = r.count;
      s.total += r.count;
    }
    return s;
  }

  async findAll(q: any) {
    const conds: any[] = [];
    if (q.status) conds.push(eq(housekeepingAssignmentsTable.status, q.status));
    if (q.date) conds.push(eq(housekeepingAssignmentsTable.scheduledDate, q.date));
    if (q.cleaningType) conds.push(eq(housekeepingAssignmentsTable.cleaningType, q.cleaningType));
    if (q.priority) conds.push(eq(housekeepingAssignmentsTable.priority, q.priority));
    if (q.staffId) conds.push(eq(housekeepingAssignmentsTable.staffId, q.staffId));
    const rows = await base()
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(housekeepingAssignmentsTable.scheduledDate));
    return rows.map(fmt);
  }

  async create(b: any) {
    const taskNumber = 'HK-' + Date.now().toString(36).toUpperCase();
    const status = b.staffId ? 'assigned' : 'pending';
    const [h] = await db
      .insert(housekeepingAssignmentsTable)
      .values({
        taskNumber,
        roomId: b.roomId ?? null,
        areaType: b.areaType ?? 'guest_room',
        staffId: b.staffId ?? null,
        supervisorId: b.supervisorId ?? null,
        cleaningType: b.cleaningType ?? 'daily',
        priority: b.priority ?? 'normal',
        status: status as any,
        scheduledDate: b.scheduledDate ?? new Date().toISOString().slice(0, 10),
        scheduledTime: b.scheduledTime ?? null,
        notes: b.notes ?? null,
      })
      .returning();

    if (b.roomId && b.cleaningType === 'checkout') {
      await db.update(roomsTable).set({ status: 'cleaning' }).where(eq(roomsTable.id, b.roomId));
    }

    const [row] = await base().where(eq(housekeepingAssignmentsTable.id, h.id));
    return fmt(row);
  }

  async findOne(id: string) {
    const [row] = await base().where(eq(housekeepingAssignmentsTable.id, id));
    if (!row) throw new NotFoundException(`Housekeeping task ${id} not found`);
    return fmt(row);
  }

  async update(id: string, b: any) {
    const u: any = {};
    const allowed = ['staffId', 'supervisorId', 'scheduledDate', 'scheduledTime', 'cleaningType', 'priority', 'status', 'notes', 'rejectionReason', 'areaType'];
    for (const k of allowed) if (b[k] !== undefined) u[k] = b[k];

    if (b.status === 'in_progress') u.startedAt = new Date();
    if (b.status === 'completed' || b.status === 'ready_for_inspection') u.completedAt = new Date();

    const [h] = await db
      .update(housekeepingAssignmentsTable)
      .set(u)
      .where(eq(housekeepingAssignmentsTable.id, id))
      .returning();
    if (!h) throw new NotFoundException(`Housekeeping task ${id} not found`);

    if (h.roomId) {
      if (h.status === 'in_progress') {
        await db.update(roomsTable).set({ status: 'cleaning' }).where(eq(roomsTable.id, h.roomId));
      } else if (h.status === 'ready_for_inspection') {
        await db.update(roomsTable).set({ status: 'available' }).where(eq(roomsTable.id, h.roomId));
      } else if (h.status === 'completed' || (h.status as string) === 'inspected') {
        await db.update(roomsTable).set({ status: 'available' }).where(eq(roomsTable.id, h.roomId));
      }
    }

    const [row] = await base().where(eq(housekeepingAssignmentsTable.id, id));
    return fmt(row);
  }

  async getAreas() {
    const areaCols = getTableColumns(cleaningAreasTable);
    return db
      .select(areaCols)
      .from(cleaningAreasTable)
      .where(eq(cleaningAreasTable.isActive, true))
      .orderBy(cleaningAreasTable.name);
  }

  async createArea(b: any) {
    const { randomUUID } = await import('crypto');
    const [area] = await db
      .insert(cleaningAreasTable)
      .values({
        id: randomUUID(),
        name: b.name,
        areaType: b.areaType ?? 'other',
        floor: b.floor ?? null,
        building: b.building ?? null,
        notes: b.notes ?? null,
      })
      .returning();
    return area;
  }

  async getInspections(taskId?: string) {
    const inspCols = getTableColumns(cleaningInspectionsTable);
    const fields = {
      ...inspCols,
      inspectorName: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
    };
    const q = db
      .select(fields)
      .from(cleaningInspectionsTable)
      .leftJoin(usersTable, eq(cleaningInspectionsTable.inspectedBy, usersTable.id));

    if (taskId) {
      return q.where(eq(cleaningInspectionsTable.taskId, taskId));
    }
    return q;
  }

  async createInspection(b: any) {
    const { randomUUID } = await import('crypto');
    const [insp] = await db
      .insert(cleaningInspectionsTable)
      .values({
        id: randomUUID(),
        taskId: b.taskId,
        inspectedBy: b.inspectedBy ?? null,
        result: b.result ?? 'passed',
        score: b.score ?? null,
        notes: b.notes ?? null,
      })
      .returning();

    if (b.result === 'passed') {
      await db
        .update(housekeepingAssignmentsTable)
        .set({ status: 'completed' })
        .where(eq(housekeepingAssignmentsTable.id, b.taskId));
    } else if (b.result === 'failed') {
      await db
        .update(housekeepingAssignmentsTable)
        .set({ status: 'in_progress' })
        .where(eq(housekeepingAssignmentsTable.id, b.taskId));
    }

    return insp;
  }

  // ─── Pre-Checkout Room Clearance Methods ───

  async requestPreCheckoutInspection(b: {
    reservationId: string;
    roomId?: string;
    guestId?: string;
    notes?: string;
  }) {
    if (!b.reservationId) {
      throw new BadRequestException('Reservation ID is required');
    }

    const [existing] = await db
      .select()
      .from(preCheckoutInspectionsTable)
      .where(
        and(
          eq(preCheckoutInspectionsTable.reservationId, b.reservationId),
          eq(preCheckoutInspectionsTable.isActive, true),
        ),
      )
      .orderBy(desc(preCheckoutInspectionsTable.createdAt))
      .limit(1);

    if (existing) {
      return existing;
    }

    let roomId = b.roomId;
    let guestId = b.guestId;
    let reservationNumber = '';
    let roomNumber = '';

    const [res] = await db
      .select({
        id: reservationsTable.id,
        reservationNumber: reservationsTable.reservationNumber,
        roomId: reservationsTable.roomId,
        guestId: reservationsTable.guestId,
      })
      .from(reservationsTable)
      .where(eq(reservationsTable.id, b.reservationId))
      .limit(1);

    if (res) {
      roomId = roomId || res.roomId || '';
      guestId = guestId || res.guestId || '';
      reservationNumber = res.reservationNumber;
    }

    if (roomId) {
      const [rm] = await db
        .select({ number: roomsTable.number })
        .from(roomsTable)
        .where(eq(roomsTable.id, roomId))
        .limit(1);
      if (rm) roomNumber = rm.number;
    }

    const { randomUUID } = await import('crypto');
    const inspectionNumber = `PCI-${Date.now().toString(36).toUpperCase()}`;

    const [created] = await db
      .insert(preCheckoutInspectionsTable)
      .values({
        id: randomUUID(),
        inspectionNumber,
        reservationId: b.reservationId,
        roomId: roomId || '',
        guestId: guestId || '',
        status: 'pending',
        minibarItems: JSON.stringify([]),
        minibarTotal: '0',
        damageCharges: '0',
        assetsIntact: true,
        lostAndFoundFound: false,
        notes: b.notes ?? null,
      })
      .returning();

    try {
      const staffUsers = await db.select({ id: usersTable.id }).from(usersTable);
      if (staffUsers.length > 0) {
        await db.insert(notificationsTable).values(
          staffUsers.map((u) => ({
            userId: u.id,
            type: 'warning',
            title: '🛎️ Pre-Checkout Inspection Requested',
            message: `Room ${roomNumber || roomId} (Reservation ${reservationNumber || b.reservationId}) requested pre-checkout inspection before checkout. Please inspect minibar, room assets, and lost items.`,
            resourceType: 'housekeeping',
            resourceId: created.id,
          })),
        );
      }
    } catch {
      // Non-blocking notification
    }

    return created;
  }

  async getPreCheckoutInspections(query?: {
    reservationId?: string;
    roomId?: string;
    status?: string;
  }) {
    const conds: any[] = [eq(preCheckoutInspectionsTable.isActive, true)];
    if (query?.reservationId) conds.push(eq(preCheckoutInspectionsTable.reservationId, query.reservationId));
    if (query?.roomId) conds.push(eq(preCheckoutInspectionsTable.roomId, query.roomId));
    if (query?.status) conds.push(eq(preCheckoutInspectionsTable.status, query.status));

    const rows = await db
      .select({
        ...getTableColumns(preCheckoutInspectionsTable),
        roomNumber: roomsTable.number,
        guestFirstName: guestsTable.firstName,
        guestLastName: guestsTable.lastName,
        guestPhone: guestsTable.phone,
        reservationNumber: reservationsTable.reservationNumber,
        checkInDate: reservationsTable.checkInDate,
        checkOutDate: reservationsTable.checkOutDate,
      })
      .from(preCheckoutInspectionsTable)
      .leftJoin(roomsTable, eq(preCheckoutInspectionsTable.roomId, roomsTable.id))
      .leftJoin(guestsTable, eq(preCheckoutInspectionsTable.guestId, guestsTable.id))
      .leftJoin(reservationsTable, eq(preCheckoutInspectionsTable.reservationId, reservationsTable.id))
      .where(and(...conds))
      .orderBy(desc(preCheckoutInspectionsTable.createdAt));

    return rows.map((r) => ({
      ...r,
      guestName: r.guestFirstName ? `${r.guestFirstName} ${r.guestLastName || ''}`.trim() : null,
      minibarItems: r.minibarItems ? JSON.parse(r.minibarItems) : [],
    }));
  }

  async getPreCheckoutInspectionByReservation(reservationId: string) {
    const rows = await this.getPreCheckoutInspections({ reservationId });
    return rows[0] || null;
  }

  async submitPreCheckoutInspection(
    id: string,
    b: {
      status?: 'cleared' | 'issues_reported' | 'in_progress';
      minibarItems?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
      minibarTotal?: number;
      damageCharges?: number;
      damageNotes?: string;
      assetsIntact?: boolean;
      lostAndFoundFound?: boolean;
      lostAndFoundNotes?: string;
      inspectedBy?: string;
      inspectedById?: string;
      notes?: string;
    },
  ) {
    const [existing] = await db
      .select()
      .from(preCheckoutInspectionsTable)
      .where(eq(preCheckoutInspectionsTable.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Pre-checkout inspection ${id} not found`);
    }

    const minibarTotalNum = Number(b.minibarTotal ?? existing.minibarTotal ?? 0);
    const damageChargesNum = Number(b.damageCharges ?? existing.damageCharges ?? 0);
    const totalAdditionalCharges = minibarTotalNum + damageChargesNum;

    // Auto-update Invoice if there are charges
    if (totalAdditionalCharges > 0) {
      try {
        const [activeInvoice] = await db
          .select()
          .from(invoicesTable)
          .where(
            and(
              eq(invoicesTable.reservationId, existing.reservationId),
              or(eq(invoicesTable.status, 'draft'), eq(invoicesTable.status, 'issued')),
            ),
          )
          .orderBy(desc(invoicesTable.createdAt))
          .limit(1);

        if (activeInvoice) {
          const { randomUUID } = await import('crypto');

          if (minibarTotalNum > 0) {
            await db.insert(invoiceLineItemsTable).values({
              id: randomUUID(),
              invoiceId: activeInvoice.id,
              description: `Pre-Checkout Minibar Consumption (${b.minibarItems?.filter((i) => i.quantity > 0).map((i) => `${i.name} x${i.quantity}`).join(', ') || 'Items consumed'})`,
              quantity: '1',
              unitPrice: minibarTotalNum.toFixed(2),
              total: minibarTotalNum.toFixed(2),
            });
          }

          if (damageChargesNum > 0) {
            await db.insert(invoiceLineItemsTable).values({
              id: randomUUID(),
              invoiceId: activeInvoice.id,
              description: `Room Damage / Incidentals Fee (${b.damageNotes || 'Reported during pre-checkout inspection'})`,
              quantity: '1',
              unitPrice: damageChargesNum.toFixed(2),
              total: damageChargesNum.toFixed(2),
            });
          }

          const newSubtotal = Number(activeInvoice.subtotal || 0) + totalAdditionalCharges;
          const newTotal = Number(activeInvoice.totalAmount || 0) + totalAdditionalCharges;

          await db
            .update(invoicesTable)
            .set({
              subtotal: newSubtotal.toFixed(2),
              totalAmount: newTotal.toFixed(2),
            })
            .where(eq(invoicesTable.id, activeInvoice.id));

          // Also update reservation total amount
          const [res] = await db
            .select()
            .from(reservationsTable)
            .where(eq(reservationsTable.id, existing.reservationId))
            .limit(1);
          if (res) {
            const resTotal = Number(res.totalAmount || 0) + totalAdditionalCharges;
            await db
              .update(reservationsTable)
              .set({ totalAmount: resTotal.toFixed(2) })
              .where(eq(reservationsTable.id, res.id));
          }
        }
      } catch (err) {
        console.error('Failed to sync inspection charges to invoice:', err);
      }
    }

    const finalStatus = b.status ?? (damageChargesNum > 0 ? 'issues_reported' : 'cleared');

    const [updated] = await db
      .update(preCheckoutInspectionsTable)
      .set({
        status: finalStatus,
        minibarItems: b.minibarItems ? JSON.stringify(b.minibarItems) : existing.minibarItems,
        minibarTotal: minibarTotalNum.toFixed(2),
        damageCharges: damageChargesNum.toFixed(2),
        damageNotes: b.damageNotes !== undefined ? b.damageNotes : existing.damageNotes,
        assetsIntact: b.assetsIntact !== undefined ? b.assetsIntact : existing.assetsIntact,
        lostAndFoundFound: b.lostAndFoundFound !== undefined ? b.lostAndFoundFound : existing.lostAndFoundFound,
        lostAndFoundNotes: b.lostAndFoundNotes !== undefined ? b.lostAndFoundNotes : existing.lostAndFoundNotes,
        inspectedBy: b.inspectedBy ?? existing.inspectedBy,
        inspectedById: b.inspectedById ?? existing.inspectedById,
        inspectedAt: new Date(),
        notes: b.notes !== undefined ? b.notes : existing.notes,
      })
      .where(eq(preCheckoutInspectionsTable.id, id))
      .returning();

    // Send clearance notification to Front Desk
    try {
      const staffUsers = await db.select({ id: usersTable.id }).from(usersTable);
      const isCleared = updated.status === 'cleared';
      const [rm] = await db.select({ number: roomsTable.number }).from(roomsTable).where(eq(roomsTable.id, updated.roomId));
      const roomNum = rm?.number || updated.roomId;

      await db.insert(notificationsTable).values(
        staffUsers.map((u) => ({
          userId: u.id,
          type: isCleared ? 'success' : 'warning',
          title: isCleared ? '✅ Room Inspection Cleared' : '⚠️ Room Inspection Issues Reported',
          message: isCleared
            ? `Room ${roomNum} has been inspected and cleared by Housekeeping. Front desk can proceed with guest checkout.`
            : `Room ${roomNum} inspection completed with issues/charges ($${totalAdditionalCharges.toFixed(2)} added to folio).`,
          resourceType: 'housekeeping',
          resourceId: updated.id,
        })),
      );
    } catch {
      // Non-blocking notification
    }

    return updated;
  }
}
