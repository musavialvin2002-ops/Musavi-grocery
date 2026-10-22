
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

  console.log("Supabase orders table is ready.");
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

export default pool;
