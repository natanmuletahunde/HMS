/**
 * Nexus HMS Enterprise - Role-Based Access Control (RBAC) Architecture
 * Governs navigation visibility, route protection, and dashboard view customization.
 */

export type RoleCategory =
  | 'admin'
  | 'manager'
  | 'receptionist'
  | 'housekeeping'
  | 'maintenance'
  | 'cashier'
  | 'accountant'
  | 'storekeeper'
  | 'general';

export interface RoleInfo {
  category: RoleCategory;
  name: string;
  badge: string;
  description: string;
  badgeClass: string;
  portalTitle: string;
  testEmail: string;
}

export const ROLE_DEFINITIONS: Record<RoleCategory, RoleInfo> = {
  admin: {
    category: 'admin',
    name: 'Admin',
    badge: 'System Admin',
    description: 'Full multi-tenant infrastructure, SaaS subscriptions, security, and global configuration.',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    portalTitle: 'System Administrator Portal',
    testEmail: 'admin@nexushms.com',
  },
  manager: {
    category: 'manager',
    name: 'Manager',
    badge: 'Hotel General Manager',
    description: 'Operational oversight, occupancy KPIs, financial summaries, and department workflows.',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    portalTitle: 'General Manager Portal',
    testEmail: 'manager@nexushms.com',
  },
  receptionist: {
    category: 'receptionist',
    name: 'Front Desk',
    badge: 'Front Desk Receptionist',
    description: 'Guest check-in/out, room allocations, walk-ins, calendar, and folio settlements.',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    portalTitle: 'Front Desk Portal',
    testEmail: 'receptionist@nexushms.com',
  },
  housekeeping: {
    category: 'housekeeping',
    name: 'Housekeeping',
    badge: 'Housekeeping Staff',
    description: 'Room turnaround status, cleaning inspections, linen and amenity replenishment.',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    portalTitle: 'Housekeeping Portal',
    testEmail: 'housekeeper@nexushms.com',
  },
  maintenance: {
    category: 'maintenance',
    name: 'Maintenance',
    badge: 'Maintenance Engineer',
    description: 'Engineering repair work orders, facility inspections, and technical assets.',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    portalTitle: 'Engineering & Maintenance Portal',
    testEmail: 'maintenance@nexushms.com',
  },
  cashier: {
    category: 'cashier',
    name: 'Cashier',
    badge: 'POS Cashier & F&B',
    description: 'Point of sale, restaurant dining tables, room service billing, and shift registers.',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    portalTitle: 'POS & Cashier Portal',
    testEmail: 'cashier@nexushms.com',
  },
  accountant: {
    category: 'accountant',
    name: 'Accountant',
    badge: 'Finance & Accounts',
    description: 'General ledger, folio auditing, payment reconciliation, and financial reports.',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    portalTitle: 'Financial & Accounting Portal',
    testEmail: 'accountant@nexushms.com',
  },
  storekeeper: {
    category: 'storekeeper',
    name: 'Storekeeper',
    badge: 'Inventory & Stores',
    description: 'Warehouse stock levels, purchase requisitions, and inventory audits.',
    badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    portalTitle: 'Stores & Inventory Portal',
    testEmail: 'store@nexushms.com',
  },
  general: {
    category: 'general',
    name: 'Staff',
    badge: 'Hotel Staff',
    description: 'Standard staff profile with personal notifications and duty schedule.',
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    portalTitle: 'Staff Portal',
    testEmail: 'staff@nexushms.com',
  },
};

export function normalizeRole(roleName?: string | null): RoleCategory {
  if (!roleName) return 'general';
  const r = roleName.toLowerCase().trim();

  if (r.includes('admin') || r.includes('super')) return 'admin';
  if (r.includes('manager') || r.includes('director') || r.includes('gm')) return 'manager';
  if (
    r.includes('front desk') ||
    r.includes('receptionist') ||
    r.includes('reservation') ||
    r.includes('concierge') ||
    r.includes('front office')
  ) {
    return 'receptionist';
  }
  if (r.includes('housekeep') || r.includes('cleaning') || r.includes('laundry')) {
    return 'housekeeping';
  }
  if (r.includes('maintenance') || r.includes('technician') || r.includes('engineer')) {
    return 'maintenance';
  }
  if (r.includes('cashier') || r.includes('waiter') || r.includes('bar') || r.includes('restaurant')) {
    return 'cashier';
  }
  if (r.includes('accountant') || r.includes('finance') || r.includes('auditor')) {
    return 'accountant';
  }
  if (r.includes('store') || r.includes('inventory') || r.includes('warehouse')) {
    return 'storekeeper';
  }

  return 'general';
}

export function getRoleInfo(roleName?: string | null): RoleInfo {
  const category = normalizeRole(roleName);
  return ROLE_DEFINITIONS[category];
}

/**
 * Checks whether a given path is authorized for a specific role category.
 */
export function isRouteAuthorized(roleName: string | undefined | null, pathname: string): boolean {
  if (!roleName) return false;
  const category = normalizeRole(roleName);

  // Admin has access to all routes
  if (category === 'admin') return true;

  // Base dashboard, notifications, and search are accessible to all authenticated staff
  if (pathname === '/dashboard' || pathname === '/notifications' || pathname === '/search') {
    return true;
  }

  // Manager: Access to operational, financial, and management routes (excluding SaaS tenant config)
  if (category === 'manager') {
    const restrictedForManager = [
      '/tenants',
      '/organizations',
      '/subscriptions',
      '/module-config',
      '/plugins',
      '/security',
      '/roles',
    ];
    return !restrictedForManager.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Front Desk / Receptionist / Concierge:
  if (category === 'receptionist') {
    const allowed = [
      '/dashboard',
      '/guests',
      '/qr-codes',
      '/rooms',
      '/room-configs',
      '/front-office',
      '/availability',
      '/walk-in',
      '/check-in',
      '/check-out',
      '/stay',
      '/reservations',
      '/reservations/calendar',
      '/invoices',
      '/payments',
      '/room-service',
      '/transport',
      '/documents',
      '/customer-service',
      '/reports',
    ];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Housekeeping:
  if (category === 'housekeeping') {
    const allowed = ['/dashboard', '/housekeeping', '/rooms', '/customer-service'];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Maintenance:
  if (category === 'maintenance') {
    const allowed = ['/dashboard', '/maintenance', '/rooms', '/inventory'];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Cashier / Food & Beverage:
  if (category === 'cashier') {
    const allowed = [
      '/dashboard',
      '/pos',
      '/restaurant',
      '/room-service',
      '/invoices',
      '/payments',
    ];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Accountant / Finance:
  if (category === 'accountant') {
    const allowed = [
      '/dashboard',
      '/financial',
      '/invoices',
      '/payments',
      '/procurement',
      '/reports',
    ];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Storekeeper / Inventory:
  if (category === 'storekeeper') {
    const allowed = ['/dashboard', '/inventory', '/procurement'];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  return false;
}

