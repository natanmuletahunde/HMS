import { pool } from './db-helper';

async function listUsersAndGuests() {
  const users = await pool.query(`
    SELECT 
      u.id, 
      u.email, 
      u.first_name, 
      u.last_name, 
      u.phone, 
      r.name as role_name, 
      u.is_active, 
      u.is_on_duty, 
      u.created_at
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at ASC
  `);

  const guests = await pool.query(`
    SELECT 
      id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      nationality, 
      national_id, 
      passport_number, 
      vip_status, 
      guest_type, 
      total_stays, 
      created_at
    FROM guests
    ORDER BY created_at ASC
  `);

  console.log('=== USERS_COUNT ===', users.rows.length);
  console.log(JSON.stringify(users.rows, null, 2));

  console.log('=== GUESTS_COUNT ===', guests.rows.length);
  console.log(JSON.stringify(guests.rows, null, 2));

  await pool.end();
}

listUsersAndGuests().catch(console.error);
