/**
 * Nexus HMS Enterprise - Role-Based Access Control (RBAC) Architecture
 * Governs navigation visibility, route protection, and dashboard view customization.
 * Strictly enforces Separation of Duties: One Account = One Dedicated Operational Domain.
 */

export type RoleCategory =
  | 'admin'
  | 'manager'
  | 'receptionist'
  | 'housekeeping'
  | 'maintenance'
  | 'cashier'
  | 'restaurant_manager'
  | 'waiter'
  | 'kitchen_officer'
  | 'coordinator'
  | 'restaurant'
  | 'accountant'
  | 'storekeeper'
  | 'front_desk_officer'
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
  front_desk_officer: {
    category: 'front_desk_officer',
    name: 'Front Desk Officer',
    badge: 'Front Desk Officer',
    description: 'Guest check-in/out, stay management, room service order processing, waiter assignments, and folio settlements.',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    portalTitle: 'Front Desk Operations Portal',
    testEmail: 'frontdesk.officer@nexushms.com',
  },
  housekeeping: {
    category: 'housekeeping',
    name: 'Housekeeping',
    badge: 'Housekeeping Staff',
    description: 'Room turnaround status, cleaning inspections, linen replenishment, and inspection.',
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
    badge: 'POS Cashier & Billing',
    description: 'POS billing register, cash & digital settlements, stay invoices, and payment reconciliation.',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    portalTitle: 'Cashier & Settlement Portal',
    testEmail: 'cashier@nexushms.com',
  },
  restaurant_manager: {
    category: 'restaurant_manager',
    name: 'Restaurant Manager',
    badge: 'Restaurant Manager & F&B',
    description: 'Executive Food & Beverage leadership: Revenue overview, menu engineering, table allocation, reservations and AI insights.',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    portalTitle: 'Restaurant & F&B Manager Portal',
    testEmail: 'restaurant.manager@nexushms.com',
  },
  waiter: {
    category: 'waiter',
    name: 'Waiter',
    badge: 'Dining Server & Waiter',
    description: 'Restaurant table order taking, floor dining service, customer care, and kitchen KDS dispatch.',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    portalTitle: 'Dining Server & Waiter Portal',
    testEmail: 'waiter@nexushms.com',
  },
  kitchen_officer: {
    category: 'kitchen_officer',
    name: 'Kitchen Officer',
    badge: 'Kitchen Officer & Chef',
    description: 'Executive culinary control: Kitchen display system (KDS), line stations, cooking progress, and ready notifications.',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
    portalTitle: 'Kitchen',
    testEmail: 'kitchen.officer@nexushms.com',
  },
  coordinator: {
    category: 'coordinator',
    name: 'Coordinator',
    badge: 'F&B Coordinator',
    description: 'Inter-departmental liaison: Order validation, inventory stock verification, and kitchen dispatch buffer.',
    badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    portalTitle: 'Coordinator',
    testEmail: 'coordinator@nexushms.com',
  },
  restaurant: {
    category: 'restaurant',
    name: 'Restaurant',
    badge: 'Dining Server & Waiter',
    description: 'Restaurant dining floor, table allocation, menu availability, and kitchen KDS orders.',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    portalTitle: 'Waiter',
    testEmail: 'waiter@nexushms.com',
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
  if (
    r.includes('restaurant manager') ||
    r.includes('f&b manager') ||
    r.includes('dining manager') ||
    r.includes('food and beverage manager')
  ) {
    return 'restaurant_manager';
  }
  if (r.includes('manager') || r.includes('director') || r.includes('gm')) return 'manager';
  if (
    r.includes('front desk officer') ||
    r.includes('front-desk-officer') ||
    r.includes('frontdesk officer') ||
    r.includes('frontdesk.officer')
  ) {
    return 'front_desk_officer';
  }
  if (
    r.includes('front desk') ||
    r.includes('receptionist') ||
    r.includes('reservation') ||
    r.includes('guest relations') ||
    r.includes('guest services') ||
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
  // Dedicated Cashier (Financial billing & settlement)
  if (r.includes('cashier')) {
    return 'cashier';
  }
  // Dedicated Kitchen Officer & Executive Chef
  if (
    r.includes('kitchen officer') ||
    r.includes('head chef') ||
    r.includes('executive chef') ||
    r.includes('kitchen manager') ||
    r.includes('kitchen supervisor') ||
    r === 'chef'
  ) {
    return 'kitchen_officer';
  }
  // Dedicated F&B Coordinator
  if (
    r.includes('coordinator') ||
    r.includes('f&b coordinator') ||
    r.includes('food coordinator') ||
    r.includes('expediter')
  ) {
    return 'coordinator';
  }
  // Dedicated Waiter / Dining Server
  if (
    r.includes('waiter') ||
    r.includes('server') ||
    r.includes('restaurant staff')
  ) {
    return 'waiter';
  }
  // Standalone 'restaurant' or 'kitchen' fallback
  if (r.includes('restaurant')) {
    return 'restaurant_manager';
  }
  if (r.includes('kitchen')) {
    return 'kitchen_officer';
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
  return ROLE_DEFINITIONS[category] || ROLE_DEFINITIONS.general;
}

/**
 * Checks whether a given path is authorized for a specific role category.
 * Strictly separates Restaurant Manager vs Waiter vs Cashier vs Housekeeping vs Front Desk.
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

  // Front Desk / Receptionist / Guest Relations / Front Desk Officer:
  if (category === 'receptionist' || category === 'front_desk_officer') {
    const allowed = [
      '/dashboard',
      '/guests',
      '/qr-codes',
      '/rooms',
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
      '/transport',
      '/documents',
      '/customer-service',
      '/reports',
    ];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Housekeeping: Strictly Room Turnaround & Cleaning + Staff Supplies Requisitions
  if (category === 'housekeeping') {
    const allowed = ['/dashboard', '/housekeeping', '/rooms', '/customer-service', '/staff-supplies'];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Maintenance: Strictly Engineering & Repairs (NO POS, NO Restaurant, NO Cashier)
  if (category === 'maintenance') {
    const allowed = ['/dashboard', '/maintenance', '/rooms', '/inventory', '/staff-supplies'];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Cashier: Dedicated to Billing, Settlement Register, Invoices & Payments (NO Restaurant Floor, NO Housekeeping)
  if (category === 'cashier') {
    const allowed = [
      '/dashboard',
      '/cashier',
      '/pos',
      '/invoices',
      '/payments',
    ];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Restaurant Manager: F&B Executive Operations & Oversight (Dashboard, Floor Operations, Inventory, Reports)
  if (category === 'restaurant_manager') {
    const allowed = [
      '/dashboard',
      '/restaurant',
      '/inventory',
      '/staff-supplies',
      '/reports',
    ];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Kitchen Officer: Strictly Kitchen Command Center & KDS (NO Floor Waiter POS, NO Coordinator Buffer)
  if (category === 'kitchen_officer') {
    const allowed = ['/dashboard', '/kitchen', '/staff-supplies'];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // F&B & Store Coordinator: Dedicated Expediting Buffer, Stock Management & Staff Distribution
  if (category === 'coordinator') {
    const allowed = ['/dashboard', '/coordinator', '/inventory', '/staff-supplies'];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  // Waiter / Floor Server: Dedicated to Floor Table Orders, Waiter POS & Floor Supplies Requisitions
  if (category === 'waiter') {
    const allowed = [
      '/dashboard',
      '/restaurant',
      '/pos',
      '/staff-supplies',
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
    const allowed = ['/dashboard', '/inventory', '/procurement', '/staff-supplies'];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  if (category === 'general') {
    const allowed = ['/dashboard', '/staff-supplies'];
    return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  return false;
}
