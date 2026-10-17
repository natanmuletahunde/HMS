import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, desc, getTableColumns, sql } from 'drizzle-orm';
import { db, subscriptionPlansTable, tenantSubscriptionsTable } from '@workspace/db';
import { CallerCtx, isPlatformAdmin } from '../../common/context/tenant-context';

@Injectable()
export class SubscriptionsService {
  async getPlans() {
    return db
      .select(getTableColumns(subscriptionPlansTable))
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.isActive, true))
      .orderBy(subscriptionPlansTable.sortOrder);
  }

  async getCurrent(ctx: CallerCtx) {
    if (!isPlatformAdmin(ctx) && !ctx.tenantId) throw new ForbiddenException('No tenant context');
    const where = isPlatformAdmin(ctx) ? undefined : eq(tenantSubscriptionsTable.tenantId, ctx.tenantId!);

    const rows = await db
      .select({
        subscription: getTableColumns(tenantSubscriptionsTable),
        plan: getTableColumns(subscriptionPlansTable),
      })
      .from(tenantSubscriptionsTable)
      .innerJoin(subscriptionPlansTable, eq(tenantSubscriptionsTable.planId, subscriptionPlansTable.id))
      .where(where)
      .orderBy(desc(tenantSubscriptionsTable.createdAt))
      .limit(1);

    if (!rows.length) return { subscription: null, plan: null, usage: null };
    const { subscription, plan } = rows[0];
    const usage = await this._usageFor(subscription.tenantId);
    return { subscription, plan, usage };
  }

  async getUsage(ctx: CallerCtx) {
    if (!isPlatformAdmin(ctx) && !ctx.tenantId) throw new ForbiddenException('No tenant context');
    return this._usageFor(ctx.tenantId!);
  }

  private async _usageFor(tenantId: string) {
    // Count active users belonging to this tenant (tenant_id = tenantId or null for legacy platform users)
    const rows = await db.execute(
      sql`SELECT count(*)::int as count FROM users WHERE is_active = true AND (tenant_id = ${tenantId} OR tenant_id IS NULL)`
    );
    const userCount = (rows as any).rows?.[0]?.count ?? (rows as any)[0]?.count ?? 0;
    return {
      tenantId,
      hotels: 1,
      users: typeof userCount === 'number' ? userCount : parseInt(String(userCount), 10),
      rooms: 0,
    };
  }

  async activate(ctx: CallerCtx, body: { planCode: string; billingCycle?: string }) {
    if (!isPlatformAdmin(ctx) && !ctx.tenantId) throw new ForbiddenException('No tenant context');
    const tenantId = ctx.tenantId;

    // Validate tenant exists (platform admins can activate for any tenant if they pass tenantId in body — but ctx.tenantId is null)
    // For platform admins without a tenantId, we skip validation — they manage tenants directly via the tenants endpoint
    if (!tenantId && !isPlatformAdmin(ctx)) throw new ForbiddenException('No tenant to activate subscription for');

    const [plan] = await db
      .select(getTableColumns(subscriptionPlansTable))
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.code, body.planCode));
    if (!plan) throw new NotFoundException(`Plan ${body.planCode} not found`);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + (plan.trialDays ?? 14));

    // Expire any existing active subscription for this tenant
    if (tenantId) {
      await db
        .update(tenantSubscriptionsTable)
        .set({ status: 'cancelled' })
        .where(eq(tenantSubscriptionsTable.tenantId, tenantId));
    }

    const [sub] = await db
      .insert(tenantSubscriptionsTable)
      .values({
        tenantId: tenantId ?? 'platform',
        planId: plan.id,
        status: plan.code === 'trial' ? 'trial' : 'active',
        billingCycle: body.billingCycle ?? 'monthly',
        trialEndsAt: plan.code === 'trial' ? trialEndsAt : null,
      })
      .returning();
    return sub;
  }

  async getHistory(ctx: CallerCtx) {
    if (!isPlatformAdmin(ctx) && !ctx.tenantId) throw new ForbiddenException('No tenant context');
    const where = isPlatformAdmin(ctx) ? undefined : eq(tenantSubscriptionsTable.tenantId, ctx.tenantId!);

    return db
      .select({
        subscription: getTableColumns(tenantSubscriptionsTable),
        plan: getTableColumns(subscriptionPlansTable),
      })
      .from(tenantSubscriptionsTable)
      .innerJoin(subscriptionPlansTable, eq(tenantSubscriptionsTable.planId, subscriptionPlansTable.id))
      .where(where)
      .orderBy(desc(tenantSubscriptionsTable.createdAt));
  }
}
