import { query, pool } from './db-helper';
import bcrypt from 'bcryptjs';

async function fixRestaurantManager() {
  console.log('🔍 Checking restaurant.manager@nexushms.com...');
  const users = await query(`
    SELECT u.id, u.email, u.password_hash, u.is_active, u.role_id, r.name as role_name 
    FROM users u 
    LEFT JOIN roles r ON u.role_id = r.id 
    WHERE LOWER(u.email) = 'restaurant.manager@nexushms.com'
  `);

  console.log('Current user record:', users[0]);

  // Ensure role 'Restaurant Manager' exists and has permissions
  const roleCheck = await query(`SELECT id, name, permissions FROM roles WHERE LOWER(name) IN ('restaurant manager', 'f&b manager')`);
  console.log('Roles found:', roleCheck);

  let targetRoleId = roleCheck.length > 0 ? roleCheck[0].id : null;
  if (!targetRoleId) {
    const roles = await query(`SELECT id, name FROM roles`);
    console.log('All roles:', roles);
  }

  // Hash Nexus@1234
  const passwordHash = bcrypt.hashSync('Nexus@1234', 10);

  if (users.length > 0) {
    await query(`
      UPDATE users 
      SET password_hash = $1, is_active = true, is_on_duty = true 
      WHERE LOWER(email) = 'restaurant.manager@nexushms.com'
    `, [passwordHash]);
    console.log('✅ Updated password_hash and activated user restaurant.manager@nexushms.com');
  } else {
    console.log('User not found, inserting...');
    const id = crypto.randomUUID();
    await query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, is_active, is_on_duty)
      VALUES ($1, $2, $3, 'Marcus', 'Vance', '+251-911-223344', $4, true, true)
    `, [id, 'restaurant.manager@nexushms.com', passwordHash, targetRoleId]);
    console.log('✅ Inserted user restaurant.manager@nexushms.com');
  }

  // Verify bcrypt
  const updated = await query(`SELECT password_hash, is_active FROM users WHERE LOWER(email) = 'restaurant.manager@nexushms.com'`);
  console.log('Verified password match with Nexus@1234:', bcrypt.compareSync('Nexus@1234', updated[0].password_hash));

  await pool.end();
}

fixRestaurantManager().catch(err => {
  console.error(err);
  process.exit(1);
});
