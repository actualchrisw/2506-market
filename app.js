import express from "express";
import {
  createUser,
  getUserByUsername,
  signToken,
  verifyPassword,
  JWT_SECRET,
} from "#db/users";
import {
  addProductToOrder,
  createOrder,
  getOrderById,
  getOrderProducts,
  getOrdersForUser,
} from "#db/orders";
import {
  getAllProducts,
  getProductById,
  getUserOrdersForProduct,
} from "#db/products";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

function getTokenFromHeader(header = "") {
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req.headers.authorization);
  if (!token) return res.status(401).send("Unauthorized");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).send("Unauthorized");
  }
}

app.post("/users/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).send("Missing fields");

  const user = await createUser({ username, password });
  if (!user) return res.status(400).send("Username already taken");

  const token = signToken(user);
  res.status(201).send(token);
});

app.post("/users/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).send("Missing fields");

  const user = await getUserByUsername(username);
  if (!user) return res.status(401).send("Unauthorized");

  const valid = await verifyPassword(password, user.password);
  if (!valid) return res.status(401).send("Unauthorized");

  const token = signToken(user);
  res.send(token);
});

app.get("/products", async (req, res) => {
  const products = await getAllProducts();
  res.json(products);
});

app.get("/products/:id", async (req, res) => {
  const product = await getProductById(Number(req.params.id));
  if (!product) return res.status(404).send("Not Found");
  res.json(product);
});

app.get("/products/:id/orders", requireAuth, async (req, res) => {
  const product = await getProductById(Number(req.params.id));
  if (!product) return res.status(404).send("Not Found");

  const orders = await getUserOrdersForProduct({
    userId: req.user.id,
    productId: product.id,
  });
  res.json(orders);
});

app.post("/orders", requireAuth, async (req, res) => {
  const { date, note } = req.body || {};
  if (!date) return res.status(400).send("Missing fields");

  const order = await createOrder({ userId: req.user.id, date, note });
  res.status(201).json(order);
});

app.get("/orders", requireAuth, async (req, res) => {
  const orders = await getOrdersForUser(req.user.id);
  res.json(orders);
});

app.get("/orders/:id", requireAuth, async (req, res) => {
  const orderId = Number(req.params.id);
  const order = await getOrderById(orderId);
  if (!order) return res.status(404).send("Not Found");
  if (order.user_id !== req.user.id) return res.status(403).send("Forbidden");
  res.json(order);
});

app.post("/orders/:id/products", requireAuth, async (req, res) => {
  const orderId = Number(req.params.id);
  const { productId, quantity } = req.body || {};

  const order = await getOrderById(orderId);
  if (!order) return res.status(404).send("Not Found");
  if (order.user_id !== req.user.id) return res.status(403).send("Forbidden");

  if (!productId || !quantity) return res.status(400).send("Missing fields");

  const product = await getProductById(Number(productId));
  if (!product) return res.status(400).send("Invalid product");

  const record = await addProductToOrder({
    orderId,
    productId: product.id,
    quantity,
  });
  res.status(201).json(record);
});

app.get("/orders/:id/products", requireAuth, async (req, res) => {
  const orderId = Number(req.params.id);
  const order = await getOrderById(orderId);
  if (!order) return res.status(404).send("Not Found");
  if (order.user_id !== req.user.id) return res.status(403).send("Forbidden");

  const products = await getOrderProducts(orderId);
  res.json(products);
});

export default app;
