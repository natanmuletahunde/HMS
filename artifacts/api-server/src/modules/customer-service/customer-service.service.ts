import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc, inArray } from 'drizzle-orm';
import { db, complaintsTable, complaintCommentsTable } from '@workspace/db';

@Injectable()
export class CustomerServiceService {
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);

    const [stats, byCategory, satisfactionRows, todayNewRows] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          newCount: sql<number>`count(*) filter (where status = 'new')::int`,
          assigned: sql<number>`count(*) filter (where status = 'assigned')::int`,
          inProgress: sql<number>`count(*) filter (where status = 'in_progress')::int`,
          resolved: sql<number>`count(*) filter (where status = 'resolved')::int`,
          closed: sql<number>`count(*) filter (where status = 'closed')::int`,
          escalated: sql<number>`count(*) filter (where status = 'escalated')::int`,
        })
        .from(complaintsTable)
        .where(eq(complaintsTable.isActive, true)),
      db
        .select({
          category: complaintsTable.category,
          count: sql<number>`count(*)::int`,
        })
        .from(complaintsTable)
        .where(eq(complaintsTable.isActive, true))
        .groupBy(complaintsTable.category)
        .orderBy(sql`count(*) desc`),
      db
        .select({
          avg: sql<string>`coalesce(avg(satisfaction_rating)::numeric(10,2), 0)`,
        })
        .from(complaintsTable)
        .where(and(eq(complaintsTable.isActive, true), sql`satisfaction_rating is not null`)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(complaintsTable)
        .where(and(eq(complaintsTable.isActive, true), sql`date(created_at) = ${today}`)),
    ]);

    return {
      total: stats[0]?.total ?? 0,
      newCount: stats[0]?.newCount ?? 0,
      assigned: stats[0]?.assigned ?? 0,
      inProgress: stats[0]?.inProgress ?? 0,
      resolved: stats[0]?.resolved ?? 0,
      closed: stats[0]?.closed ?? 0,
      escalated: stats[0]?.escalated ?? 0,
      byCategory,
      satisfactionAvg: parseFloat(satisfactionRows[0]?.avg ?? '0'),
      todayNew: todayNewRows[0]?.count ?? 0,
    };
  }

  async findAll(q: { status?: string; category?: string; priority?: string; search?: string }) {
    const conds: any[] = [eq(complaintsTable.isActive, true)];
    if (q.status) conds.push(eq(complaintsTable.status, q.status as any));
    if (q.category) conds.push(eq(complaintsTable.category, q.category as any));
    if (q.priority) conds.push(eq(complaintsTable.priority, q.priority as any));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(
        or(
          like(complaintsTable.subject, s),
          like(complaintsTable.guestName, s),
          like(complaintsTable.complaintNumber, s),
        ),
      );
    }

    return db
      .select(getTableColumns(complaintsTable))
      .from(complaintsTable)
      .where(and(...conds))
      .orderBy(desc(complaintsTable.createdAt));
  }

  async findOne(id: string) {
    const [complaint] = await db
      .select(getTableColumns(complaintsTable))
      .from(complaintsTable)
      .where(eq(complaintsTable.id, id));
    if (!complaint) throw new NotFoundException(`Complaint ${id} not found`);

    const comments = await db
      .select(getTableColumns(complaintCommentsTable))
      .from(complaintCommentsTable)
      .where(eq(complaintCommentsTable.complaintId, id))
      .orderBy(complaintCommentsTable.createdAt);

    return { ...complaint, comments };
  }

  async create(b: {
    guestId?: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    reservationId?: string;
    roomId?: string;
    category: string;
    priority?: string;
    subject: string;
    description: string;
    createdBy?: string;
  }) {
    const complaintNumber = 'CMP-' + Date.now().toString(36).toUpperCase();
    const [complaint] = await db
      .insert(complaintsTable)
      .values({
        complaintNumber,
        guestId: b.guestId ?? null,
        guestName: b.guestName,
        guestEmail: b.guestEmail ?? null,
        guestPhone: b.guestPhone ?? null,
        reservationId: b.reservationId ?? null,
        roomId: b.roomId ?? null,
        category: b.category as any,
        priority: (b.priority ?? 'medium') as any,
        subject: b.subject,
        description: b.description,
        status: 'new',
        createdBy: b.createdBy ?? null,
      })
      .returning();
    return complaint;
  }

  async update(
    id: string,
    b: { status?: string; assignedTo?: string; resolutionNotes?: string; priority?: string; updatedBy?: string },
  ) {
    const u: any = {};
    if (b.assignedTo !== undefined) u.assignedTo = b.assignedTo;
    if (b.resolutionNotes !== undefined) u.resolutionNotes = b.resolutionNotes;
    if (b.priority !== undefined) u.priority = b.priority;
    if (b.updatedBy !== undefined) u.updatedBy = b.updatedBy;

    if (b.status) {
      u.status = b.status;
      const [existing] = await db.select({ firstResponseAt: complaintsTable.firstResponseAt }).from(complaintsTable).where(eq(complaintsTable.id, id));
      if (b.status === 'assigned') {
        u.assignedAt = new Date();
        if (!existing?.firstResponseAt) u.firstResponseAt = new Date();
      }
      if (b.status === 'in_progress') {
        if (!existing?.firstResponseAt) u.firstResponseAt = new Date();
      }
      if (b.status === 'resolved') {
        u.resolvedAt = new Date();
        u.resolvedBy = b.updatedBy ?? null;
      }
      if (b.status === 'closed') {
        u.closedAt = new Date();
      }
      if (b.status === 'escalated') {
        u.escalatedAt = new Date();
      }
    }

    const [complaint] = await db
      .update(complaintsTable)
      .set(u)
      .where(eq(complaintsTable.id, id))
      .returning();
    if (!complaint) throw new NotFoundException(`Complaint ${id} not found`);
    return complaint;
  }

  async addComment(
    complaintId: string,
    b: { authorId?: string; authorName: string; comment: string; isInternal?: boolean },
  ) {
    const [comment] = await db
      .insert(complaintCommentsTable)
      .values({
        complaintId,
        authorId: b.authorId ?? null,
        authorName: b.authorName,
        comment: b.comment,
        isInternal: b.isInternal ?? false,
      })
      .returning();
    return comment;
  }

  async submitFeedback(id: string, b: { satisfactionRating: number; satisfactionComment?: string }) {
    const [complaint] = await db
      .update(complaintsTable)
      .set({
        satisfactionRating: b.satisfactionRating,
        satisfactionComment: b.satisfactionComment ?? null,
      })
      .where(eq(complaintsTable.id, id))
      .returning();
    if (!complaint) throw new NotFoundException(`Complaint ${id} not found`);
    return complaint;
  }

  async getStats() {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        resolved: sql<number>`count(*) filter (where status = 'resolved')::int`,
        newCount: sql<number>`count(*) filter (where status = 'new')::int`,
        escalated: sql<number>`count(*) filter (where status = 'escalated')::int`,
      })
      .from(complaintsTable)
      .where(eq(complaintsTable.isActive, true));
    return {
      total: stats?.total ?? 0,
      resolved: stats?.resolved ?? 0,
      newCount: stats?.newCount ?? 0,
      escalated: stats?.escalated ?? 0,
    };
  }
}
