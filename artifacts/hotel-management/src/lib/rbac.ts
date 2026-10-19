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

export function normalizeRole(roleName?: string | null): RoleCategory {
  if (!roleName) return 'general';
  const r = roleName.toLowerCase().trim();

  if (r.includes('admin')) return 'admin';
  if (r.includes('manager') || r.includes('director')) return 'manager';
  if (
    r.includes('front desk') ||
    r.includes('receptionist') ||
    r.includes('reservation') ||
    r.includes('concierge')
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

/**
 * Checks whether a given path is authorized for a specific role category.
 */
export function isRouteAuthorized(roleName: string | undefined | null, pathname: string): boolean {
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
      '/rooms',
      '/front-office',
      '/availability',
      '/walk-in',
      '/check-in',
      '/check-out',
      '/stay',
      '/reservations',
      '/invoices',
      '/payments',
      '/room-service',
      '/transport',
      '/documents',
      '/customer-service',
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
