const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function sync() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:045422@localhost:5432/hotel_management',
  });
  await client.connect();

  const migrationPath = path.join(__dirname, '..', 'lib', 'db', 'drizzle', '0000_ambiguous_ghost_rider.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

  let addedColumns = 0;
  let createdTables = 0;

  for (const stmt of statements) {
    if (stmt.startsWith('CREATE TABLE')) {
      const match = stmt.match(/CREATE TABLE "([^"]+)"\s*\(([\s\S]+)\);?$/);
      if (match) {
        const tableName = match[1];
        const body = match[2];

        // 1. Ensure table exists
        await client.query(stmt.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS'));

        // 2. Fetch existing columns
        const res = await client.query(
          'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
          [tableName]
        );
        const existingCols = new Set(res.rows.map(r => r.column_name));

        // 3. Parse lines in body
        const lines = body.split('\n');
        for (const line of lines) {
          const colMatch = line.match(/^\s*"([^"]+)"\s+(.+)$/);
          if (colMatch) {
            const colName = colMatch[1];
            let colDef = colMatch[2].trim();
            if (colDef.endsWith(',')) colDef = colDef.slice(0, -1).trim();

            if (!existingCols.has(colName)) {
              try {
                // If it contains PRIMARY KEY, remove it
                const safeDef = colDef.replace(/PRIMARY KEY/i, '').replace(/NOT NULL/i, '');
                const alterSql = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${colName}" ${safeDef}`;
                await client.query(alterSql);
                console.log(`[+] Added column ${tableName}.${colName}`);
                addedColumns++;
              } catch (err) {
                console.error(`[-] Error adding column ${tableName}.${colName}:`, err.message);
              }
            }
          }
        }
      }
    } else {
      try {
        await client.query(stmt);
      } catch (err) {
        // Ignored if already exists
      }
    }
  }

  console.log(`\nSync complete! Added columns: ${addedColumns}`);
  await client.end();
}

sync().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
