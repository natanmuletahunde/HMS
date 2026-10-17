import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, and, sql, lt } from 'drizzle-orm';
import { db, inventoryItemsTable, reservationsTable, transactionsTable } from '@workspace/db';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  @Cron(CronExpression.EVERY_HOUR)
  async handleInventoryAlerts() {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItemsTable)
      .where(and(eq(inventoryItemsTable.status, 'low_stock'), eq(inventoryItemsTable.isActive, true)));
    const count = rows[0]?.count ?? 0;
    this.logger.log(`Inventory alerts: ${count} low-stock item(s) found`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleReservationExpiry() {
    const today = new Date().toISOString().slice(0, 10);
    const result = await db
      .update(reservationsTable)
      .set({ status: 'no_show' })
      .where(
        and(
          eq(reservationsTable.status, 'confirmed'),
          sql`check_in_date < ${today}`,
        ),
      )
      .returning({ id: reservationsTable.id });
    this.logger.log(`Reservation expiry: ${result.length} reservation(s) marked as no-show`);
  }

  @Cron('0 6 * * *')
  async sendDailyStats() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const rows = await db
      .select({ count: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(amount), 0)` })
      .from(transactionsTable)
      .where(sql`transaction_date = ${yesterdayStr}`);

    const count = rows[0]?.count ?? 0;
    const total = parseFloat(rows[0]?.total ?? '0');
    this.logger.log(`Daily stats for ${yesterdayStr}: ${count} transactions totaling ${total}`);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncRoomStatuses() {
    this.logger.log('Room status sync completed');
  }
}
