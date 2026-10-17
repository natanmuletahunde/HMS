import { Injectable } from '@nestjs/common';
import { eq, and, sql, getTableColumns, inArray } from 'drizzle-orm';
import { db, auditLogsTable, usersTable } from '@workspace/db';

const auditCols = getTableColumns(auditLogsTable);

@Injectable()
export class AuditLogsService {
  async findAll(q: any) {
    const { userId, action, resource, page = 1, limit = 20 } = q;
    const l = Math.min(+limit, 100);
    const offset = (+page - 1) * l;
    const conds: any[] = [];
    if (userId) conds.push(eq(auditLogsTable.userId, userId));
    if (action) conds.push(eq(auditLogsTable.action, action));
    if (resource) conds.push(eq(auditLogsTable.resource, resource));
    const where = conds.length > 0 ? and(...conds) : undefined;
    const [rows, [{ count }]] = await Promise.all([
      db
        .select({
          ...auditCols,
          userName: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
        })
        .from(auditLogsTable)
        .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
        .where(where)
        .limit(l)
        .offset(offset)
        .orderBy(sql`${auditLogsTable.createdAt} desc`),
      db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(where),
    ]);
    return {
      data: rows.map((r) => ({
        ...r,
        userName: (r as any).userName ?? null,
        resourceId: r.resourceId ?? null,
        changes: r.changes ?? null,
        ipAddress: r.ipAddress ?? null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
      meta: { total: count, page: +page, limit: l, totalPages: Math.ceil(count / l) },
    };
  }

  async create(b: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    changes?: string;
    ipAddress?: string;
    method?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    previousValues?: string;
    newValues?: string;
    status?: string;
  }) {
    const values: any = {
      userId: b.userId ?? 'system',
      action: b.action,
      resource: b.resource,
      resourceId: b.resourceId ?? null,
      changes: b.changes ?? null,
      ipAddress: b.ipAddress ?? null,
    };
    // Extra columns if they exist in schema
    if (b.method !== undefined) values.method = b.method;
    if (b.userAgent !== undefined) values.userAgent = b.userAgent;
    if (b.browser !== undefined) values.browser = b.browser;
    if (b.os !== undefined) values.os = b.os;
    if (b.previousValues !== undefined) values.previousValues = b.previousValues;
    if (b.newValues !== undefined) values.newValues = b.newValues;
    if (b.status !== undefined) values.status = b.status;

    const [log] = await db.insert(auditLogsTable).values(values).returning();
    return log;
  }

  async getStats() {
    const today = new Date().toISOString().slice(0, 10);
    const [totalTodayRows, byActionRows, recentSecurityRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogsTable)
        .where(sql`date(created_at) = ${today}`),
      db
        .select({
          action: auditLogsTable.action,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogsTable)
        .groupBy(auditLogsTable.action)
        .orderBy(sql`count(*) desc`)
        .limit(10),
      db
        .select(auditCols)
        .from(auditLogsTable)
        .where(
          inArray(auditLogsTable.action, ['failed_login', 'password_change', 'role_change']),
        )
        .orderBy(sql`${auditLogsTable.createdAt} desc`)
        .limit(10),
    ]);

    return {
      totalToday: totalTodayRows[0]?.count ?? 0,
      byAction: byActionRows,
      recentSecurityEvents: recentSecurityRows.map((r) => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
    };
  }
}
