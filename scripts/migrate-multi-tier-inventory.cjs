const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Connecting to database...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_locations (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'mini',
      department TEXT NOT NULL DEFAULT 'general',
      managed_by TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inventory_location_stocks (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
      min_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
      reorder_level NUMERIC(10, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'adequate',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(location_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS floor_requisitions (
      id TEXT PRIMARY KEY,
      requisition_number TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      station_name TEXT,
      source_location_id TEXT REFERENCES inventory_locations(id),
      status TEXT NOT NULL DEFAULT 'pending',
      urgency TEXT NOT NULL DEFAULT 'normal',
      notes TEXT,
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS floor_requisition_items (
      id TEXT PRIMARY KEY,
      requisition_id TEXT NOT NULL REFERENCES floor_requisitions(id) ON DELETE CASCADE,
      item_id TEXT REFERENCES inventory_items(id),
      item_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity_requested NUMERIC(10, 2) NOT NULL,
      quantity_issued NUMERIC(10, 2) NOT NULL DEFAULT 0,
      notes TEXT
    );
  `);
  console.log('Tables created successfully!');

  // Seed default locations
  const defaultLocations = [
    { id: 'loc-main-wh', code: 'MAIN_WH', name: 'Main Central Warehouse', type: 'main', department: 'central', managed_by: 'Central Storekeeper' },
    { id: 'loc-mini-rest', code: 'MINI_REST', name: 'Restaurant & Bar Mini Stock', type: 'mini', department: 'restaurant', managed_by: 'F&B Coordinator' },
    { id: 'loc-mini-hk', code: 'MINI_HK', name: 'Housekeeping Floor Mini Stock', type: 'mini', department: 'housekeeping', managed_by: 'Housekeeping Coordinator' }
  ];

  for (const loc of defaultLocations) {
    await pool.query(`
      INSERT INTO inventory_locations (id, code, name, type, department, managed_by, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, managed_by = EXCLUDED.managed_by;
    `, [loc.id, loc.code, loc.name, loc.type, loc.department, loc.managed_by]);
  }
  console.log('Default locations seeded!');

  // Initialize location stocks for existing items if not present
  const itemsRes = await pool.query(`SELECT id, category, current_stock, min_stock, reorder_level FROM inventory_items WHERE is_active = true`);
  console.log(`Populating initial location balances for ${itemsRes.rows.length} existing items...`);

  for (const item of itemsRes.rows) {
    const totalQty = parseFloat(item.current_stock || '0');
    const minQty = parseFloat(item.min_stock || '5');
    const reorderQty = parseFloat(item.reorder_level || '10');

    // Main warehouse gets the bulk
    const mainQty = Math.round(totalQty * 0.75 * 100) / 100;
    const miniQty = Math.max(0, Math.round((totalQty - mainQty) * 100) / 100);

    // Determine target mini stock based on category
    const catLower = (item.category || '').toLowerCase();
    const targetMiniId = catLower.includes('food') || catLower.includes('dining') || catLower.includes('beverage') || catLower.includes('bar')
      ? 'loc-mini-rest'
      : 'loc-mini-hk';

    // Seed main warehouse stock
    const mainStatus = mainQty <= 0 ? 'depleted' : mainQty <= reorderQty ? 'running_low' : 'adequate';
    await pool.query(`
      INSERT INTO inventory_location_stocks (id, location_id, item_id, current_stock, min_stock, reorder_level, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (location_id, item_id) DO NOTHING;
    `, [`stk-main-${item.id}`, 'loc-main-wh', item.id, mainQty, minQty, reorderQty, mainStatus]);

    // Seed mini stock
    const miniStatus = miniQty <= 0 ? 'depleted' : miniQty <= (reorderQty * 0.3) ? 'running_low' : 'adequate';
    await pool.query(`
      INSERT INTO inventory_location_stocks (id, location_id, item_id, current_stock, min_stock, reorder_level, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (location_id, item_id) DO NOTHING;
    `, [`stk-mini-${item.id}`, targetMiniId, item.id, miniQty, Math.round(minQty * 0.3), Math.round(reorderQty * 0.3), miniStatus]);
  }

  console.log('Initial location stocks initialized successfully!');
  await pool.end();
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
