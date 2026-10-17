import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  housekeepingAssignmentsTable,
  cleaningAreasTable,
  cleaningInspectionsTable,
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

    if ((h.status === 'completed' || (h.status as string) === 'inspected') && h.roomId) {
      await db.update(roomsTable).set({ status: 'available' }).where(eq(roomsTable.id, h.roomId));
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
}
