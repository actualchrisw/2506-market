import { query } from './pool.js';


export async function createOrder({ userId, date, note }) {
const { rows: [row] } = await query(
`INSERT INTO orders (date, note, user_id)
VALUES ($1, $2, $3)
RETURNING *;`,
[date, note ?? null, userId]
);
return row;
}


export async function getOrdersForUser(userId) {
const { rows } = await query(
`SELECT * FROM orders WHERE user_id=$1 ORDER BY id;`,
[userId]
);
return rows;
}


export async function getOrderById(id) {
const { rows: [row] } = await query(`SELECT * FROM orders WHERE id=$1;`, [id]);
return row || null;
}


export async function getOrderProducts(orderId) {
const { rows } = await query(
`SELECT p.*, op.quantity
FROM orders_products op
JOIN products p ON p.id = op.product_id
WHERE op.order_id=$1
ORDER BY p.id;`,
[orderId]
);
return rows;
}


export async function addProductToOrder({ orderId, productId, quantity }) {
// Upsert to "add" quantity when the pair exists
const { rows: [row] } = await query(
`INSERT INTO orders_products(order_id, product_id, quantity)
VALUES ($1, $2, $3)
ON CONFLICT (order_id, product_id)
DO UPDATE SET quantity = orders_products.quantity + EXCLUDED.quantity
RETURNING *;`,
[orderId, productId, quantity]
);
return row;
}