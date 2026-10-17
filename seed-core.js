'use strict';
const { Pool } = require('pg');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function q(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function main() {
  console.log('🌱 Starting Core & Phase 2 seed...');

  // 1. Roles
  const roles = [
    { name: 'Admin', description: 'Full system administrator', permissions: ['*'] },
    { name: 'Manager', description: 'Hotel and branch manager', permissions: ['hotel:*', 'reports:*', 'staff:*'] },
    { name: 'Front Desk', description: 'Front desk and reservations', permissions: ['reservations:*', 'guests:*', 'rooms:read'] },
    { name: 'Housekeeping', description: 'Housekeeping staff', permissions: ['housekeeping:*', 'rooms:read'] },
    { name: 'Maintenance', description: 'Maintenance technician', permissions: ['maintenance:*', 'rooms:read'] },
  ];

  let adminRoleId = null;
  for (const r of roles) {
    const existing = await q('SELECT id FROM roles WHERE name = $1', [r.name]);
    let roleId;
    if (existing.length > 0) {
      roleId = existing[0].id;
    } else {
      const res = await q(
        'INSERT INTO roles (id, name, description, permissions, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
        [randomUUID(), r.name, r.description, r.permissions]
      );
      roleId = res[0].id;
    }
    if (r.name === 'Admin') adminRoleId = roleId;
  }
  console.log('✅ Roles seeded, Admin role ID:', adminRoleId);

  // 2. Default Admin User
  const adminEmail = 'admin@nexushms.com';
  const existingAdmin = await q('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existingAdmin.length === 0) {
    const passwordHash = bcrypt.hashSync('Admin@1234', 10);
    const adminUser = await q(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
      [randomUUID(), adminEmail, passwordHash, 'System', 'Admin', '+251-911-000000', adminRoleId]
    );
    console.log('✅ Default Admin created:', adminEmail, adminUser[0].id);
  } else {
    console.log('ℹ️ Admin user already exists:', adminEmail);
  }

  // 3. Hotel
  let hotelId;
  const existingHotel = await q('SELECT id FROM hotels WHERE hotel_code = $1', ['NGH-001']);
  if (existingHotel.length > 0) {
    hotelId = existingHotel[0].id;
  } else {
    const res = await q(
      `INSERT INTO hotels (id, hotel_name, legal_name, hotel_code, email, phone, website, country, region, city, sub_city, address, postal_code, latitude, longitude, description, timezone, currency_code, tax_number, license_number, star_rating, check_in_time, check_out_time, status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, true) RETURNING id`,
      [
        randomUUID(), 'Nexus Grand Hotel', 'Nexus Hospitality PLC', 'NGH-001',
        'info@nexusgrand.com.et', '+251-11-554-4000', 'https://nexusgrand.com.et',
        'Ethiopia', 'Addis Ababa', 'Addis Ababa', 'Bole', 'Bole Road, Near Bole International Airport',
        '1000', '9.0192', '38.7525', 'A premier five-star hotel in the heart of Addis Ababa.',
        'Africa/Addis_Ababa', 'ETB', 'TIN-ET-001234567', 'ETH-HTL-2020-00142',
        5, '14:00', '12:00', 'active'
      ]
    );
    hotelId = res[0].id;
  }
  console.log('✅ Hotel:', hotelId);

  // 4. Branches
  const branchData = [
    { name: 'Nexus Main Branch – Bole', code: 'BRN-BOLE', mgr: 'Alemayehu Tadesse', email: 'bole@nexusgrand.com.et', phone: '+251-11-554-4001', addr: 'Bole Road, Addis Ababa' },
    { name: 'Nexus City Center Branch', code: 'BRN-CITY', mgr: 'Tigist Haile', email: 'city@nexusgrand.com.et', phone: '+251-11-554-4002', addr: 'Churchill Avenue, Addis Ababa' },
  ];
  const branchMap = {};
  for (const b of branchData) {
    const ex = await q('SELECT id FROM branches WHERE branch_code = $1', [b.code]);
    if (ex.length > 0) {
      branchMap[b.code] = ex[0].id;
    } else {
      const res = await q(
        `INSERT INTO branches (id, hotel_id, branch_name, branch_code, manager, email, phone, address, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING id`,
        [randomUUID(), hotelId, b.name, b.code, b.mgr, b.email, b.phone, b.addr, b.name]
      );
      branchMap[b.code] = res[0].id;
    }
  }
  console.log('✅ Branches seeded');

  // 5. Buildings
  const buildingData = [
    { branchId: branchMap['BRN-BOLE'], name: 'Adwa Tower', code: 'BLD-ADWA', floors: 12 },
    { branchId: branchMap['BRN-BOLE'], name: 'Lalibela Wing', code: 'BLD-LALIB', floors: 8 },
    { branchId: branchMap['BRN-CITY'], name: 'Entoto House', code: 'BLD-ENTO', floors: 6 },
  ];
  const bldMap = {};
  for (const b of buildingData) {
    const ex = await q('SELECT id FROM buildings WHERE building_code = $1', [b.code]);
    if (ex.length > 0) {
      bldMap[b.code] = ex[0].id;
    } else {
      const res = await q(
        `INSERT INTO buildings (id, branch_id, building_name, building_code, number_of_floors, is_active)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
        [randomUUID(), b.branchId, b.name, b.code, b.floors]
      );
      bldMap[b.code] = res[0].id;
    }
  }
  console.log('✅ Buildings seeded');

  // 6. Floors
  const floorMap = {};
  for (const bldCode of ['BLD-ADWA', 'BLD-LALIB', 'BLD-ENTO']) {
    const bId = bldMap[bldCode];
    floorMap[bldCode] = [];
    for (let f = 1; f <= 4; f++) {
      const ex = await q('SELECT id FROM floors WHERE building_id = $1 AND floor_number = $2', [bId, f]);
      if (ex.length > 0) {
        floorMap[bldCode].push(ex[0].id);
      } else {
        const res = await q(
          `INSERT INTO floors (id, building_id, floor_number, floor_name, is_active)
           VALUES ($1, $2, $3, $4, true) RETURNING id`,
          [randomUUID(), bId, f, `Floor ${f}`]
        );
        floorMap[bldCode].push(res[0].id);
      }
    }
  }
  console.log('✅ Floors seeded');

  // 7. Room Categories
  const categories = ['Standard', 'Deluxe', 'Suite', 'Executive Suite', 'Presidential Suite'];
  const catMap = {};
  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    const ex = await q('SELECT id FROM room_categories WHERE name = $1', [c]);
    if (ex.length > 0) {
      catMap[c] = ex[0].id;
    } else {
      const res = await q(
        `INSERT INTO room_categories (id, name, description, sort_order, is_active)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [randomUUID(), c, `${c} category rooms`, i + 1]
      );
      catMap[c] = res[0].id;
    }
  }

  // 8. Bed Types
  const bedTypes = [
    { name: 'King Bed', cap: 2 },
    { name: 'Queen Bed', cap: 2 },
    { name: 'Twin Beds', cap: 2 },
    { name: 'Double Bed', cap: 2 },
    { name: 'Single Bed', cap: 1 },
  ];
  const bedMap = {};
  for (let i = 0; i < bedTypes.length; i++) {
    const b = bedTypes[i];
    const ex = await q('SELECT id FROM bed_types WHERE name = $1', [b.name]);
    if (ex.length > 0) {
      bedMap[b.name] = ex[0].id;
    } else {
      const res = await q(
        `INSERT INTO bed_types (id, name, capacity, sort_order, is_active)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [randomUUID(), b.name, b.cap, i + 1]
      );
      bedMap[b.name] = res[0].id;
    }
  }

  // 9. Room Types
  const roomTypes = [
    { name: 'Standard Room', price: '2500.00', maxOcc: '2', adults: 2, children: 1 },
    { name: 'Deluxe King', price: '4500.00', maxOcc: '2', adults: 2, children: 1 },
    { name: 'Executive Suite', price: '7500.00', maxOcc: '3', adults: 3, children: 2 },
    { name: 'Presidential Suite', price: '15000.00', maxOcc: '4', adults: 4, children: 2 },
  ];
  const typeMap = {};
  for (const rt of roomTypes) {
    const ex = await q('SELECT id FROM room_types WHERE name = $1', [rt.name]);
    if (ex.length > 0) {
      typeMap[rt.name] = ex[0].id;
    } else {
      const res = await q(
        `INSERT INTO room_types (id, name, description, base_price, max_occupancy, maximum_adults, maximum_children, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
        [randomUUID(), rt.name, `${rt.name} luxury accommodation`, rt.price, rt.maxOcc, rt.adults, rt.children]
      );
      typeMap[rt.name] = res[0].id;
    }
  }
  console.log('✅ Room Types seeded');

  // 10. Rooms
  const existingRooms = await q('SELECT count(*) FROM rooms');
  if (parseInt(existingRooms[0].count) === 0) {
    const rtKeys = Object.keys(typeMap);
    let roomNum = 101;
    for (const bldCode of Object.keys(floorMap)) {
      const bId = bldMap[bldCode];
      for (const floorId of floorMap[bldCode]) {
        for (let r = 1; r <= 4; r++) {
          const typeKey = rtKeys[(roomNum % rtKeys.length)];
          const rId = randomUUID();
          await q(
            `INSERT INTO rooms (id, number, floor, room_name, room_code, room_type_id, building_id, floor_id, status, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available', true)`,
            [rId, `${roomNum}`, '1', `Room ${roomNum}`, `RM-${roomNum}`, typeMap[typeKey], bId, floorId]
          );
          roomNum++;
        }
      }
    }
    console.log(`✅ Seeded ${roomNum - 101} rooms`);
  } else {
    console.log('ℹ️ Rooms already seeded:', existingRooms[0].count);
  }

  console.log('✨ Core & Phase 2 seed completed successfully!');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
}).finally(() => pool.end());
