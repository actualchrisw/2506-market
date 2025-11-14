import 'dotenv/config';
import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Client } = pkg;


const client = new Client({ connectionString: process.env.DATABASE_URL });


async function run() {
await client.connect();
try {
console.log('Rebuilding schema...');
await client.query(await (await import('node:fs/promises')).readFile(new URL('./schema.sql', import.meta.url), 'utf8'));


const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const passwordHash = await bcrypt.hash('password123', saltRounds);


console.log('Seeding user...');
const { rows: [user] } = await client.query(
`INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *;`,
['alice', passwordHash]
);


console.log('Seeding products (10)...');
const products = [
['Trail Mug', 'Stainless steel camping mug', 12.99],
['Wool Socks', 'Warm merino hiking socks', 14.50],
['LED Lantern', 'Rechargeable camp lantern', 29.99],
['Titanium Spork', 'Ultra-light utensil', 8.00],
['Enamel Plate', 'Durable camp plate', 9.99],
['Sleeping Pad', 'Air pad with R-value 3.5', 59.95],
['Daypack 20L', 'Light day hiking backpack', 49.00],
['Water Filter', 'Hollow fiber squeeze filter', 34.95],
['Butane Stove', 'Compact backpacking stove', 24.99],
['First Aid Kit', 'Compact field kit', 19.50]
];


const productRows = [];
for (const [title, description, price] of products) {
const { rows: [p] } = await client.query(
`INSERT INTO products (title, description, price) VALUES ($1, $2, $3) RETURNING *;`,
[title, description, price]
);
productRows.push(p);
}


console.log('Creating an order with 5+ distinct products...');
const { rows: [order] } = await client.query(
`INSERT INTO orders (date, note, user_id) VALUES ($1, $2, $3) RETURNING *;`,
[new Date().toISOString().slice(0,10), 'Starter order', user.id]
);


const five = productRows.slice(0, 5);
for (const p of five) {
await client.query(
`INSERT INTO orders_products(order_id, product_id, quantity) VALUES ($1, $2, $3);`,
[order.id, p.id, 1]
);
}


console.log('Seed complete.');
} catch (err) {
console.error(err);
process.exitCode = 1;
} finally {
await client.end();
}
}


run();