/**
 * Phase 4 seed script — runs with plain Node.js
 * Usage: node seed-phase4.js
 */
'use strict';
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function q(sql, params) {
  const res = await pool.query(sql, params);
  return res.rows;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function toDate(d) {
  return d.toISOString().slice(0, 10);
}

async function seedMaintenanceCategories() {
  const count = await q('SELECT count(*) FROM maintenance_categories');
  if (parseInt(count[0].count) > 0) {
    console.log('Maintenance categories already seeded, skipping.');
    return;
  }
  const cats = [
    'Electrical', 'Plumbing', 'Furniture', 'Air Conditioner', 'Television',
    'Internet', 'Door Lock', 'Bathroom', 'Painting', 'General Repair',
  ];
  for (const name of cats) {
    await q(
      'INSERT INTO maintenance_categories (id, name, is_active, created_at, updated_at) VALUES ($1, $2, true, now(), now())',
      [randomUUID(), name],
    );
  }
  console.log(`Seeded ${cats.length} maintenance categories.`);
}

async function seedRestaurantTables() {
  const count = await q('SELECT count(*) FROM restaurant_tables');
  if (parseInt(count[0].count) >= 60) {
    console.log('Restaurant tables already seeded, skipping.');
    return;
  }
  const capacities = [2, 4, 4, 6, 8];
  const sections = ['main_hall', 'terrace', 'private', 'bar', 'outdoor'];
  for (let i = 1; i <= 60; i++) {
    const cap = capacities[(i - 1) % capacities.length];
    const sec = sections[(i - 1) % sections.length];
    const floor = i <= 20 ? '1' : i <= 40 ? '2' : '3';
    await q(
      `INSERT INTO restaurant_tables (id, table_number, name, capacity, floor, section, status, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'available', true, now(), now())
       ON CONFLICT (table_number) DO NOTHING`,
      [randomUUID(), i, `Table ${i}`, cap, floor, sec],
    );
  }
  console.log('Seeded 60 restaurant tables.');
}

async function seedMenuItems() {
  const count = await q('SELECT count(*) FROM menu_items');
  if (parseInt(count[0].count) >= 100) {
    console.log('Menu items already seeded, skipping.');
    return;
  }

  const items = [
    // breakfast (15)
    ...['Continental Breakfast', 'Eggs Benedict', 'French Toast', 'Pancakes', 'Waffles',
       'Omelette du Chef', 'Full English Breakfast', 'Avocado Toast', 'Granola Bowl',
       'Croissant Sandwich', 'Smoked Salmon Bagel', 'Breakfast Burrito', 'Shakshuka',
       'Acai Bowl', 'Crepes Suzette'].map((n, i) => ({ name: n, cat: 'breakfast', price: rand(8, 22), section: 'hot', prep: 10 + (i % 5) * 5 })),
    // lunch (20)
    ...['Caesar Salad', 'Club Sandwich', 'Chicken Burger', 'Fish and Chips', 'Pasta Carbonara',
       'Grilled Chicken Wrap', 'Mushroom Risotto', 'Margherita Pizza', 'Beef Tacos', 'Soup of the Day',
       'BLT Sandwich', 'Veggie Buddha Bowl', 'Shrimp Tacos', 'Pulled Pork Sandwich', 'Caprese Salad',
       'Greek Salad', 'Chicken Quesadilla', 'Lobster Bisque', 'Turkey Club', 'Noodle Bowl'].map((n, i) => ({ name: n, cat: 'lunch', price: rand(12, 28), section: i % 3 === 0 ? 'cold' : 'hot', prep: 15 + (i % 4) * 5 })),
    // dinner (25)
    ...['Grilled Ribeye Steak', 'Pan-Seared Salmon', 'Rack of Lamb', 'Duck Confit', 'Beef Wellington',
       'Lobster Thermidor', 'Seared Tuna', 'Chicken Parmesan', 'Seafood Paella', 'Vegetable Tagine',
       'Coq au Vin', 'Shrimp Scampi', 'Stuffed Portobello', 'Prime Rib', 'Salmon Teriyaki',
       'Filet Mignon', 'Grilled Sea Bass', 'Lamb Chops', 'Roast Duck', 'Wagyu Burger',
       'Seafood Linguine', 'Chicken Marsala', 'Pork Tenderloin', 'Braised Short Rib', 'Surf and Turf'].map((n, i) => ({ name: n, cat: 'dinner', price: rand(25, 45), section: i % 4 === 0 ? 'grill' : 'hot', prep: 20 + (i % 5) * 5 })),
    // drinks (20)
    ...['Mojito', 'Cosmopolitan', 'Margarita', 'Old Fashioned', 'Gin and Tonic',
       'Pina Colada', 'Daiquiri', 'Negroni', 'Whiskey Sour', 'Aperol Spritz',
       'House Wine Red', 'House Wine White', 'Sparkling Water', 'Craft Beer', 'Mocktail of the Day',
       'Bloody Mary', 'Long Island Iced Tea', 'Moscow Mule', 'Dark and Stormy', 'Bellini'].map((n, i) => ({ name: n, cat: 'drinks', price: rand(6, 18), section: 'bar', prep: 5 })),
    // dessert (15)
    ...['Tiramisu', 'Chocolate Lava Cake', 'Creme Brulee', 'Cheesecake', 'Profiteroles',
       'Panna Cotta', 'Apple Tart', 'Ice Cream Selection', 'Mango Sorbet', 'Baklava',
       'Sticky Toffee Pudding', 'Macarons', 'Churros', 'Berry Pavlova', 'Banana Split'].map((n, i) => ({ name: n, cat: 'dessert', price: rand(8, 16), section: 'bakery', prep: 10 })),
    // coffee (15)
    ...['Espresso', 'Double Espresso', 'Cappuccino', 'Latte', 'Flat White',
       'Americano', 'Macchiato', 'Mocha', 'Cold Brew', 'Iced Latte',
       'Turkish Coffee', 'Irish Coffee', 'Affogato', 'Cortado', 'Vienna Coffee'].map((n, i) => ({ name: n, cat: 'coffee', price: rand(3, 9), section: 'bar', prep: 5 })),
    // juice (15)
    ...['Fresh Orange Juice', 'Apple Juice', 'Mango Juice', 'Pineapple Juice', 'Watermelon Juice',
       'Green Detox Juice', 'Carrot Juice', 'Grapefruit Juice', 'Pomegranate Juice', 'Tomato Juice',
       'Mixed Berry Juice', 'Lemonade', 'Coconut Water', 'Peach Juice', 'Beet Juice'].map((n, i) => ({ name: n, cat: 'juice', price: rand(4, 10), section: 'cold', prep: 5 })),
    // fast_food (15)
    ...['Cheeseburger', 'Double Burger', 'Crispy Chicken Sandwich', 'Hot Dog', 'Nachos',
       'Loaded Fries', 'Onion Rings', 'Mini Sliders', 'Corn Dog', 'Chicken Nuggets',
       'Mozzarella Sticks', 'Quesadilla', 'Spicy Wings', 'Fish Burger', 'Veggie Burger'].map((n, i) => ({ name: n, cat: 'fast_food', price: rand(7, 18), section: 'grill', prep: 10 })),
    // traditional (10)
    ...['Hummus with Pita', 'Fattoush Salad', 'Grilled Kofta', 'Chicken Shawarma', 'Lamb Mansaf',
       'Stuffed Grape Leaves', 'Maqluba', 'Falafel Plate', 'Musakhan', 'Kanafeh'].map((n, i) => ({ name: n, cat: 'traditional', price: rand(10, 25), section: 'hot', prep: 20 })),
  ];

  let seeded = 0;
  for (const item of items) {
    const code = `${item.cat.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}-${seeded}`;
    await q(
      `INSERT INTO menu_items (id, item_code, name, category, kitchen_section, price, preparation_time, is_available, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, now(), now())`,
      [randomUUID(), code, item.name, item.cat, item.section, item.price.toFixed(2), item.prep],
    );
    seeded++;
  }
  console.log(`Seeded ${seeded} menu items.`);
}

async function seedHousekeepingTasks() {
  const count = await q('SELECT count(*) FROM housekeeping_assignments');
  if (parseInt(count[0].count) >= 50) {
    console.log('Housekeeping tasks already seeded, skipping.');
    return;
  }
  const rooms = await q('SELECT id FROM rooms LIMIT 100');
  const users = await q('SELECT id FROM users LIMIT 20');
  if (rooms.length === 0) { console.log('No rooms found, skipping housekeeping.'); return; }
  if (users.length === 0) { console.log('No users found, skipping housekeeping.'); return; }

  const statuses = ['pending', 'assigned', 'in_progress', 'completed', 'ready_for_inspection'];
  const types = ['daily', 'checkout', 'deep', 'emergency', 'inspection'];
  const priorities = ['low', 'normal', 'high', 'urgent'];

  for (let i = 0; i < 100; i++) {
    const room = pick(rooms);
    const staff = pick(users);
    const daysOffset = rand(-30, 7);
    const schedDate = daysOffset >= 0 ? toDate(daysFromNow(daysOffset)) : toDate(daysAgo(-daysOffset));
    const status = pick(statuses);
    const cleaningType = pick(types);
    const priority = pick(priorities);
    const taskNumber = 'HK-' + (Date.now() + i).toString(36).toUpperCase();

    await q(
      `INSERT INTO housekeeping_assignments (id, task_number, room_id, area_type, staff_id, cleaning_type, priority, status, scheduled_date, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 'guest_room', $4, $5, $6, $7, $8, true, now(), now())`,
      [randomUUID(), taskNumber, room.id, staff.id, cleaningType, priority, status, schedDate],
    );
  }
  console.log('Seeded 100 housekeeping tasks.');
}

async function seedMaintenanceRequests() {
  const count = await q('SELECT count(*) FROM maintenance_requests');
  if (parseInt(count[0].count) >= 30) {
    console.log('Maintenance requests already seeded, skipping.');
    return;
  }
  const rooms = await q('SELECT id FROM rooms LIMIT 100');
  const cats = await q('SELECT id FROM maintenance_categories');
  if (rooms.length === 0 || cats.length === 0) { console.log('No rooms/categories, skipping maintenance.'); return; }

  const statuses = ['pending', 'approved', 'assigned', 'in_progress', 'completed', 'waiting_parts'];
  const priorities = ['low', 'medium', 'high', 'critical'];
  const titles = [
    'AC not cooling', 'TV remote missing', 'Leaking faucet', 'Light bulb out',
    'Door lock malfunction', 'WiFi not working', 'Toilet clogged', 'Paint peeling',
    'Chair broken', 'Shower drain blocked', 'Window not closing', 'Safe not opening',
    'Bathroom light flickering', 'Carpet stain', 'Ceiling fan noisy',
  ];

  for (let i = 0; i < 50; i++) {
    const room = pick(rooms);
    const cat = pick(cats);
    const status = pick(statuses);
    const priority = pick(priorities);
    const title = pick(titles);
    const reqNum = 'MT-' + (Date.now() + i).toString(36).toUpperCase();

    await q(
      `INSERT INTO maintenance_requests (id, request_number, room_id, category_id, title, priority, status, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, now(), now())`,
      [randomUUID(), reqNum, room.id, cat.id, title, priority, status],
    );
  }
  console.log('Seeded 50 maintenance requests.');
}

async function seedPosOrders() {
  const count = await q('SELECT count(*) FROM pos_orders');
  if (parseInt(count[0].count) >= 200) {
    console.log('POS orders already seeded, skipping.');
    return;
  }
  const menuItems = await q('SELECT id, name, price FROM menu_items WHERE is_active = true LIMIT 200');
  if (menuItems.length === 0) { console.log('No menu items, skipping POS orders.'); return; }

  const orderTypes = ['dine_in', 'takeaway', 'walk_in'];
  const statuses = ['open', 'paid', 'paid', 'paid', 'served', 'cancelled']; // mostly paid
  const payMethods = ['cash', 'card', 'room_charge'];

  for (let i = 0; i < 500; i++) {
    const daysOffset = rand(0, 60);
    const createdAt = daysAgo(daysOffset);
    const status = pick(statuses);
    const isPaid = status === 'paid';
    const orderType = pick(orderTypes);
    const orderNum = 'POS-' + (Date.now() + i).toString(36).toUpperCase();
    const orderId = randomUUID();

    const itemCount = rand(1, 5);
    const selectedItems = [];
    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const mi = pick(menuItems);
      const qty = rand(1, 3);
      const price = parseFloat(mi.price);
      const total = price * qty;
      subtotal += total;
      selectedItems.push({ id: randomUUID(), menuItemId: mi.id, name: mi.name, quantity: qty, unitPrice: price.toFixed(2), total: total.toFixed(2) });
    }

    const taxRate = 10;
    const serviceChargeRate = 5;
    const taxAmount = subtotal * taxRate / 100;
    const serviceChargeAmount = subtotal * serviceChargeRate / 100;
    const totalAmount = subtotal + taxAmount + serviceChargeAmount;
    const paymentStatus = isPaid ? 'paid' : 'pending';
    const paymentMethod = isPaid ? pick(payMethods) : null;
    const paidAt = isPaid ? createdAt : null;
    const receiptNumber = isPaid ? 'RCP-' + (Date.now() + i).toString(36).toUpperCase() : null;

    await q(
      `INSERT INTO pos_orders (id, order_number, order_type, status, subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount, service_charge_rate, service_charge_amount, total_amount, payment_status, payment_method, paid_at, receipt_number, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'none', '0', '0', $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, $15)`,
      [orderId, orderNum, orderType, status,
       subtotal.toFixed(2), taxRate.toFixed(2), taxAmount.toFixed(2),
       serviceChargeRate.toFixed(2), serviceChargeAmount.toFixed(2), totalAmount.toFixed(2),
       paymentStatus, paymentMethod, paidAt, receiptNumber, createdAt],
    );

    for (const item of selectedItems) {
      await q(
        `INSERT INTO pos_order_items (id, order_id, menu_item_id, name, quantity, unit_price, discount_amount, total, kitchen_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, '0', $7, 'pending', now(), now())`,
        [item.id, orderId, item.menuItemId, item.name, item.quantity, item.unitPrice, item.total],
      );
    }
  }
  console.log('Seeded 500 POS orders.');
}

async function seedRoomServiceRequests() {
  const count = await q('SELECT count(*) FROM room_service_requests');
  if (parseInt(count[0].count) >= 100) {
    console.log('Room service requests already seeded, skipping.');
    return;
  }
  const rooms = await q('SELECT id, number FROM rooms LIMIT 100');
  if (rooms.length === 0) { console.log('No rooms, skipping room service.'); return; }

  const serviceTypes = [
    'food', 'drinks', 'laundry', 'spa', 'taxi', 'airport_pickup', 'airport_dropoff',
    'wake_up_call', 'extra_pillow', 'extra_blanket', 'housekeeping', 'maintenance', 'other',
  ];
  const statuses = ['requested', 'accepted', 'assigned', 'in_progress', 'completed', 'cancelled'];
  const priorities = ['low', 'normal', 'high', 'urgent'];

  const getDept = (st) => {
    if (['food', 'drinks'].includes(st)) return 'restaurant';
    if (st === 'laundry') return 'laundry';
    if (st === 'spa') return 'spa';
    if (['taxi', 'airport_pickup', 'airport_dropoff'].includes(st)) return 'transport';
    if (st === 'housekeeping') return 'housekeeping';
    if (st === 'maintenance') return 'maintenance';
    return 'reception';
  };

  const getSla = (st) => {
    if (['food', 'drinks'].includes(st)) return 30;
    if (st === 'laundry') return 120;
    if (st === 'spa') return 60;
    if (['taxi', 'airport_pickup', 'airport_dropoff'].includes(st)) return 60;
    if (st === 'housekeeping') return 45;
    if (st === 'maintenance') return 90;
    return 30;
  };

  for (let i = 0; i < 200; i++) {
    const room = pick(rooms);
    const serviceType = pick(serviceTypes);
    const department = getDept(serviceType);
    const slaMinutes = getSla(serviceType);
    const status = pick(statuses);
    const priority = pick(priorities);
    const daysOffset = rand(0, 30);
    const createdAt = daysAgo(daysOffset);
    const estimated = new Date(createdAt.getTime() + slaMinutes * 60000);
    const reqNum = 'RS-' + (Date.now() + i).toString(36).toUpperCase();
    const guestNames = ['John Smith', 'Maria Garcia', 'Ahmed Hassan', 'Yuki Tanaka', 'Emma Brown'];

    await q(
      `INSERT INTO room_service_requests (id, request_number, room_id, room_number, guest_name, service_type, department, status, priority, sla_minutes, estimated_completion, charge_amount, charge_to_room, payment_status, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '0', false, 'pending', true, $12, $12)`,
      [randomUUID(), reqNum, room.id, room.number, pick(guestNames),
       serviceType, department, status, priority, slaMinutes, estimated, createdAt],
    );
  }
  console.log('Seeded 200 room service requests.');
}

async function main() {
  try {
    console.log('Starting Phase 4 seed...');
    await seedMaintenanceCategories();
    await seedRestaurantTables();
    await seedMenuItems();
    await seedHousekeepingTasks();
    await seedMaintenanceRequests();
    await seedPosOrders();
    await seedRoomServiceRequests();
    console.log('Phase 4 seed complete!');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
