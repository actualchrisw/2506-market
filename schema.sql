-- Drop in dependency order to avoid FK issues
DROP TABLE IF EXISTS orders_products;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;


-- USERS
CREATE TABLE users (
id SERIAL PRIMARY KEY,
username TEXT UNIQUE NOT NULL,
password TEXT NOT NULL
);


-- ORDERS
CREATE TABLE orders (
id SERIAL PRIMARY KEY,
date DATE NOT NULL,
note TEXT,
user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);


-- PRODUCTS
CREATE TABLE products (
id SERIAL PRIMARY KEY,
title TEXT NOT NULL,
description TEXT NOT NULL,
price NUMERIC(10,2) NOT NULL
);


-- JUNCTION TABLE
CREATE TABLE orders_products (
order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
quantity INT NOT NULL,
CONSTRAINT orders_products_pkey PRIMARY KEY (order_id, product_id)
);