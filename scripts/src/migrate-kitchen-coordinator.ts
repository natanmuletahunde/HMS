import { pool, query } from './db-helper';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

async function migrateAndSeed() {
  console.log('🚀 Starting migration for Kitchen Officer & Coordinator...');

  // 1. Add columns to restaurant_orders
  console.log('📦 Updating restaurant_orders table columns...');
  await query(`
    ALTER TABLE restaurant_orders
    ADD COLUMN IF NOT EXISTS coordinator_id TEXT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS kitchen_officer_id TEXT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS routed_via TEXT DEFAULT 'direct_kitchen',
    ADD COLUMN IF NOT EXISTS coordinator_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS coordinator_notes TEXT,
    ADD COLUMN IF NOT EXISTS kitchen_notes TEXT,
    ADD COLUMN IF NOT EXISTS notified_party TEXT,
    ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
  `);

  // 2. Insert or update roles
  console.log('🛡️ Creating/Updating Kitchen Officer and Coordinator roles...');
  const newRoles = [
    {
      name: 'Kitchen Officer',
      description: 'Controls all kitchen operations, lines, and staff; handles preparation and ready dispatch',
      permissions: ['kitchen:*', 'restaurant:orders:read', 'restaurant:orders:update', 'inventory:read'],
    },
    {
      name: 'Coordinator',
      description: 'Middleman between waiters and kitchen; verifies order items and inventory before dispatching to kitchen',
      permissions: ['coordinator:*', 'restaurant:orders:read', 'restaurant:orders:update', 'inventory:read', 'inventory:request'],
    },
  ];

  const roleMap: Record<string, string> = {};

  for (const r of newRoles) {
    const existing = await query(`SELECT id FROM roles WHERE LOWER(name) = LOWER($1)`, [r.name]);
    if (existing.length > 0) {
      await query(`UPDATE roles SET permissions = $1, description = $2 WHERE id = $3`, [
        r.permissions,
        r.description,
        existing[0].id,
      ]);
      roleMap[r.name] = existing[0].id;
      console.log(`  ✓ Updated role: ${r.name} (${existing[0].id})`);
    } else {
      const id = randomUUID();
      await query(`INSERT INTO roles (id, name, description, permissions, is_active) VALUES ($1, $2, $3, $4, true)`, [
        id,
        r.name,
        r.description,
        r.permissions,
      ]);
      roleMap[r.name] = id;
      console.log(`  ✓ Created role: ${r.name} (${id})`);
    }
  }

  // Also ensure Waiter and Restaurant Manager role IDs are known
  const waiterRole = await query(`SELECT id FROM roles WHERE LOWER(name) = 'waiter'`);
  if (waiterRole.length > 0) roleMap['Waiter'] = waiterRole[0].id;

  // 3. Create or update users
  console.log('👤 Creating/Updating users for Kitchen Officer and Coordinators...');
  const passwordHash = bcrypt.hashSync('Nexus@1234', 10);

  const usersToSeed = [
    {
      email: 'kitchen.officer@nexushms.com',
      firstName: 'Abel',
      lastName: 'Mekonnen',
      phone: '+251-911-667788',
      roleName: 'Kitchen Officer',
      roleId: roleMap['Kitchen Officer'],
    },
    {
      email: 'coordinator@nexushms.com',
      firstName: 'Helen',
      lastName: 'Haile',
      phone: '+251-911-778899',
      roleName: 'Coordinator',
      roleId: roleMap['Coordinator'],
    },
    {
      email: 'coordinator2@nexushms.com',
      firstName: 'Tigist',
      lastName: 'Kassaye',
      phone: '+251-911-889900',
      roleName: 'Coordinator',
      roleId: roleMap['Coordinator'],
    },
  ];

  for (const u of usersToSeed) {
    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [u.email]);
    if (existing.length > 0) {
      await query(
        `UPDATE users SET first_name = $1, last_name = $2, phone = $3, role_id = $4, password_hash = $5, is_active = true, is_on_duty = true WHERE id = $6`,
        [u.firstName, u.lastName, u.phone, u.roleId, passwordHash, existing[0].id]
      );
      console.log(`  ✓ Updated user: ${u.email} -> Role: ${u.roleName}`);
    } else {
      const id = randomUUID();
      await query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, is_active, is_on_duty) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)`,
        [id, u.email, passwordHash, u.firstName, u.lastName, u.phone, u.roleId]
      );
      console.log(`  ✓ Created user: ${u.email} -> Role: ${u.roleName}`);
    }
  }

  console.log('✅ Migration and seeding completed successfully!');
  await pool.end();
}

migrateAndSeed().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
