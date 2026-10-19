import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/hotel_management';

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}
