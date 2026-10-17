import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, isNull, and, getTableColumns } from 'drizzle-orm';
import { db, pluginRegistryTable } from '@workspace/db';
import { CallerCtx, assertTenantAccess, isPlatformAdmin } from '../../common/context/tenant-context';

const PLUGIN_SDK_SPEC = {
  version: '1.0.0',
  description: 'Nexus HMS Plugin SDK — contract for building plugins',
  hooks: [
    { name: 'onReservationCreated',  description: 'Fired when a reservation is created',  payload: 'Reservation' },
    { name: 'onCheckIn',             description: 'Fired when a guest checks in',          payload: 'Checkin' },
    { name: 'onCheckOut',            description: 'Fired when a guest checks out',         payload: 'Checkout' },
    { name: 'onPaymentReceived',     description: 'Fired when a payment is recorded',      payload: 'Payment' },
    { name: 'onComplaintCreated',    description: 'Fired when a complaint is filed',       payload: 'Complaint' },
    { name: 'onInventoryLowStock',   description: 'Fired when stock falls below reorder',  payload: 'InventoryItem' },
    { name: 'onDailyReportReady',    description: 'Fired at end of business day',          payload: 'DailySummary' },
    { name: 'onWorkflowApproved',    description: 'Fired when a workflow is fully approved', payload: 'WorkflowInstance' },
  ],
  menus: {
    schema: { id: 'string', label: 'string', icon: 'string?', href: 'string', group: 'string?' },
    description: 'Inject sidebar menu items',
  },
  routes: {
    schema: { path: 'string', component: 'string', layout: 'string?' },
    description: 'Register frontend routes (served via plugin iframe)',
  },
  permissions: [
    'read:reservations', 'write:reservations',
    'read:guests', 'write:guests',
    'read:rooms', 'write:rooms',
    'read:reports', 'write:reports',
    'read:inventory', 'write:inventory',
    'read:financial', 'write:financial',
    'admin:tenants', 'admin:users',
  ],
  registration: {
    required: ['pluginCode', 'pluginName', 'version', 'author'],
    optional:  ['description', 'homepage', 'hooks', 'menus', 'routes', 'permissions', 'config'],
    example: {
      pluginCode: 'spa-management',
      pluginName: 'Spa & Wellness Module',
      version: '1.0.0',
      author: 'Nexus Plugins Inc.',
      description: 'Full spa booking and treatment management',
      hooks: ['onCheckIn', 'onCheckOut'],
      menus: [{ id: 'spa', label: 'Spa', icon: 'Flower', href: '/spa', group: 'Business' }],
      permissions: ['read:reservations', 'write:reservations'],
    },
  },
};

@Injectable()
export class PluginsService {
  async findAll(ctx: CallerCtx) {
    const rows = await db
      .select(getTableColumns(pluginRegistryTable))
      .from(pluginRegistryTable)
      .orderBy(desc(pluginRegistryTable.installedAt));

    if (isPlatformAdmin(ctx)) return rows;
    // Regular users see their tenant's plugins + system (null tenantId) plugins
    return rows.filter((r) => r.tenantId === ctx.tenantId || r.tenantId === null);
  }

  async findOne(ctx: CallerCtx, id: string) {
    const [plugin] = await db
      .select(getTableColumns(pluginRegistryTable))
      .from(pluginRegistryTable)
      .where(eq(pluginRegistryTable.id, id));
    if (!plugin) throw new NotFoundException(`Plugin ${id} not found`);
    assertTenantAccess(ctx, plugin.tenantId);
    return plugin;
  }

  async register(ctx: CallerCtx, body: {
    pluginCode: string; pluginName: string; version: string;
    description?: string; author?: string; homepage?: string;
    hooks?: string[]; menus?: any[]; routes?: any[]; permissions?: string[]; config?: any;
  }) {
    const tenantId = ctx.tenantId ?? null;
    const [plugin] = await db.insert(pluginRegistryTable).values({
      tenantId,
      pluginCode: body.pluginCode,
      pluginName: body.pluginName,
      version: body.version,
      description: body.description ?? null,
      author: body.author ?? null,
      homepage: body.homepage ?? null,
      hooks: body.hooks ?? [],
      menus: body.menus ?? [],
      routes: body.routes ?? [],
      permissions: body.permissions ?? [],
      config: body.config ?? {},
    }).returning();
    return plugin;
  }

  async update(ctx: CallerCtx, id: string, body: Partial<{ status: string; config: any; version: string; description: string }>) {
    await this.findOne(ctx, id); // findOne already asserts tenant access
    const [updated] = await db
      .update(pluginRegistryTable)
      .set(body as any)
      .where(eq(pluginRegistryTable.id, id))
      .returning();
    return updated;
  }

  getSdkSpec() {
    return PLUGIN_SDK_SPEC;
  }
}
