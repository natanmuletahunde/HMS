import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, notificationsTable, notificationTemplatesTable } from '@workspace/db';

const fmt = (n: any) => ({
  ...n,
  resourceType: n.resourceType ?? null,
  resourceId: n.resourceId ?? null,
  createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
});

@Injectable()
export class NotificationsService {
  findAll(userId: string) {
    return db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(notificationsTable.createdAt)
      .limit(50)
      .then((r) => r.map(fmt));
  }

  async markRead(id: string) {
    const [n] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.id, id))
      .returning();
    if (!n) throw new NotFoundException();
    return fmt(n);
  }

  async getHistory(q: { userId?: string; type?: string; isRead?: string }) {
    const conds: any[] = [];
    if (q.userId) conds.push(eq(notificationsTable.userId, q.userId));
    if (q.type) conds.push(eq(notificationsTable.type, q.type));
    if (q.isRead !== undefined) conds.push(eq(notificationsTable.isRead, q.isRead === 'true'));

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(notificationsTable.createdAt))
      .limit(200);
    return rows.map(fmt);
  }

  async markAllRead(userId: string) {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, userId));
    return { success: true };
  }

  async createNotification(b: {
    userId: string;
    type: string;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    const [n] = await db
      .insert(notificationsTable)
      .values({
        userId: b.userId,
        type: b.type,
        title: b.title,
        message: b.message,
        resourceType: b.resourceType ?? null,
        resourceId: b.resourceId ?? null,
      })
      .returning();
    return fmt(n);
  }

  async broadcastNotification(b: {
    type: string;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    await db.insert(notificationsTable).values({
      userId: 'system',
      type: b.type,
      title: b.title,
      message: b.message,
      resourceType: b.resourceType ?? null,
      resourceId: b.resourceId ?? null,
    });
    return { success: true };
  }

  async getTemplates() {
    return db
      .select()
      .from(notificationTemplatesTable)
      .where(eq(notificationTemplatesTable.isActive, true))
      .orderBy(notificationTemplatesTable.name);
  }

  async createTemplate(b: {
    code: string;
    name: string;
    channel: string;
    type: string;
    subject?: string;
    body: string;
    variables?: string;
  }) {
    const [template] = await db
      .insert(notificationTemplatesTable)
      .values({
        code: b.code,
        name: b.name,
        channel: b.channel,
        type: b.type,
        subject: b.subject ?? null,
        body: b.body,
        variables: b.variables ?? null,
      })
      .returning();
    return template;
  }

  async updateTemplate(id: string, b: any) {
    const u: any = {};
    for (const k of ['code', 'name', 'channel', 'type', 'subject', 'body', 'variables', 'isActive']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    const [template] = await db
      .update(notificationTemplatesTable)
      .set(u)
      .where(eq(notificationTemplatesTable.id, id))
      .returning();
    if (!template) throw new NotFoundException(`Template ${id} not found`);
    return template;
  }

  async getUnreadCount(userId: string) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
    return { count: row?.count ?? 0 };
  }
}
