import bcrypt from "bcrypt";
import { readFile } from "node:fs/promises";

const products = [
  ["Trail Mug", "Stainless steel camping mug", 12.99],
  ["Wool Socks", "Warm merino hiking socks", 14.5],
  ["LED Lantern", "Rechargeable camp lantern", 29.99],
  ["Titanium Spork", "Ultra-light utensil", 8.0],
  ["Enamel Plate", "Durable camp plate", 9.99],
  ["Sleeping Pad", "Air pad with R-value 3.5", 59.95],
  ["Daypack 20L", "Light day hiking backpack", 49.0],
  ["Water Filter", "Hollow fiber squeeze filter", 34.95],
  ["Butane Stove", "Compact backpacking stove", 24.99],
  ["First Aid Kit", "Compact field kit", 19.5],
];

export async function loadSchema(client) {
  const schemaSql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
  await client.query(schemaSql);
}

export async function seedDatabase(client) {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
  const passwordHash = await bcrypt.hash("password123", saltRounds);

  const {
    rows: [user],
  } = await client.query(
    `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *;`,
    ["alice", passwordHash],
  );

  const productRows = [];
  for (const [title, description, price] of products) {
    const {
      rows: [product],
    } = await client.query(
      `INSERT INTO products (title, description, price) VALUES ($1, $2, $3) RETURNING *;`,
      [title, description, price],
    );
    productRows.push(product);
  }

  const {
    rows: [order],
  } = await client.query(
    `INSERT INTO orders (date, note, user_id) VALUES ($1, $2, $3) RETURNING *;`,
    [new Date().toISOString().slice(0, 10), "Starter order", user.id],
  );

  for (const product of productRows.slice(0, 5)) {
    await client.query(
      `INSERT INTO orders_products(order_id, product_id, quantity) VALUES ($1, $2, $3);`,
      [order.id, product.id, 1],
    );
  }

  return { user, products: productRows, order };
}