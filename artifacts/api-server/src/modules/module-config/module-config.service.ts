import { Injectable } from '@nestjs/common';
import { eq, and, isNull, getTableColumns } from 'drizzle-orm';
import { db, moduleConfigsTable } from '@workspace/db';
import { CallerCtx, isPlatformAdmin } from '../../common/context/tenant-context';

const DEFAULT_MODULES = [
  { moduleCode: 'reservations',     moduleName: 'Reservations',     description: 'Guest reservation management', icon: 'CalendarCheck',   category: 'core',       isCore: true },
  { moduleCode: 'front-office',     moduleName: 'Front Office',     description: 'Check-in, check-out, walk-in', icon: 'LayoutDashboard', category: 'core',       isCore: true },
  { moduleCode: 'rooms',            moduleName: 'Rooms',            description: 'Room inventory management',    icon: 'BedDouble',       category: 'core',       isCore: true },
  { moduleCode: 'guests',           moduleName: 'Guests',           description: 'Guest profiles and history',   icon: 'Users',           category: 'core',       isCore: true },
  { moduleCode: 'housekeeping',     moduleName: 'Housekeeping',     description: 'Room cleaning and tasks',      icon: 'Sparkles',        category: 'operations', isCore: false },
  { moduleCode: 'maintenance',      moduleName: 'Maintenance',      description: 'Repair and maintenance requests', icon: 'Wrench',       category: 'operations', isCore: false },
  { moduleCode: 'restaurant',       moduleName: 'Restaurant',       description: 'F&B and table management',     icon: 'UtensilsCrossed', category: 'operations', isCore: false },
  { moduleCode: 'pos',              moduleName: 'Point of Sale',    description: 'POS terminal and orders',      icon: 'ShoppingCart',    category: 'operations', isCore: false },
  { moduleCode: 'room-service',     moduleName: 'Room Service',     description: 'In-room dining orders',        icon: 'UtensilsCrossed', category: 'operations', isCore: false },
  { moduleCode: 'inventory',        moduleName: 'Inventory',        description: 'Stock and inventory control',  icon: 'Package',         category: 'business',   isCore: false },
  { moduleCode: 'procurement',      moduleName: 'Procurement',      description: 'Purchasing and suppliers',     icon: 'ShoppingBag',     category: 'business',   isCore: false },
  { moduleCode: 'financial',        moduleName: 'Financial',        description: 'Accounting and transactions',  icon: 'DollarSign',      category: 'business',   isCore: false },
  { moduleCode: 'conference',       moduleName: 'Conference',       description: 'Meeting room bookings',        icon: 'Building2',       category: 'business',   isCore: false },
  { moduleCode: 'transport',        moduleName: 'Transport',        description: 'Vehicle and driver management',icon: 'Car',             category: 'business',   isCore: false },
  { moduleCode: 'hr',               moduleName: 'Human Resources',  description: 'Attendance, leaves and payroll', icon: 'Users2',       category: 'business',   isCore: false },
  { moduleCode: 'customer-service', moduleName: 'Customer Service', description: 'Complaints and feedback',      icon: 'MessageSquare',   category: 'enterprise', isCore: false },
  { moduleCode: 'reports',          moduleName: 'Reports',          description: 'Business intelligence reports', icon: 'BarChart2',      category: 'enterprise', isCore: false },
  { moduleCode: 'documents',        moduleName: 'Documents',        description: 'Document storage and management', icon: 'FolderOpen',  category: 'enterprise', isCore: false },
];

@Injectable()
export class ModuleConfigService {
  async findAll(ctx: CallerCtx) {
    // Platform admins see global (null-tenantId) configs; regular users see their tenant + globals
    let rows = await db
      .select(getTableColumns(moduleConfigsTable))
      .from(moduleConfigsTable);

    if (!isPlatformAdmin(ctx)) {
      rows = rows.filter((r) => r.tenantId === ctx.tenantId || r.tenantId === null);
    }

    // Merge with defaults for any missing modules
    const existing = new Set(rows.map((r) => r.moduleCode));
    const merged = [...rows];
    for (const def of DEFAULT_MODULES) {
      if (!existing.has(def.moduleCode)) {
        merged.push({ ...def, id: def.moduleCode, tenantId: null, settings: {}, version: '1.0.0', dependencies: [], createdAt: new Date(), updatedAt: new Date(), isEnabled: true, isInstalled: true } as any);
      }
    }
    return merged.sort((a, b) => a.moduleName.localeCompare(b.moduleName));
  }

  async toggle(ctx: CallerCtx, moduleCode: string, body: { isEnabled?: boolean; settings?: any }) {
    // Server-derived tenantId — never trust body.tenantId
    const tenantId = ctx.tenantId ?? null;

    const [existing] = await db
      .select(getTableColumns(moduleConfigsTable))
      .from(moduleConfigsTable)
      .where(
        tenantId
          ? and(eq(moduleConfigsTable.moduleCode, moduleCode), eq(moduleConfigsTable.tenantId, tenantId))
          : and(eq(moduleConfigsTable.moduleCode, moduleCode), isNull(moduleConfigsTable.tenantId)),
      );

    if (existing) {
      const [updated] = await db
        .update(moduleConfigsTable)
        .set({ isEnabled: body.isEnabled ?? existing.isEnabled, settings: body.settings ?? existing.settings })
        .where(eq(moduleConfigsTable.id, existing.id))
        .returning();
      return updated;
    }

    const def = DEFAULT_MODULES.find((d) => d.moduleCode === moduleCode);
    const [created] = await db
      .insert(moduleConfigsTable)
      .values({
        tenantId,
        moduleCode,
        moduleName: def?.moduleName ?? moduleCode,
        description: def?.description ?? null,
        icon: def?.icon ?? null,
        category: def?.category ?? 'operations',
        isEnabled: body.isEnabled ?? true,
        isInstalled: true,
        isCore: def?.isCore ?? false,
        settings: body.settings ?? {},
      })
      .returning();
    return created;
  }

  async getStats(ctx: CallerCtx) {
    const all = await this.findAll(ctx);
    return {
      total: all.length,
      enabled: all.filter((m) => m.isEnabled).length,
      disabled: all.filter((m) => !m.isEnabled).length,
      byCategory: ['core', 'operations', 'business', 'enterprise'].map((cat) => ({
        category: cat,
        count: all.filter((m) => m.category === cat).length,
        enabled: all.filter((m) => m.category === cat && m.isEnabled).length,
      })),
    };
  }
}
