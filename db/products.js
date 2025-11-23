import db from "./client.js";

const { rows } = await db.query(`SELECT * FROM products ORDER BY id;`);
  return rows;
}

const {
    rows: [row],
  } = await db.query(`SELECT * FROM products WHERE id=$1;`, [id]);
  return row || null;
}

  const { rows } = await db.query(
    `SELECT o.*
    FROM orders o
    JOIN orders_products op ON op.order_id = o.id
    WHERE o.user_id = $1 AND op.product_id = $2
    ORDER BY o.id;`,
    [userId, productId],
  );
  return rows;
}