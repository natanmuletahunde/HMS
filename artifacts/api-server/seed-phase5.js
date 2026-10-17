'use strict';
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rndFloat(min, max, dec = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function tsOffset(days, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function countTable(table) {
  const r = await query(`SELECT count(*)::int as c FROM ${table}`);
  return r.rows[0].c;
}

async function main() {
  console.log('Starting Phase 5 seed...');

  // ── 1. Departments ──────────────────────────────────────────────────────────
  const deptCount = await countTable('departments');
  const deptNames = [
    { name: 'Front Office', code: 'FO' },
    { name: 'Housekeeping', code: 'HK' },
    { name: 'Restaurant', code: 'REST' },
    { name: 'Kitchen', code: 'KIT' },
    { name: 'Maintenance', code: 'MAINT' },
    { name: 'Finance', code: 'FIN' },
    { name: 'HR', code: 'HR' },
    { name: 'Security', code: 'SEC' },
    { name: 'Administration', code: 'ADMIN' },
    { name: 'IT', code: 'IT' },
  ];
  const deptIds = [];
  if (deptCount < 10) {
    console.log('Seeding departments...');
    for (const d of deptNames) {
      try {
        const r = await query(
          `INSERT INTO departments (id, name, code, is_active, created_at, updated_at) VALUES ($1,$2,$3,true,now(),now()) ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code RETURNING id`,
          [randomUUID(), d.name, d.code]
        );
        deptIds.push(r.rows[0].id);
      } catch (e) {
        const r = await query(`SELECT id FROM departments WHERE name = $1`, [d.name]);
        if (r.rows[0]) deptIds.push(r.rows[0].id);
      }
    }
  } else {
    const r = await query(`SELECT id FROM departments ORDER BY name LIMIT 10`);
    r.rows.forEach(row => deptIds.push(row.id));
  }
  console.log(`Departments: ${deptIds.length}`);

  // ── 2. Inventory Categories ──────────────────────────────────────────────
  const catCount = await countTable('inventory_categories');
  const categoryNames = [
    'Food', 'Beverages', 'Cleaning Materials', 'Linen', 'Towels',
    'Toiletries', 'Furniture', 'Equipment', 'Office Supplies', 'Electrical Items',
    'Kitchen Supplies', 'Spare Parts'
  ];
  const categoryIds = [];
  if (catCount < 12) {
    console.log('Seeding inventory categories...');
    for (const name of categoryNames) {
      try {
        const r = await query(
          `INSERT INTO inventory_categories (id, name, is_active, created_at, updated_at) VALUES ($1,$2,true,now(),now()) ON CONFLICT (name) DO NOTHING RETURNING id`,
          [randomUUID(), name]
        );
        if (r.rows[0]) {
          categoryIds.push({ id: r.rows[0].id, name });
        } else {
          const r2 = await query(`SELECT id FROM inventory_categories WHERE name = $1`, [name]);
          if (r2.rows[0]) categoryIds.push({ id: r2.rows[0].id, name });
        }
      } catch (e) {
        const r2 = await query(`SELECT id FROM inventory_categories WHERE name = $1`, [name]);
        if (r2.rows[0]) categoryIds.push({ id: r2.rows[0].id, name });
      }
    }
  } else {
    const r = await query(`SELECT id, name FROM inventory_categories ORDER BY name`);
    r.rows.forEach(row => categoryIds.push({ id: row.id, name: row.name }));
  }
  console.log(`Categories: ${categoryIds.length}`);

  // ── 3. Inventory Items (1000) ─────────────────────────────────────────────
  const itemCount = await countTable('inventory_items');
  const inventoryItemIds = [];
  if (itemCount < 1000) {
    console.log('Seeding inventory items...');
    const itemTemplates = {
      'Food': ['Rice 50kg', 'Sugar 25kg', 'Salt 10kg', 'Flour 50kg', 'Cooking Oil 20L', 'Tomato Paste', 'Pasta 5kg', 'Bread Loaf', 'Eggs Tray', 'Milk 10L'],
      'Beverages': ['Water 500ml', 'Juice Orange 1L', 'Soda Cans', 'Beer Case', 'Wine Red', 'Coffee Beans 1kg', 'Tea Bags 100pk', 'Energy Drink', 'Whiskey 750ml', 'Champagne'],
      'Cleaning Materials': ['Detergent 5L', 'Bleach 5L', 'Floor Cleaner', 'Glass Cleaner', 'Disinfectant 1L', 'Mop Head', 'Broom', 'Dustpan', 'Scrub Brush', 'Gloves Box'],
      'Linen': ['Bed Sheet King', 'Bed Sheet Queen', 'Pillow Case', 'Duvet Cover', 'Blanket', 'Mattress Pad', 'Bed Runner', 'Pillow Inner', 'Comforter', 'Fitted Sheet'],
      'Towels': ['Bath Towel', 'Hand Towel', 'Face Towel', 'Pool Towel', 'Gym Towel', 'Beach Towel', 'Guest Towel', 'Kitchen Towel', 'Spa Towel', 'Foot Mat'],
      'Toiletries': ['Shampoo 300ml', 'Conditioner 300ml', 'Body Wash', 'Soap Bar', 'Toothbrush', 'Toothpaste', 'Razor', 'Shaving Cream', 'Body Lotion', 'Dental Kit'],
      'Furniture': ['Office Chair', 'Dining Chair', 'Side Table', 'Coffee Table', 'Wardrobe', 'Luggage Rack', 'Desk Lamp', 'Floor Lamp', 'Mirror', 'Coat Hanger'],
      'Equipment': ['Vacuum Cleaner', 'Steam Iron', 'Hair Dryer', 'Coffee Machine', 'Mini Fridge', 'Safe Box', 'TV Remote', 'Air Purifier', 'Fan', 'Heater'],
      'Office Supplies': ['A4 Paper Ream', 'Pens Box', 'Stapler', 'Folders', 'Envelopes', 'Ink Cartridge', 'Calculator', 'Tape Roll', 'Scissors', 'Clipboard'],
      'Electrical Items': ['Light Bulb LED', 'Extension Cord', 'USB Hub', 'HDMI Cable', 'Power Strip', 'Batteries AA', 'Batteries AAA', 'Ethernet Cable', 'Phone Charger', 'Smart Plug'],
      'Kitchen Supplies': ['Chef Knife', 'Cutting Board', 'Frying Pan', 'Sauce Pot', 'Mixing Bowl', 'Colander', 'Spatula', 'Ladle', 'Tongs', 'Whisk'],
      'Spare Parts': ['AC Filter', 'Door Handle', 'Lock Cylinder', 'Faucet', 'Shower Head', 'Light Switch', 'Socket Outlet', 'Pipe Joint', 'Valve', 'Gasket']
    };
    const units = { 'Food': 'kg', 'Beverages': 'bottle', 'Cleaning Materials': 'piece', 'Linen': 'piece', 'Towels': 'piece', 'Toiletries': 'piece', 'Furniture': 'piece', 'Equipment': 'piece', 'Office Supplies': 'piece', 'Electrical Items': 'piece', 'Kitchen Supplies': 'piece', 'Spare Parts': 'piece' };

    let batchVals = [];
    let count = 0;
    const existing = await query(`SELECT item_code FROM inventory_items`);
    const existingCodes = new Set(existing.rows.map(r => r.item_code));

    for (const cat of categoryIds) {
      const templates = itemTemplates[cat.name] || [`${cat.name} Item`];
      const unit = units[cat.name] || 'piece';
      const itemsPerCat = Math.ceil(1000 / categoryIds.length);
      for (let i = 0; i < itemsPerCat && count < 1000 - itemCount; i++) {
        const baseName = templates[i % templates.length];
        const itemName = `${baseName} ${i > templates.length - 1 ? i + 1 : ''}`.trim();
        const itemCode = 'ITM-' + Date.now().toString(36).toUpperCase() + count.toString(36).toUpperCase();
        if (existingCodes.has(itemCode)) { count++; continue; }
        const currentStock = rndFloat(0, 500);
        const reorderLevel = rndFloat(10, 50);
        const purchasePrice = rndFloat(1, 200);
        const status = currentStock <= 0 ? 'out_of_stock' : currentStock <= reorderLevel ? 'low_stock' : 'active';
        const id = randomUUID();
        inventoryItemIds.push(id);
        batchVals.push(`('${id}','${itemCode}','${itemName.replace(/'/g,"''")}','${cat.id}','${cat.name}','${unit}','${currentStock}','${reorderLevel}','${reorderLevel * 10}','${reorderLevel}','${purchasePrice}','${(purchasePrice * 1.3).toFixed(2)}','${status}',true,now(),now())`);
        count++;
        if (batchVals.length >= 100) {
          await query(`INSERT INTO inventory_items (id,item_code,name,category_id,category,unit,current_stock,min_stock,max_stock,reorder_level,purchase_price,selling_price,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
          batchVals = [];
        }
      }
    }
    if (batchVals.length > 0) {
      await query(`INSERT INTO inventory_items (id,item_code,name,category_id,category,unit,current_stock,min_stock,max_stock,reorder_level,purchase_price,selling_price,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    }
    console.log(`Added ${count} inventory items`);
  }
  // Fetch all item ids
  const allItems = await query(`SELECT id FROM inventory_items WHERE is_active = true LIMIT 1000`);
  allItems.rows.forEach(r => inventoryItemIds.push(r.id));

  // ── 4. Suppliers (100) ────────────────────────────────────────────────────
  const supplierCount = await countTable('suppliers');
  const supplierIds = [];
  if (supplierCount < 100) {
    console.log('Seeding suppliers...');
    const companies = ['Global Trade', 'Premier Supply', 'Allied Foods', 'Metro Distributors', 'Elite Provisions', 'Pacific Traders', 'Continental Supplies', 'Summit Wholesale', 'Horizon Trading', 'Apex Distributors'];
    const countries = ['Kenya', 'Tanzania', 'Uganda', 'Ethiopia', 'Rwanda', 'South Africa', 'Nigeria', 'Ghana', 'Egypt', 'Morocco'];
    const cities = ['Nairobi', 'Dar es Salaam', 'Kampala', 'Addis Ababa', 'Kigali', 'Johannesburg', 'Lagos', 'Accra', 'Cairo', 'Casablanca'];
    let batchVals = [];
    for (let i = supplierCount; i < 100; i++) {
      const id = randomUUID();
      supplierIds.push(id);
      const code = `SUP-${Date.now().toString(36).toUpperCase()}${i}`;
      const company = `${pick(companies)} ${i + 1} Ltd`;
      const country = pick(countries);
      const city = pick(cities);
      batchVals.push(`('${id}','${code}','${company}','Contact Person ${i + 1}','+2547${rnd(10000000, 99999999)}','supplier${i + 1}@example.com','${city} Street','${city}','${country}',5,'active',true,now(),now())`);
      if (batchVals.length >= 50) {
        await query(`INSERT INTO suppliers (id,supplier_code,company_name,contact_person,phone,email,address,city,country,rating,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
        batchVals = [];
      }
    }
    if (batchVals.length > 0) {
      await query(`INSERT INTO suppliers (id,supplier_code,company_name,contact_person,phone,email,address,city,country,rating,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    }
  }
  const suppliersResult = await query(`SELECT id FROM suppliers WHERE is_active = true LIMIT 100`);
  suppliersResult.rows.forEach(r => supplierIds.push(r.id));
  console.log(`Suppliers: ${supplierIds.length}`);

  // ── 5. Purchase Orders (300) ──────────────────────────────────────────────
  const poCount = await countTable('purchase_orders');
  if (poCount < 300) {
    console.log('Seeding purchase orders...');
    const statuses = ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'];
    let batchVals = [];
    for (let i = poCount; i < 300; i++) {
      const id = randomUUID();
      const poNumber = `PO-${Date.now().toString(36).toUpperCase()}${i}`;
      const supplierId = pick(supplierIds);
      const status = pick(statuses);
      const orderDate = dateOffset(-rnd(0, 180));
      const total = rndFloat(100, 10000);
      batchVals.push(`('${id}','${poNumber}','${supplierId}','${orderDate}','${orderDate}','${status}','${total}','${total}',true,now(),now())`);
      if (batchVals.length >= 50) {
        await query(`INSERT INTO purchase_orders (id,po_number,supplier_id,order_date,expected_delivery,status,subtotal,total_amount,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
        batchVals = [];
      }
    }
    if (batchVals.length > 0) {
      await query(`INSERT INTO purchase_orders (id,po_number,supplier_id,order_date,expected_delivery,status,subtotal,total_amount,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    }
    // Add items for each PO
    const poResult = await query(`SELECT id FROM purchase_orders WHERE is_active = true`);
    let itemBatch = [];
    for (const po of poResult.rows) {
      const itemCount2 = rnd(2, 5);
      for (let j = 0; j < itemCount2; j++) {
        const iid = randomUUID();
        const qty = rnd(1, 100);
        const price = rndFloat(1, 500);
        const total = (qty * price).toFixed(2);
        itemBatch.push(`('${iid}','${po.id}','Item ${j + 1}','piece','${qty}','${price}','${total}')`);
        if (itemBatch.length >= 200) {
          await query(`INSERT INTO purchase_order_items (id,order_id,item_name,unit,quantity_ordered,unit_price,total) VALUES ${itemBatch.join(',')} ON CONFLICT DO NOTHING`);
          itemBatch = [];
        }
      }
    }
    if (itemBatch.length > 0) {
      await query(`INSERT INTO purchase_order_items (id,order_id,item_name,unit,quantity_ordered,unit_price,total) VALUES ${itemBatch.join(',')} ON CONFLICT DO NOTHING`);
    }
    console.log('Purchase orders seeded');
  }

  // ── 6. Conference Halls (10) ──────────────────────────────────────────────
  const hallCount = await countTable('conference_halls');
  const hallIds = [];
  if (hallCount < 10) {
    console.log('Seeding conference halls...');
    const halls = [
      { name: 'Grand Ballroom', capacity: 500, floor: '1', hourlyRate: 500, halfDayRate: 2000, fullDayRate: 3500 },
      { name: 'Board Room A', capacity: 20, floor: '2', hourlyRate: 100, halfDayRate: 400, fullDayRate: 700 },
      { name: 'Board Room B', capacity: 20, floor: '2', hourlyRate: 100, halfDayRate: 400, fullDayRate: 700 },
      { name: 'Executive Suite', capacity: 50, floor: '3', hourlyRate: 200, halfDayRate: 800, fullDayRate: 1400 },
      { name: 'Conference Hall A', capacity: 150, floor: '1', hourlyRate: 300, halfDayRate: 1200, fullDayRate: 2000 },
      { name: 'Conference Hall B', capacity: 120, floor: '1', hourlyRate: 250, halfDayRate: 1000, fullDayRate: 1800 },
      { name: 'Training Room', capacity: 40, floor: '2', hourlyRate: 150, halfDayRate: 600, fullDayRate: 1000 },
      { name: 'Seminar Hall', capacity: 80, floor: '2', hourlyRate: 200, halfDayRate: 800, fullDayRate: 1400 },
      { name: 'Garden Pavilion', capacity: 200, floor: 'G', hourlyRate: 350, halfDayRate: 1400, fullDayRate: 2500 },
      { name: 'VIP Lounge', capacity: 10, floor: '4', hourlyRate: 150, halfDayRate: 600, fullDayRate: 1000 },
    ];
    let batchVals = [];
    for (const h of halls) {
      const id = randomUUID();
      hallIds.push(id);
      batchVals.push(`('${id}','${h.name}','Main Building','${h.floor}',${h.capacity},'${h.hourlyRate}','${h.halfDayRate}','${h.fullDayRate}','available',true,now(),now())`);
    }
    await query(`INSERT INTO conference_halls (id,name,location,floor,capacity,hourly_rate,half_day_rate,full_day_rate,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    console.log('Conference halls seeded');
  }
  const hallsResult = await query(`SELECT id FROM conference_halls WHERE is_active = true`);
  hallsResult.rows.forEach(r => hallIds.push(r.id));
  console.log(`Halls: ${hallIds.length}`);

  // ── 7. Conference Bookings (300) ──────────────────────────────────────────
  const bookingCount = await countTable('conference_bookings');
  if (bookingCount < 300) {
    console.log('Seeding conference bookings...');
    const statuses = ['inquiry', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    const eventTypes = ['conference', 'seminar', 'wedding', 'birthday', 'meeting', 'training'];
    const names = ['John Smith', 'Jane Doe', 'Michael Johnson', 'Sarah Williams', 'Robert Brown', 'Emily Davis', 'David Wilson', 'Lisa Anderson', 'James Taylor', 'Mary Thomas'];
    let batchVals = [];
    for (let i = bookingCount; i < 300; i++) {
      const id = randomUUID();
      const bn = `CB-${Date.now().toString(36).toUpperCase()}${i}`;
      const hallId = pick(hallIds);
      const bookingDate = dateOffset(rnd(-90, 60));
      const startHour = rnd(8, 16);
      const startTime = `${String(startHour).padStart(2,'0')}:00`;
      const endTime = `${String(startHour + rnd(2, 6)).padStart(2,'0')}:00`;
      const status = pick(statuses);
      const rate = rndFloat(500, 3000);
      const total = rate;
      const custName = pick(names).replace(/'/g, "''");
      const eventType = eventTypes[i % eventTypes.length];
      const eventName = `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event ${i + 1}`;
      batchVals.push(`('${id}','${bn}','${hallId}','${custName}','${eventName}','${bookingDate}','${startTime}','${endTime}','${eventType}',${rnd(10, 200)},'${status}','${rate}','${total}',true,now(),now())`);
      if (batchVals.length >= 50) {
        await query(`INSERT INTO conference_bookings (id,booking_number,hall_id,customer_name,event_name,booking_date,start_time,end_time,event_type,attendees,status,hall_rate,total_amount,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
        batchVals = [];
      }
    }
    if (batchVals.length > 0) {
      await query(`INSERT INTO conference_bookings (id,booking_number,hall_id,customer_name,event_name,booking_date,start_time,end_time,event_type,attendees,status,hall_rate,total_amount,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    }
    console.log('Conference bookings seeded');
  }

  // ── 8. Vehicles (30) ─────────────────────────────────────────────────────
  const vehicleCount = await countTable('vehicles');
  const vehicleIds = [];
  if (vehicleCount < 30) {
    console.log('Seeding vehicles...');
    const types = ['sedan', 'suv', 'van', 'minibus'];
    const makes = ['Toyota', 'Nissan', 'Mercedes', 'Ford', 'BMW', 'Volkswagen'];
    const models = { sedan: ['Corolla', 'Camry', 'Altima'], suv: ['Land Cruiser', 'Prado', 'Fortuner'], van: ['Hiace', 'Transit', 'Sprinter'], minibus: ['Coaster', 'Rosa', 'Quantum'] };
    const colors = ['White', 'Black', 'Silver', 'Grey', 'Blue'];
    let batchVals = [];
    for (let i = vehicleCount; i < 30; i++) {
      const id = randomUUID();
      vehicleIds.push(id);
      const vtype = pick(types);
      const make = pick(makes);
      const model = pick(models[vtype]);
      const vnum = `VEH-${String(i + 1).padStart(3, '0')}`;
      const plate = `K${rnd(100, 999)}${String.fromCharCode(65 + rnd(0, 25))}${String.fromCharCode(65 + rnd(0, 25))}`;
      const capacity = vtype === 'minibus' ? rnd(20, 35) : vtype === 'van' ? rnd(10, 14) : vtype === 'suv' ? 7 : 5;
      batchVals.push(`('${id}','${vnum}','${vtype}','${make}','${model}',${new Date().getFullYear() - rnd(0, 8)},'${pick(colors)}',${capacity},'petrol','${plate}','available',true,now(),now())`);
    }
    await query(`INSERT INTO vehicles (id,vehicle_number,vehicle_type,make,model,year,color,capacity,fuel_type,plate_number,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    console.log('Vehicles seeded');
  }
  const vehiclesResult = await query(`SELECT id FROM vehicles WHERE is_active = true`);
  vehiclesResult.rows.forEach(r => vehicleIds.push(r.id));
  console.log(`Vehicles: ${vehicleIds.length}`);

  // ── 9. Drivers (50) ──────────────────────────────────────────────────────
  const driverCount = await countTable('drivers');
  const driverIds = [];
  if (driverCount < 50) {
    console.log('Seeding drivers...');
    const firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Peter', 'Paul', 'George', 'Daniel', 'Henry'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris'];
    let batchVals = [];
    for (let i = driverCount; i < 50; i++) {
      const id = randomUUID();
      driverIds.push(id);
      const code = `DRV-${Date.now().toString(36).toUpperCase()}${i}`;
      const fn = pick(firstNames);
      const ln = pick(lastNames);
      const phone = `+2547${rnd(10000000, 99999999)}`;
      const license = `DL${rnd(100000, 999999)}`;
      const expiry = dateOffset(rnd(180, 730));
      batchVals.push(`('${id}','${code}','${fn}','${ln}','${phone}','${license}','BCE','${expiry}','5.0',0,'available','full_time',true,now(),now())`);
      if (batchVals.length >= 50) {
        await query(`INSERT INTO drivers (id,driver_code,first_name,last_name,phone,license_number,license_type,license_expiry,rating,total_trips,status,availability,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
        batchVals = [];
      }
    }
    if (batchVals.length > 0) {
      await query(`INSERT INTO drivers (id,driver_code,first_name,last_name,phone,license_number,license_type,license_expiry,rating,total_trips,status,availability,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    }
    console.log('Drivers seeded');
  }
  const driversResult = await query(`SELECT id FROM drivers WHERE is_active = true`);
  driversResult.rows.forEach(r => driverIds.push(r.id));
  console.log(`Drivers: ${driverIds.length}`);

  // ── 10. Trips (1000) ──────────────────────────────────────────────────────
  const tripCount = await countTable('trips');
  if (tripCount < 1000) {
    console.log('Seeding trips...');
    const tripTypes = ['airport_pickup', 'airport_dropoff', 'hotel_shuttle', 'city_tour', 'custom', 'transfer'];
    const statuses = ['scheduled', 'assigned', 'started', 'completed', 'cancelled'];
    const locations = ['Jomo Kenyatta Airport', 'Wilson Airport', 'City Centre', 'Westlands', 'Karen', 'Kilimani', 'Gigiri', 'Parklands', 'Lavington', 'Upper Hill'];
    const guestNames = ['John Smith', 'Jane Doe', 'Michael Johnson', 'Sarah Williams', 'Robert Brown'];
    let batchVals = [];
    for (let i = tripCount; i < 1000; i++) {
      const id = randomUUID();
      const tripNum = `TRP-${Date.now().toString(36).toUpperCase()}${i}`;
      const tripType = pick(tripTypes);
      const status = pick(statuses);
      const vehicleId = Math.random() > 0.3 ? `'${pick(vehicleIds)}'` : 'NULL';
      const driverId = Math.random() > 0.3 ? `'${pick(driverIds)}'` : 'NULL';
      const fare = rndFloat(20, 300);
      const scheduledTime = tsOffset(rnd(-60, 30), rnd(0, 23));
      const pickup = pick(locations);
      const dropoff = pick(locations);
      const guestName = pick(guestNames).replace(/'/g, "''");
      batchVals.push(`('${id}','${tripNum}','${tripType}',${vehicleId},${driverId},'${guestName}',1,'${pickup}','${dropoff}','${scheduledTime}','${fare}','0','${fare}','${status}',true,now(),now())`);
      if (batchVals.length >= 100) {
        await query(`INSERT INTO trips (id,trip_number,trip_type,vehicle_id,driver_id,guest_name,passenger_count,pickup_location,dropoff_location,scheduled_time,fare,extra_charges,total_amount,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
        batchVals = [];
      }
    }
    if (batchVals.length > 0) {
      await query(`INSERT INTO trips (id,trip_number,trip_type,vehicle_id,driver_id,guest_name,passenger_count,pickup_location,dropoff_location,scheduled_time,fare,extra_charges,total_amount,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    }
    console.log('Trips seeded');
  }

  // ── 11. Employees (300 total) ─────────────────────────────────────────────
  const empCount = await countTable('employees');
  const employeeIds = [];
  if (empCount < 300) {
    console.log(`Seeding employees (currently ${empCount})...`);
    const firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Robinson', 'Clark', 'Lewis'];
    const positions = {
      'Front Office': ['Receptionist', 'Front Desk Agent', 'Concierge', 'Bell Boy', 'Night Auditor'],
      'Housekeeping': ['Room Attendant', 'Supervisor', 'Laundry Attendant', 'Public Area Cleaner'],
      'Restaurant': ['Waiter', 'Waitress', 'Host', 'Bartender', 'Restaurant Manager'],
      'Kitchen': ['Chef', 'Sous Chef', 'Cook', 'Kitchen Helper', 'Pastry Chef'],
      'Maintenance': ['Technician', 'Plumber', 'Electrician', 'Handyman', 'Engineer'],
      'Finance': ['Accountant', 'Cashier', 'Finance Manager', 'Auditor'],
      'HR': ['HR Officer', 'HR Manager', 'Recruiter', 'Training Officer'],
      'Security': ['Security Guard', 'Security Supervisor', 'CCTV Operator'],
      'Administration': ['Admin Officer', 'Secretary', 'Office Manager', 'Data Entry'],
      'IT': ['IT Support', 'Network Admin', 'IT Manager', 'Developer'],
    };
    const empTypes = ['full_time', 'part_time', 'contract', 'intern'];
    const deptNameArr = Object.keys(positions);
    let batchVals = [];
    for (let i = empCount; i < 300; i++) {
      const id = randomUUID();
      employeeIds.push(id);
      const code = `EMP-${Date.now().toString(36).toUpperCase()}${i}`;
      const fn = pick(firstNames);
      const ln = pick(lastNames);
      const email = `emp.${i + 1}.${Date.now() % 10000}@hotel.com`;
      const deptName = pick(deptNameArr);
      const deptId = deptIds[deptNameArr.indexOf(deptName) % deptIds.length] || deptIds[0];
      const position = pick(positions[deptName]);
      const empType = pick(empTypes);
      const salary = rndFloat(1000, 8000);
      const hiredAt = dateOffset(-rnd(30, 1825));
      batchVals.push(`('${id}','${code}','${fn}','${ln}','${email}','+2547${rnd(10000000,99999999)}','${deptName}','${deptId}','${position}','${empType}','${salary}','${hiredAt}',true,now(),now())`);
      if (batchVals.length >= 50) {
        await query(`INSERT INTO employees (id,employee_code,first_name,last_name,email,phone,department,department_id,position,employment_type,salary,hired_at,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT (email) DO NOTHING`);
        batchVals = [];
      }
    }
    if (batchVals.length > 0) {
      await query(`INSERT INTO employees (id,employee_code,first_name,last_name,email,phone,department,department_id,position,employment_type,salary,hired_at,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT (email) DO NOTHING`);
    }
    console.log('Employees seeded');
  }
  const empResult = await query(`SELECT id FROM employees WHERE is_active = true LIMIT 300`);
  empResult.rows.forEach(r => employeeIds.push(r.id));
  console.log(`Employees: ${employeeIds.length}`);

  // ── 12. Shifts (10) ──────────────────────────────────────────────────────
  const shiftCount = await countTable('shifts');
  const shiftIds = [];
  if (shiftCount < 10) {
    console.log('Seeding shifts...');
    const shifts = [
      { name: 'Morning', code: 'MOR', start: '06:00', end: '14:00', night: false },
      { name: 'Day', code: 'DAY', start: '08:00', end: '17:00', night: false },
      { name: 'Afternoon', code: 'AFT', start: '12:00', end: '20:00', night: false },
      { name: 'Evening', code: 'EVE', start: '14:00', end: '22:00', night: false },
      { name: 'Night', code: 'NGT', start: '22:00', end: '06:00', night: true },
      { name: 'Split A', code: 'SPA', start: '07:00', end: '15:00', night: false },
      { name: 'Split B', code: 'SPB', start: '15:00', end: '23:00', night: false },
      { name: 'Weekend', code: 'WKD', start: '08:00', end: '16:00', night: false },
      { name: 'On Call', code: 'ONC', start: '00:00', end: '23:59', night: false },
      { name: 'Graveyard', code: 'GRV', start: '00:00', end: '08:00', night: true },
    ];
    let batchVals = [];
    for (const s of shifts) {
      const id = randomUUID();
      shiftIds.push(id);
      batchVals.push(`('${id}','${s.name}','${s.code}','${s.start}','${s.end}',30,${s.night},true,now(),now())`);
    }
    await query(`INSERT INTO shifts (id,name,code,start_time,end_time,break_minutes,is_night_shift,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    console.log('Shifts seeded');
  }
  const shiftsResult = await query(`SELECT id FROM shifts WHERE is_active = true`);
  shiftsResult.rows.forEach(r => shiftIds.push(r.id));

  // ── 13. Attendance Records (last 30 days) ─────────────────────────────────
  const attCount = await countTable('attendance_records');
  if (attCount < 5000 && employeeIds.length > 0) {
    console.log('Seeding attendance records...');
    const statuses = ['present', 'present', 'present', 'absent', 'late', 'on_leave'];
    let batchVals = [];
    // Only seed for first 50 employees to keep it manageable
    const sampleEmps = employeeIds.slice(0, 50);
    for (let d = -29; d <= 0; d++) {
      const date = dateOffset(d);
      for (const empId of sampleEmps) {
        // Check if already exists to avoid duplicates
        const status = pick(statuses);
        const clockIn = status !== 'absent' && status !== 'on_leave' ? `'${date}T0${rnd(7, 9)}:${rnd(10, 59)}:00Z'` : 'NULL';
        const clockOut = status !== 'absent' && status !== 'on_leave' ? `'${date}T1${rnd(5, 8)}:${rnd(10, 59)}:00Z'` : 'NULL';
        const worked = status === 'present' ? '8.00' : status === 'late' ? rndFloat(4, 7.5).toFixed(2) : '0.00';
        const id = randomUUID();
        batchVals.push(`('${id}','${empId}','${date}',${clockIn},${clockOut},'${status}','${worked}',true,now(),now())`);
        if (batchVals.length >= 500) {
          await query(`INSERT INTO attendance_records (id,employee_id,attendance_date,clock_in,clock_out,status,worked_hours,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
          batchVals = [];
        }
      }
    }
    if (batchVals.length > 0) {
      await query(`INSERT INTO attendance_records (id,employee_id,attendance_date,clock_in,clock_out,status,worked_hours,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    }
    console.log('Attendance records seeded');
  }

  // ── 14. Cash Registers (3) ────────────────────────────────────────────────
  const regCount = await countTable('cash_registers');
  const registerIds = [];
  if (regCount < 3) {
    console.log('Seeding cash registers...');
    const registers = [
      { name: 'Front Desk', location: 'Lobby' },
      { name: 'Restaurant', location: 'Restaurant Floor' },
      { name: 'Bar', location: 'Bar Area' },
    ];
    let batchVals = [];
    for (const reg of registers) {
      const id = randomUUID();
      registerIds.push(id);
      batchVals.push(`('${id}','${reg.name}','${reg.location}','closed','1000.00','USD',true,now(),now())`);
    }
    await query(`INSERT INTO cash_registers (id,name,location,status,current_balance,currency,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    console.log('Cash registers seeded');
  }
  const regsResult = await query(`SELECT id FROM cash_registers WHERE is_active = true`);
  regsResult.rows.forEach(r => registerIds.push(r.id));

  // ── 15. Financial Transactions (2000) ─────────────────────────────────────
  const txnCount = await countTable('transactions');
  if (txnCount < 2000) {
    console.log('Seeding financial transactions...');
    const txnTypes = ['revenue', 'revenue', 'revenue', 'expense', 'expense'];
    const revenueCategories = ['room_charges', 'restaurant_sales', 'pos_sales', 'conference_bookings', 'transport', 'laundry', 'spa'];
    const expenseCategories = ['payroll', 'maintenance', 'supplies', 'utilities', 'marketing', 'food_and_beverage', 'housekeeping'];
    const paymentMethods = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'mobile_money'];
    let batchVals = [];
    for (let i = txnCount; i < 2000; i++) {
      const id = randomUUID();
      const txnNum = `TXN-${Date.now().toString(36).toUpperCase()}${i}`;
      const txnType = pick(txnTypes);
      const category = txnType === 'revenue' ? pick(revenueCategories) : pick(expenseCategories);
      const amount = rndFloat(50, 5000);
      const payMethod = pick(paymentMethods);
      const txnDate = dateOffset(-rnd(0, 180));
      const desc = `${txnType === 'revenue' ? 'Revenue' : 'Expense'} - ${category}`.replace(/'/g, "''");
      batchVals.push(`('${id}','${txnNum}','${txnType}','${category}','${amount}','USD','${payMethod}','${desc}','${txnDate}','completed',true,now(),now())`);
      if (batchVals.length >= 200) {
        await query(`INSERT INTO transactions (id,transaction_number,transaction_type,category,amount,currency,payment_method,description,transaction_date,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
        batchVals = [];
      }
    }
    if (batchVals.length > 0) {
      await query(`INSERT INTO transactions (id,transaction_number,transaction_type,category,amount,currency,payment_method,description,transaction_date,status,is_active,created_at,updated_at) VALUES ${batchVals.join(',')} ON CONFLICT DO NOTHING`);
    }
    console.log('Transactions seeded');
  }

  console.log('\n✅ Phase 5 seed complete!');
  await pool.end();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
