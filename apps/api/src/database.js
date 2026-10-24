
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from apps/api/.env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
});

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      reference TEXT PRIMARY KEY,
      order_json JSONB NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value JSONB NOT NULL
    );
  `);

  console.log("Supabase orders and shop settings tables are ready.");
}

export async function saveOrder(order) {
  await pool.query(
    `INSERT INTO orders (reference, order_json, status, created_at)
     VALUES ($1, $2::jsonb, $3, $4)`,
    [
      order.reference,
      JSON.stringify(order),
      order.status,
      order.createdAt,
    ]
  );
}

export async function getOrders() {
  const result = await pool.query(
    `SELECT order_json, status
     FROM orders
     ORDER BY created_at DESC`
  );

  return result.rows.map((row) => ({
    ...row.order_json,
    status: row.status,
  }));
}

export async function getOrder(reference) {
  const result = await pool.query(
    `SELECT order_json, status
     FROM orders
     WHERE reference = $1`,
    [reference]
  );

  if (result.rows.length === 0) {
    return undefined;
  }

  const row = result.rows[0];

  return {
    ...row.order_json,
    status: row.status,
  };
}

export async function updateOrder(reference, status) {
  const result = await pool.query(
    `UPDATE orders
     SET status = $1
     WHERE reference = $2`,
    [status, reference]
  );

  return result.rowCount > 0;
}


export async function getSetting(key, defaultValue = null) {
  const result = await pool.query(
    `SELECT setting_value
     FROM shop_settings
     WHERE setting_key = $1`,
    [key]
  );

  if (result.rows.length === 0) {
    return defaultValue;
  }

  return result.rows[0].setting_value;
}

export async function saveSetting(key, value) {
  await pool.query(
    `INSERT INTO shop_settings (setting_key, setting_value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value`,
    [key, JSON.stringify(value)]
  );
}

export default pool;
