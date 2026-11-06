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
  | 'head_chef'
  | 'chief_chef'
  | 'chief_officer'
  | 'barman'
  | 'barista'
  | 'beverage_staff'
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
    description: 'Full system administration, user management, audit logs, and hotel configuration.',
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
    portalTitle: 'Waiter Station',
    testEmail: 'waiter@nexushms.com',
  },
  head_chef: {
    category: 'head_chef',
    name: 'Head Chef Officer',
    badge: 'Head Chef & Culinary Director',
    description: 'Direct executive culinary oversight, recipe standards, kitchen station command, and food quality dispatch.',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    portalTitle: 'Head Chef Kitchen Command',
    testEmail: 'headchef.officer@nexushms.com',
  },
  chief_chef: {
    category: 'chief_chef',
    name: 'Chief Chef',
    badge: 'Chief Chef & Cook',
    description: 'Food preparation specialist: Starts cooking line preparation and executes kitchen line dishes.',
    badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    portalTitle: 'Kitchen Line Station',
    testEmail: 'chief.chef@nexushms.com',
  },
  chief_officer: {
    category: 'chief_officer',
    name: 'Chief Officer',
    badge: 'Chief Operating Officer',
    description: 'Executive leadership across hotel operations: culinary, dining, front office, inventory, and operations.',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    portalTitle: 'Chief Officer Executive Portal',
    testEmail: 'chief.officer@nexushms.com',
  },
  barista: {
    category: 'barista',
    name: 'Barista',
    badge: 'Barista & Coffee Station',
    description: 'Espresso, traditional Ethiopian Buna ceremony, and specialty coffee pass.',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    portalTitle: 'Coffee & Barista Station',
    testEmail: 'barista@nexushms.com',
  },
  beverage_staff: {
    category: 'beverage_staff',
    name: 'Beverage Staff',
    badge: 'Fresh Juices & Cold Drinks',
    description: 'Fresh fruit juices, Spris, soft drinks, and cold beverage pass.',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    portalTitle: 'Juice & Beverage Bar',
    testEmail: 'beverages@nexushms.com',
  },
  barman: {
    category: 'barman',
    name: 'Bar Man',
    badge: 'Bar Man & Bartender',
    description: 'Direct beverage and bar management: Bar display system (BDS), drink preparation, espresso bar, and bar pass ready buzzer.',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    portalTitle: 'Bar Display System (BDS)',
    testEmail: 'barman@nexushms.com',
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
  if (r.includes('head chef') || r.includes('headchef')) return 'head_chef';
  if (r.includes('chief officer') || r === 'chief' || r.includes('chief op') || /\bcoo\b/.test(r)) return 'chief_officer';
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
    r.includes('reservation') || r.includes('concierge') || r.includes('vip concierge') ||
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
  // Dedicated Kitchen Officer
  if (
    r.includes('kitchen officer') ||
    r.includes('kitchen manager') ||
    r.includes('kitchen supervisor')
  ) {
    return 'kitchen_officer';
  }
  // Dedicated Head Chef Officer
  if (
    r.includes('head chef') ||
    r.includes('headchef') ||
    r.includes('executive chef')
  ) {
    return 'head_chef';
  }
  // Dedicated Chief Chef / Line Cook
  if (
    r.includes('chief chef') ||
    r.includes('chiefchef') ||
    r.includes('line chef') ||
    r.includes('station chef') ||
    r.includes('sous chef') ||
    r.includes('cook') ||
    r === 'chef'
  ) {
    return 'chief_chef';
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
  // Dedicated Barman / Bartender
  if (
    r.includes('barman') ||
    r.includes('bartender') ||
    r.includes('bar staff') ||
    r === 'bar'
  ) {
    return 'barman';
  }
  // Dedicated Barista / Coffee Attendant
  if (
    r.includes('barista') ||
    r.includes('coffee') ||
    r.includes('buna')
  ) {
    return 'barista';
  }
  // Dedicated Beverage Staff / Juice Bar
  if (
    r.includes('beverage') ||
    r.includes('juice')
  ) {
    return 'beverage_staff';
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

export interface UserWithPermissions {
  role?: string;
  roleName?: string;
  roleScope?: string;
  permissions?: string[];
}

export const ROUTE_PERMISSION_MAP: Record<string, string[]> = {
  '/hotel': ['hotel:*'],
  '/branches': ['hotel:*', 'branches:*'],
  '/rooms': ['rooms:*'],
  '/room-configs': ['rooms:*'],
  '/guests': ['guests:*'],
  '/qr-codes': ['guests:*', 'front-office:*'],
  '/reservations': ['reservations:*'],
  '/reservations/calendar': ['reservations:*'],
  '/availability': ['reservations:*', 'rooms:*'],
  '/walk-in': ['reservations:*', 'front-office:*'],
  '/check-in': ['reservations:*', 'front-office:*'],
  '/check-out': ['reservations:*', 'front-office:*'],
  '/stay': ['front-office:*', 'reservations:*', 'room-service:*'],
  '/front-office': ['front-office:*'],
  '/housekeeping': ['housekeeping:*'],
  '/maintenance': ['maintenance:*'],
  '/restaurant': ['restaurant:*'],
  '/kitchen': ['kitchen:*'],
  '/bar': ['bar:*'],
  '/coffee': ['coffee:*', 'barista:*'],
  '/beverages': ['beverages:*', 'juice:*'],
  '/coordinator': ['coordinator:*'],
  '/staff-supplies': ['supplies:*', 'housekeeping:*', 'restaurant:*', 'bar:*', 'coffee:*', 'beverages:*', 'kitchen:*', 'maintenance:*', 'coordinator:*', 'storekeeper:*'],
  '/cashier': ['cashier:*', 'pos:*', 'pos:payment', 'pos:orders:read'],
  '/pos': ['pos:*'],
  '/room-service': ['room-service:*', 'restaurant:*'],
  '/invoices': ['invoices:*', 'financial:*'],
  '/payments': ['payments:*', 'financial:*'],
  '/inventory': ['inventory:*'],
  '/procurement': ['procurement:*'],
  '/financial': ['financial:*'],
  '/conference': ['conference:*'],
  '/transport': ['transport:*'],
  '/customer-service': ['customer-service:*'],
  '/documents': ['documents:*'],
  '/hr': ['hr:*', 'staff:*'],
  '/users': ['users:*', 'roles:*'],
  '/roles': ['roles:*'],
  '/audit-logs': ['audit:*', 'roles:*'],
  '/reports': ['reports:*'],
};

/**
 * Checks whether a given path is authorized for a specific role category or user permissions.
 * Strictly separates Restaurant Manager vs Waiter vs Cashier vs Housekeeping vs Front Desk.
 */
export function isRouteAuthorized(
  roleOrUser: string | UserWithPermissions | undefined | null,
  pathname: string,
  explicitPermissions?: string[]
): boolean {
  if (!roleOrUser) return false;

  const roleName = typeof roleOrUser === 'string' ? roleOrUser : (roleOrUser.roleName || roleOrUser.role || '');
  const userPermissions = Array.isArray(explicitPermissions)
    ? explicitPermissions
    : typeof roleOrUser === 'object' && Array.isArray(roleOrUser.permissions)
    ? roleOrUser.permissions
    : null;

  const cleanPath = pathname.split('?')[0];

  // Base dashboard, notifications, search, and profile are accessible to all authenticated staff
  if (
    cleanPath === '/dashboard' ||
    cleanPath === '/notifications' ||
    cleanPath === '/search' ||
    cleanPath === '/profile'
  ) {
    return true;
  }

  // System Administrator / Super Admin has unrestricted access to all routes
  const isSuperAdmin: boolean = Boolean(
    roleName.toLowerCase() === 'admin' ||
    roleName.toLowerCase() === 'system admin' || roleName.toLowerCase() === 'system administrator' ||
    userPermissions?.includes('*')
  );

  if (isSuperAdmin) return true;

  const category = normalizeRole(roleName);
  if (category === 'admin') return true;

  // 1. Waiter Station (/restaurant): Strictly restricted to Waiter (and SuperAdmin)
  // Floor table ordering, guest pacing, and food delivery are exclusive to the floor waiter.
  if (cleanPath === '/restaurant' || cleanPath.startsWith('/restaurant/')) {
    return category === 'waiter' || isSuperAdmin;
  }

  // 2. Point of Sale Terminal (/pos): Strictly restricted to Cashier, Hotel Manager, and Restaurant Manager (and SuperAdmin)
  // Floor waiters, kitchen officers, housekeeping, maintenance, and front desk are excluded from POS terminal.
  if (cleanPath === '/pos' || cleanPath.startsWith('/pos/')) {
    return ['cashier', 'manager', 'restaurant_manager'].includes(category) || isSuperAdmin;
  }

  // Dynamic Permission Check: If user has explicitly defined permissions, check them first
  if (userPermissions && userPermissions.length > 0) {
    let requiredPerms: string[] | undefined = undefined;

    for (const [routePrefix, perms] of Object.entries(ROUTE_PERMISSION_MAP)) {
      if (cleanPath === routePrefix || cleanPath.startsWith(routePrefix + '/')) {
        requiredPerms = perms;
        break;
      }
    }

    if (requiredPerms && requiredPerms.length > 0) {
      const hasPerm = requiredPerms.some((req) => {
        if (userPermissions.includes('*')) return true;
        if (userPermissions.includes(req)) return true;
        if (req.includes(':')) {
          const [domain] = req.split(':');
          if (userPermissions.includes(domain + ':*')) return true;
          if (userPermissions.some((p) => p.startsWith(domain + ':'))) return true;
        }
        return false;
      });
      if (hasPerm) return true;
    }
  }

  // Fallback to role-category checks
  if (category === 'manager') {
    const restrictedForManager = [
      '/roles',
      '/restaurant',
    ];
    return !restrictedForManager.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  // Front Desk / Receptionist / Guest Relations / Front Desk Officer:
  if (category === 'receptionist' || category === 'front_desk_officer') {
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
      '/transport',
      '/documents',
      '/customer-service',
      '/reports',
    ];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  // Housekeeping: Strictly Room Turnaround & Cleaning + Staff Supplies Requisitions
  if (category === 'housekeeping') {
    const allowed = ['/dashboard', '/housekeeping', '/rooms', '/customer-service', '/staff-supplies'];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  // Maintenance: Strictly Engineering & Repairs (NO POS, NO Restaurant, NO Cashier)
  if (category === 'maintenance') {
    const allowed = ['/dashboard', '/maintenance', '/rooms', '/inventory', '/staff-supplies'];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }
  if (category === 'cashier') {
    const allowed = [
      '/dashboard',
      '/cashier',
      '/pos',
      '/invoices',
      '/payments',
    ];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  // Restaurant Manager: F&B Executive Operations & Oversight (Dashboard, POS Terminal, Inventory, Reports)
  if (category === 'restaurant_manager') {
    const allowed = [
      '/dashboard',
      '/pos',
      '/inventory',
      '/staff-supplies',
      '/reports',
    ];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  // Kitchen Officer: Strictly Kitchen Command Center & KDS (NO Floor Waiter POS, NO Coordinator Buffer)
  if (category === 'chief_officer') return true;
  if (category === 'barman') {
    const allowed = ['/dashboard', '/bar', '/staff-supplies'];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }
  if (category === 'barista') {
    const allowed = ['/dashboard', '/coffee', '/staff-supplies'];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }
  if (category === 'beverage_staff') {
    const allowed = ['/dashboard', '/beverages', '/staff-supplies'];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }
  if (category === 'kitchen_officer' || category === 'head_chef' || category === 'chief_chef') {
    const allowed = ['/dashboard', '/kitchen', '/staff-supplies'];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  // F&B & Store Coordinator: Dedicated Expediting Buffer, Stock Management & Staff Distribution
  if (category === 'coordinator') {
    const allowed = ['/dashboard', '/coordinator', '/inventory', '/staff-supplies'];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  // Waiter / Floor Server: Dedicated to Floor Table Orders, Waiter Station & Floor Supplies Requisitions
  // (POS terminal access is strictly removed and assigned to Cashier/Managers)
  if (category === 'waiter') {
    const allowed = [
      '/dashboard',
      '/restaurant',
      '/staff-supplies',
    ];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
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
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  if (category === 'storekeeper') {
    const allowed = ['/dashboard', '/inventory', '/procurement', '/staff-supplies'];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  if (category === 'general') {
    const allowed = ['/dashboard', '/staff-supplies'];
    return allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
  }

  return false;
}

/**
 * Kitchen Order Lifecycle Permission Hierarchy:
 * Step 1: Chief Chef clicks "Start Preparation" (Pending -> Cooking)
 *         - Allowed: Chief Chef, Head Chef Officer, Kitchen Officer, Admin/Manager
 * Step 2: Head Chef Officer clicks "Mark as Ready" (Cooking -> Ready)
 *         - Allowed: Head Chef Officer, Kitchen Officer, Admin/Manager
 *         - NOT Allowed: Chief Chef
 * Step 3: Kitchen Officer clicks "Mark as Plated" (Ready -> Plated)
 *         - Allowed: Kitchen Officer ONLY (plus Admin/Manager)
 *         - NOT Allowed: Head Chef Officer, Chief Chef
 * Step 4: Waiter / Coordinator continues serving workflow (Plated -> Served)
 *         - Allowed: Waiter, Coordinator, Admin/Manager
 */
export function canStartPreparation(roleOrUser?: string | UserWithPermissions | null): boolean {
  const roleName = typeof roleOrUser === 'string' ? roleOrUser : (roleOrUser?.roleName || roleOrUser?.role || '');
  if (!roleName) return false;
  const r = roleName.toLowerCase();
  return (
    r.includes('chef') ||
    r.includes('cook') ||
    r.includes('kitchen') ||
    r.includes('admin') ||
    r.includes('manager')
  );
}

export function canMarkOrderReady(roleOrUser?: string | UserWithPermissions | null): boolean {
  const roleName = typeof roleOrUser === 'string' ? roleOrUser : (roleOrUser?.roleName || roleOrUser?.role || '');
  if (!roleName) return false;
  const r = roleName.toLowerCase();
  // Admin / GM
  if (r.includes('admin') || r === 'manager' || r.includes('general manager')) return true;
  // Kitchen Officer can do all roles
  if (r.includes('kitchen officer') || r.includes('kitchen manager') || r.includes('kitchen supervisor')) return true;
  // Head Chef Officer can do Chief Chef + Mark as Ready
  if (r.includes('head chef') || r.includes('headchef') || r.includes('executive chef')) return true;
  // Pure Chief Chef / Cook cannot mark as ready
  return false;
}

export function canMarkOrderPlated(roleOrUser?: string | UserWithPermissions | null): boolean {
  const roleName = typeof roleOrUser === 'string' ? roleOrUser : (roleOrUser?.roleName || roleOrUser?.role || '');
  if (!roleName) return false;
  const r = roleName.toLowerCase();
  // Head Chef Officer and Chief Chef DO NOT have Kitchen Officer plating role
  if (r.includes('head chef') || r.includes('headchef')) return false;
  if (r.includes('chief chef') || (r.includes('cook') && !r.includes('kitchen officer'))) return false;
  // ONLY Kitchen Officer (or Admin/GM)
  return (
    r.includes('kitchen officer') ||
    r.includes('kitchen manager') ||
    r.includes('kitchen supervisor') ||
    r.includes('admin') ||
    r.includes('general manager') ||
    r === 'manager'
  );
}
