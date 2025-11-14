import { query } from './pool.js';


export async function getAllProducts() {
const { rows } = await query(`SELECT * FROM products ORDER BY id;`);
return rows;
}


export async function getProductById(id) {
const { rows: [row] } = await query(`SELECT * FROM products WHERE id=$1;`, [id]);
return row || null;
}


export async function getUserOrdersForProduct({ userId, productId }) {
const { rows } = await query(
`SELECT o.*
FROM orders o
JOIN orders_products op ON op.order_id = o.id
WHERE o.user_id = $1 AND op.product_id = $2
ORDER BY o.id;`,
[userId, productId]
);
return rows;
}