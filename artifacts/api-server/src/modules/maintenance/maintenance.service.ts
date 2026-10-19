import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  maintenanceRequestsTable,
  maintenanceCategoriesTable,
  maintenanceInspectionsTable,
  roomsTable,
  usersTable,
} from '@workspace/db';

const mtCols = getTableColumns(maintenanceRequestsTable);

const joinedFields = {
  ...mtCols,
  roomNumber: roomsTable.number,
  assignedToName: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
  categoryName: maintenanceCategoriesTable.name,
};

const base = () =>
  db
    .select(joinedFields)
    .from(maintenanceRequestsTable)
    .leftJoin(roomsTable, eq(maintenanceRequestsTable.roomId, roomsTable.id))
    .leftJoin(usersTable, eq(maintenanceRequestsTable.assignedToId, usersTable.id))
    .leftJoin(maintenanceCategoriesTable, eq(maintenanceRequestsTable.categoryId, maintenanceCategoriesTable.id));

const fmt = (r: any) => ({
  ...r,
  roomNumber: r.roomNumber ?? null,
  assignedToName: r.assignedToName ?? null,
  categoryName: r.categoryName ?? null,
  description: r.description ?? null,
  notes: r.notes ?? null,
  estimatedCost: r.estimatedCost != null ? parseFloat(r.estimatedCost) : null,
  actualCost: r.actualCost != null ? parseFloat(r.actualCost) : null,
  approvedAt: r.approvedAt?.toISOString() ?? null,
  startedAt: r.startedAt?.toISOString() ?? null,
  completedAt: r.completedAt?.toISOString() ?? null,
  resolvedAt: r.resolvedAt?.toISOString() ?? null,
  createdAt: r.createdAt?.toISOString() ?? null,
  updatedAt: r.updatedAt?.toISOString() ?? null,
});

@Injectable()
export class MaintenanceService {
  async getDashboard() {
    const statusRows = await db
      .select({ status: maintenanceRequestsTable.status, count: sql<number>`count(*)::int` })
      .from(maintenanceRequestsTable)
      .groupBy(maintenanceRequestsTable.status);

    const priorityRows = await db
      .select({ priority: maintenanceRequestsTable.priority, count: sql<number>`count(*)::int` })
      .from(maintenanceRequestsTable)
      .groupBy(maintenanceRequestsTable.priority);

    const s: any = { total: 0, pending: 0, approved: 0, assigned: 0, inProgress: 0, waitingParts: 0, underInspection: 0, completed: 0 };
    for (const r of statusRows) {
      if (r.status === 'pending') s.pending = r.count;
      else if (r.status === 'approved') s.approved = r.count;
      else if (r.status === 'assigned') s.assigned = r.count;
      else if (r.status === 'in_progress') s.inProgress = r.count;
      else if (r.status === 'waiting_parts') s.waitingParts = r.count;
      else if (r.status === 'under_inspection' || r.status === 'inspected') s.underInspection = (s.underInspection || 0) + r.count;
      else if (r.status === 'completed') s.completed = r.count;
      s.total += r.count;
    }

    const byPriority: any = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const r of priorityRows) {
      if (r.priority in byPriority) byPriority[r.priority] = r.count;
    }

    return { ...s, byPriority };
  }

  async getCategories() {
    const catCols = getTableColumns(maintenanceCategoriesTable);
    return db
      .select(catCols)
      .from(maintenanceCategoriesTable)
      .where(eq(maintenanceCategoriesTable.isActive, true))
      .orderBy(maintenanceCategoriesTable.name);
  }

  async createCategory(b: any) {
    const { randomUUID } = await import('crypto');
    const [cat] = await db
      .insert(maintenanceCategoriesTable)
      .values({
        id: randomUUID(),
        name: b.name,
        description: b.description ?? null,
      })
      .returning();
    return cat;
  }

  async findAll(q: any) {
    const conds: any[] = [];
    if (q.status) conds.push(eq(maintenanceRequestsTable.status, q.status));
    if (q.priority) conds.push(eq(maintenanceRequestsTable.priority, q.priority));
    if (q.categoryId) conds.push(eq(maintenanceRequestsTable.categoryId, q.categoryId));
    if (q.roomId) conds.push(eq(maintenanceRequestsTable.roomId, q.roomId));
    const rows = await base()
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(maintenanceRequestsTable.createdAt));
    return rows.map(fmt);
  }

  async create(b: any) {
    const requestNumber = 'MT-' + Date.now().toString(36).toUpperCase();
    const [m] = await db
      .insert(maintenanceRequestsTable)
      .values({
        requestNumber,
        roomId: b.roomId ?? null,
        categoryId: b.categoryId ?? null,
        reportedBy: b.reportedBy ?? null,
        assignedToId: b.assignedToId ?? null,
        title: b.title,
        description: b.description ?? null,
        priority: b.priority ?? 'medium',
        status: 'pending',
        estimatedCost: b.estimatedCost != null ? String(b.estimatedCost) : null,
        notes: b.notes ?? null,
      })
      .returning();

    if (b.roomId) {
      await db.update(roomsTable).set({ status: 'maintenance' }).where(eq(roomsTable.id, b.roomId));
    }

    const [row] = await base().where(eq(maintenanceRequestsTable.id, m.id));
    return fmt(row);
  }

  async findOne(id: string) {
    const [row] = await base().where(eq(maintenanceRequestsTable.id, id));
    if (!row) throw new NotFoundException(`Maintenance request ${id} not found`);
    return fmt(row);
  }

  async update(id: string, b: any) {
    const u: any = {};
    const allowed = ['title', 'description', 'priority', 'status', 'assignedToId', 'approvedBy', 'notes', 'estimatedCost', 'actualCost', 'rejectionReason', 'categoryId'];
    for (const k of allowed) if (b[k] !== undefined) u[k] = b[k];

    if (b.estimatedCost !== undefined) u.estimatedCost = String(b.estimatedCost);
    if (b.actualCost !== undefined) u.actualCost = String(b.actualCost);
    if (b.status === 'approved') u.approvedAt = new Date();
    if (b.status === 'in_progress') u.startedAt = new Date();
    if (b.status === 'completed') {
      u.completedAt = new Date();
      u.resolvedAt = new Date();
    }

    const [m] = await db
      .update(maintenanceRequestsTable)
      .set(u)
      .where(eq(maintenanceRequestsTable.id, id))
      .returning();
    if (!m) throw new NotFoundException(`Maintenance request ${id} not found`);

    if (m.roomId) {
      if (['approved', 'assigned', 'in_progress', 'under_inspection'].includes(m.status)) {
        await db.update(roomsTable).set({ status: 'maintenance' }).where(eq(roomsTable.id, m.roomId));
      } else if (['completed', 'cancelled'].includes(m.status)) {
        await db.update(roomsTable).set({ status: 'available' }).where(eq(roomsTable.id, m.roomId));
      }
    }

    const [row] = await base().where(eq(maintenanceRequestsTable.id, id));
    return fmt(row);
  }

  async getInspections(requestId?: string) {
    const inspCols = getTableColumns(maintenanceInspectionsTable);
    const fields = {
      ...inspCols,
      inspectorName: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
    };
    const q = db
      .select(fields)
      .from(maintenanceInspectionsTable)
      .leftJoin(usersTable, eq(maintenanceInspectionsTable.inspectedBy, usersTable.id));

    if (requestId) {
      return q.where(eq(maintenanceInspectionsTable.requestId, requestId));
    }
    return q;
  }

  async createInspection(b: any) {
    const { randomUUID } = await import('crypto');
    const [insp] = await db
      .insert(maintenanceInspectionsTable)
      .values({
        id: randomUUID(),
        requestId: b.requestId,
        inspectedBy: b.inspectedBy ?? null,
        result: b.result ?? 'passed',
        notes: b.notes ?? null,
      })
      .returning();

    if (b.result === 'passed') {
      await db
        .update(maintenanceRequestsTable)
        .set({ status: 'completed' })
        .where(eq(maintenanceRequestsTable.id, b.requestId));
    } else if (b.result === 'failed') {
      await db
        .update(maintenanceRequestsTable)
        .set({ status: 'in_progress' })
        .where(eq(maintenanceRequestsTable.id, b.requestId));
    }

    return insp;
  }
}
