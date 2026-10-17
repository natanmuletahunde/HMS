import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, desc, and, getTableColumns } from 'drizzle-orm';
import { db, organizationsTable } from '@workspace/db';
import { CallerCtx, assertTenantAccess, isPlatformAdmin } from '../../common/context/tenant-context';

@Injectable()
export class OrganizationsService {
  async findAll(ctx: CallerCtx, q: { type?: string } = {}) {
    const conds: any[] = [];
    // Scope to caller's tenant unless platform admin
    if (!isPlatformAdmin(ctx)) conds.push(eq(organizationsTable.tenantId, ctx.tenantId!));
    if (q.type) conds.push(eq(organizationsTable.type, q.type));

    const query = db.select(getTableColumns(organizationsTable)).from(organizationsTable);
    if (conds.length) {
      return query.where(conds.length === 1 ? conds[0] : and(...conds)).orderBy(desc(organizationsTable.createdAt));
    }
    return query.orderBy(desc(organizationsTable.createdAt));
  }

  async findOne(ctx: CallerCtx, id: string) {
    const [org] = await db.select(getTableColumns(organizationsTable)).from(organizationsTable).where(eq(organizationsTable.id, id));
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    assertTenantAccess(ctx, org.tenantId);
    return org;
  }

  async create(ctx: CallerCtx, body: { name: string; code?: string; type?: string; description?: string; country?: string; city?: string; address?: string; phone?: string; email?: string; website?: string; currency?: string; timezone?: string }) {
    if (!isPlatformAdmin(ctx) && !ctx.tenantId) throw new ForbiddenException('No tenant context');
    const tenantId = ctx.tenantId ?? null; // platform admin creates global org; regular user scopes to their tenant
    const [org] = await db.insert(organizationsTable).values({ ...body, tenantId } as any).returning();
    return org;
  }

  async update(ctx: CallerCtx, id: string, body: any) {
    const org = await this.findOne(ctx, id); // findOne already asserts tenant access
    const [updated] = await db.update(organizationsTable).set(body).where(eq(organizationsTable.id, org.id)).returning();
    return updated;
  }

  async getStats(ctx: CallerCtx, id: string) {
    await this.findOne(ctx, id); // asserts tenant access
    return { organizationId: id, totalBranches: 0, totalRooms: 0, totalGuests: 0 };
  }
}
