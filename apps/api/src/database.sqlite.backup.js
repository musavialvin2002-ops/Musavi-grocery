
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = join(currentDirectory, "../data");

mkdirSync(dataDirectory, { recursive: true });

const databasePath = join(dataDirectory, "musavis-grocery.sqlite");
const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    reference TEXT PRIMARY KEY,
    order_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const insertOrder = db.prepare(`
  INSERT INTO orders (reference, order_json, status, created_at)
  VALUES (@reference, @orderJson, @status, @createdAt)
`);

const selectOrders = db.prepare(`
  SELECT order_json, status
  FROM orders
  ORDER BY created_at DESC
`);

const selectOrder = db.prepare(`
  SELECT order_json, status
  FROM orders
  WHERE reference = ?
`);

const updateStatus = db.prepare(`
  UPDATE orders
  SET status = ?
  WHERE reference = ?
`);

export function saveOrder(order) {
  insertOrder.run({
    reference: order.reference,
    orderJson: JSON.stringify(order),
    status: order.status,
    createdAt: order.createdAt,
  });
}

export function getOrders() {
  return selectOrders.all().map((row) => ({
    ...JSON.parse(row.order_json),
    status: row.status,
  }));
}

export function getOrder(reference) {
  const row = selectOrder.get(reference);

  if (!row) return undefined;

  return {
    ...JSON.parse(row.order_json),
    status: row.status,
  };
}

export function updateOrder(reference, status) {
  const result = updateStatus.run(status, reference);
  return result.changes > 0;
}

export default db;
