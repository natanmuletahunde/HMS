import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, desc, getTableColumns } from 'drizzle-orm';
import { db, tenantsTable, tenantBrandingTable } from '@workspace/db';
import { CallerCtx, assertTenantAccess, isPlatformAdmin } from '../../common/context/tenant-context';

@Injectable()
export class TenantsService {
  async findAll(ctx: CallerCtx) {
    if (isPlatformAdmin(ctx)) {
      // Platform admins see all tenants
      return db.select(getTableColumns(tenantsTable)).from(tenantsTable).orderBy(desc(tenantsTable.createdAt));
    }
    // Regular users see only their own tenant
    return db.select(getTableColumns(tenantsTable))
      .from(tenantsTable)
      .where(eq(tenantsTable.id, ctx.tenantId!))
      .orderBy(desc(tenantsTable.createdAt));
  }

  async findOne(ctx: CallerCtx, id: string) {
    assertTenantAccess(ctx, id); // tenantId IS the resource id for tenants
    const [tenant] = await db.select(getTableColumns(tenantsTable)).from(tenantsTable).where(eq(tenantsTable.id, id));
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async create(ctx: CallerCtx, body: { name: string; slug: string; domain?: string; country?: string; timezone?: string; currency?: string }) {
    if (!isPlatformAdmin(ctx)) throw new ForbiddenException('Only platform admins can create tenants');
    const [tenant] = await db.insert(tenantsTable).values({
      name: body.name,
      slug: body.slug,
      domain: body.domain ?? null,
      country: body.country ?? null,
      timezone: body.timezone ?? 'UTC',
      currency: body.currency ?? 'USD',
    }).returning();
    await db.insert(tenantBrandingTable).values({ tenantId: tenant.id });
    return tenant;
  }

  async update(ctx: CallerCtx, id: string, body: Partial<{ name: string; slug: string; domain: string; country: string; timezone: string; currency: string; isActive: boolean }>) {
    await this.findOne(ctx, id);
    const [updated] = await db.update(tenantsTable).set(body as any).where(eq(tenantsTable.id, id)).returning();
    return updated;
  }

  async remove(ctx: CallerCtx, id: string) {
    if (!isPlatformAdmin(ctx)) throw new ForbiddenException('Only platform admins can deactivate tenants');
    await this.findOne(ctx, id);
    const [removed] = await db.update(tenantsTable).set({ isActive: false }).where(eq(tenantsTable.id, id)).returning();
    return removed;
  }

  async getBranding(ctx: CallerCtx, tenantId: string) {
    await this.findOne(ctx, tenantId);
    const [branding] = await db.select().from(tenantBrandingTable).where(eq(tenantBrandingTable.tenantId, tenantId));
    if (!branding) {
      const [created] = await db.insert(tenantBrandingTable).values({ tenantId }).returning();
      return created;
    }
    return branding;
  }

  async updateBranding(ctx: CallerCtx, tenantId: string, body: Partial<{ logoUrl: string; primaryColor: string; secondaryColor: string; accentColor: string; fontFamily: string; theme: string; customCss: string; appName: string }>) {
    await this.findOne(ctx, tenantId);
    const existing = await this.getBranding(ctx, tenantId);
    const [updated] = await db.update(tenantBrandingTable).set(body as any).where(eq(tenantBrandingTable.id, existing.id)).returning();
    return updated;
  }
}
