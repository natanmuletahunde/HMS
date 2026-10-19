import { pool } from './db-helper';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

async function setupRoleAccounts() {
  console.log('🔧 Setting up standard role accounts with clean passwords...');

  const passwordHash = bcrypt.hashSync('Nexus@1234', 10);

  // 1. Define standard roles with full module permissions
  const standardRoles = [
    {
      name: 'Admin',
      description: 'Full system administrator',
      permissions: ['*'],
    },
    {
      name: 'Front Desk',
      description: 'Front desk reception, check-in, keycards, guest intake and billing',
      permissions: [
        'guests:*',
        'reservations:*',
        'rooms:*',
        'checkins:*',
        'checkouts:*',
        'stay-management:*',
        'invoices:*',
        'payments:*',
        'notifications:*',
      ],
    },
    {
      name: 'Housekeeping',
      description: 'Housekeeping board, room turnaround statuses, and linen inspections',
      permissions: ['housekeeping:*', 'rooms:read', 'rooms:update', 'notifications:read'],
    },
    {
      name: 'Maintenance',
      description: '6-stage engineering tickets, facility repairs, and asset maintenance',
      permissions: ['maintenance:*', 'rooms:read', 'rooms:update', 'notifications:read'],
    },
    {
      name: 'Cashier',
      description: 'POS cashier, restaurant tables, room service orders and guest folio charges',
      permissions: [
        'pos:*',
        'restaurant:*',
        'room-service:*',
        'invoices:*',
        'payments:*',
        'financial:read',
      ],
    },
    {
      name: 'Manager',
      description: 'General management, accounting ledger, procurement and executive BI',
      permissions: [
        'hotel:*',
        'financial:*',
        'procurement:*',
        'inventory:*',
        'reports:*',
        'bi:*',
        'employees:*',
        'users:read',
        'roles:read',
      ],
    },
  ];

  const roleMap: Record<string, string> = {};

  for (const r of standardRoles) {
    const existing = await pool.query('SELECT id FROM roles WHERE name = $1', [r.name]);
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await pool.query(
        'UPDATE roles SET description = $1, permissions = $2, is_active = true WHERE id = $3',
        [r.description, r.permissions, id]
      );
      roleMap[r.name] = id;
    } else {
      const id = randomUUID();
      await pool.query(
        'INSERT INTO roles (id, name, description, permissions, is_active) VALUES ($1, $2, $3, $4, true)',
        [id, r.name, r.description, r.permissions]
      );
      roleMap[r.name] = id;
    }
  }

  // 2. Define users for each role
  const standardUsers = [
    {
      email: 'receptionist@nexushms.com',
      firstName: 'Tigist',
      lastName: 'Kebede',
      phone: '+251-911-100200',
      roleName: 'Front Desk',
    },
    {
      email: 'housekeeper@nexushms.com',
      firstName: 'Genet',
      lastName: 'Alemu',
      phone: '+251-911-300400',
      roleName: 'Housekeeping',
    },
    {
      email: 'maintenance@nexushms.com',
      firstName: 'Dawit',
      lastName: 'Mekonnen',
      phone: '+251-911-500600',
      roleName: 'Maintenance',
    },
    {
      email: 'cashier@nexushms.com',
      firstName: 'Yohannes',
      lastName: 'Bekele',
      phone: '+251-911-700800',
      roleName: 'Cashier',
    },
    {
      email: 'manager@nexushms.com',
      firstName: 'Solomon',
      lastName: 'Tekle',
      phone: '+251-911-900100',
      roleName: 'Manager',
    },
  ];

  for (const u of standardUsers) {
    const roleId = roleMap[u.roleName];
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE users 
         SET first_name = $1, last_name = $2, phone = $3, role_id = $4, password_hash = $5, is_active = true, is_on_duty = true 
         WHERE email = $6`,
        [u.firstName, u.lastName, u.phone, roleId, passwordHash, u.email]
      );
      console.log(`✅ Updated account: ${u.email} (${u.roleName})`);
    } else {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, is_active, is_on_duty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)`,
        [randomUUID(), u.email, passwordHash, u.firstName, u.lastName, u.phone, roleId]
      );
      console.log(`✅ Created account: ${u.email} (${u.roleName})`);
    }
  }

  console.log('\n🎉 ALL ROLE ACCOUNTS ARE READY!');
  await pool.end();
}

setupRoleAccounts().catch(console.error);
