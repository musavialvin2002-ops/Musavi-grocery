
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sellers (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      location TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
    await pool.query(`
    ALTER TABLE seller_products
    ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS seller_products (
      id TEXT PRIMARY KEY,
      seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_per_unit NUMERIC,
      unit TEXT NOT NULL,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Supabase orders, shop settings, sellers, and seller products tables are ready.");
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

export async function saveSellerSubmission(seller, product) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO sellers (id, name, phone, location)
       VALUES ($1, $2, $3, $4)`,
      [seller.id, seller.name, seller.phone, seller.location]
    );

    const imageUrls = Array.isArray(product.imageUrls)
      ? product.imageUrls.slice(0, 5)
      : product.imageUrl
        ? [product.imageUrl]
        : [];

    await client.query(
      `INSERT INTO seller_products
       (id, seller_id, name, category, price_per_unit, unit,
        available, description, image_url, image_urls, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)`,
      [
        product.id,
        seller.id,
        product.name,
        product.category,
        product.pricePerUnit,
        product.unit,
        product.available,
        product.description,
        imageUrls[0] || "",
        JSON.stringify(imageUrls),
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getSellerProducts() {
  const result = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.category,
      p.price_per_unit,
      p.unit,
      p.available,
      p.description,
      p.image_url,
      p.image_urls,
      p.seller_id,
      s.name AS seller_name,
      s.phone AS seller_phone,
      s.location AS seller_location
    FROM seller_products p
    JOIN sellers s ON s.id = p.seller_id
    WHERE p.active = TRUE
    ORDER BY p.created_at DESC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    pricePerKg: row.price_per_unit === null
      ? null
      : Number(row.price_per_unit),
    unit: row.unit,
    available: row.available,
    image: row.image_url || "",
    imageUrl: row.image_url || "",
    imageUrls: Array.isArray(row.image_urls) && row.image_urls.length > 0
  ? row.image_urls
  : row.image_url
    ? [row.image_url]
    : [],
    description: row.description,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    sellerPhone: row.seller_phone,
    sellerLocation: row.seller_location,
  }));
}

export async function deactivateSellerProduct(productId) {
  const result = await pool.query(
    `UPDATE seller_products
     SET active = FALSE
     WHERE id = $1 AND active = TRUE
     RETURNING id`,
    [productId]
  );

  return result.rowCount > 0;
}
export default pool;
