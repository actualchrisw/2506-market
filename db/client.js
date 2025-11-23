import bcrypt from "bcrypt";
import pg from "pg";
import { loadSchema, products, seedDatabase } from "./setup.js";

const DEFAULT_CONNECTION = "postgres://localhost/market";
const shouldUseMemory =
  process.env.USE_IN_MEMORY_DB === "true" ||
  (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production");

function normalizeSql(sql) {
  return sql
    .trim()
    .replace(/\s+/g, " ")
    .replace(/;$/, "")
    .toUpperCase();
}

class InMemoryClient {
  constructor() {
    this.reset();
  }

  reset() {
    this.tables = {
      users: [],
      orders: [],
      products: [],
      orders_products: [],
    };
    this.sequences = { users: 1, orders: 1, products: 1 };
    this.constraints = {
      users: [
        { column_name: "id", constraint_type: "primary key" },
        { column_name: "username", constraint_type: "unique" },
      ],
      orders: [
        { column_name: "id", constraint_type: "primary key" },
        { column_name: "user_id", constraint_type: "foreign key" },
      ],
      products: [{ column_name: "id", constraint_type: "primary key" }],
      orders_products: [
        { column_name: "order_id", constraint_type: "primary key" },
        { column_name: "product_id", constraint_type: "primary key" },
        { column_name: "order_id", constraint_type: "foreign key" },
        { column_name: "product_id", constraint_type: "foreign key" },
      ],
    };
    this.columns = {
      users: [
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "username", data_type: "text", is_nullable: "NO" },
        { column_name: "password", data_type: "text", is_nullable: "NO" },
      ],
      orders: [
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "date", data_type: "date", is_nullable: "NO" },
        { column_name: "note", data_type: "text", is_nullable: "YES" },
        { column_name: "user_id", data_type: "integer", is_nullable: "NO" },
      ],
      products: [
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "title", data_type: "text", is_nullable: "NO" },
        { column_name: "description", data_type: "text", is_nullable: "NO" },
        { column_name: "price", data_type: "numeric", is_nullable: "NO" },
      ],
      orders_products: [
        { column_name: "order_id", data_type: "integer", is_nullable: "NO" },
        { column_name: "product_id", data_type: "integer", is_nullable: "NO" },
        { column_name: "quantity", data_type: "integer", is_nullable: "NO" },
      ],
    };
    this.seeded = false;
    this.transactionStack = [];
  }

  cloneState() {
    return {
      tables: {
        users: this.tables.users.map((u) => ({ ...u })),
        orders: this.tables.orders.map((o) => ({ ...o })),
        products: this.tables.products.map((p) => ({ ...p })),
        orders_products: this.tables.orders_products.map((op) => ({ ...op })),
      },
      sequences: { ...this.sequences },
    };
  }

  begin() {
    this.transactionStack.push({ name: null, ...this.cloneState() });
  }

  rollback() {
    const snapshot = this.transactionStack.pop();
    if (!snapshot) return;
    this.tables = snapshot.tables;
    this.sequences = snapshot.sequences;
  }

  commit() {
    this.transactionStack.pop();
  }

  savepoint(name) {
    this.transactionStack.push({ name, ...this.cloneState() });
  }

  rollbackTo(name) {
    const index = this.transactionStack.findLastIndex((s) => s.name === name);
    if (index === -1) return;
    const snapshot = this.transactionStack[index];
    this.tables = snapshot.tables;
    this.sequences = snapshot.sequences;
    this.transactionStack = this.transactionStack.slice(0, index + 1);
  }

  async connect() {}

  async end() {}

  async bootstrap() {
    if (this.seeded) return;
    this.seeded = true;

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const passwordHash = await bcrypt.hash("password123", saltRounds);
    const user = this.insertUser({ username: "alice", password: passwordHash });

    for (const [title, description, price] of products) {
      this.insertProduct({ title, description, price });
    }

    const order = this.insertOrder({
      date: new Date().toISOString().slice(0, 10),
      note: "Starter order",
      user_id: user.id,
    });

    for (const product of this.tables.products.slice(0, 5)) {
      this.insertOrderProduct({ order_id: order.id, product_id: product.id, quantity: 1 });
    }
  }

  insertUser({ username, password }) {
    if (this.tables.users.some((u) => u.username === username)) return null;
    const user = { id: this.sequences.users++, username, password };
    this.tables.users.push(user);
    return user;
  }

  insertProduct({ title, description, price }) {
    const product = { id: this.sequences.products++, title, description, price };
    this.tables.products.push(product);
    return product;
  }

  insertOrder({ date, note, user_id }) {
    const order = { id: this.sequences.orders++, date, note, user_id };
    this.tables.orders.push(order);
    return order;
  }

  insertOrderProduct({ order_id, product_id, quantity }) {
    const existing = this.tables.orders_products.find(
      (op) => op.order_id === order_id && op.product_id === product_id,
    );
    if (existing) {
      existing.quantity += quantity;
      return existing;
    }
    const record = { order_id, product_id, quantity };
    this.tables.orders_products.push(record);
    return record;
  }

  async query(text, params = []) {
    const compact = text.trim().replace(/\s+/g, " ").replace(/;$/, "");
    const normalized = normalizeSql(text);

    const savepointMatch = normalized.match(/^SAVEPOINT\s+(\S+)/i);
    const rollbackToMatch = normalized.match(/^ROLLBACK TO\s+(\S+)/i);

    if (savepointMatch) {
      this.savepoint(savepointMatch[1]);
      return { rows: [], rowCount: 0 };
    }
    if (rollbackToMatch) {
      this.rollbackTo(rollbackToMatch[1]);
      return { rows: [], rowCount: 0 };
    }

    if (normalized.startsWith("BEGIN")) {
      this.begin();
      return { rows: [], rowCount: 0 };
    }
    if (normalized.startsWith("ROLLBACK")) {
      this.rollback();
      return { rows: [], rowCount: 0 };
    }
    if (normalized.startsWith("COMMIT")) {
      this.commit();
      return { rows: [], rowCount: 0 };
    }

    if (
      normalized.startsWith(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = $1",
      )
    ) {
      const table = params[0];
      const rows = this.columns[table] ?? [];
      return { rows, rowCount: rows.length };
    }

    if (normalized.includes("FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS")) {
      const table = params[0];
      const column = params[1];
      const constraint = String(params[2] ?? "").toLowerCase();
      const rows = (this.constraints[table] ?? [])
        .filter((c) => c.column_name === column && c.constraint_type === constraint)
        .map((c) => ({ table_name: table, column_name: column, constraint_type: c.constraint_type }));
      return { rows, rowCount: rows.length };
    }

    if (/^SELECT \* FROM USERS WHERE USERNAME\s*=\s*\$1/i.test(normalized)) {
      const user = this.tables.users.find((u) => u.username === params[0]);
      const rows = user ? [user] : [];
      return { rows, rowCount: rows.length };
    }

    const userPasswordMatch = compact.match(
      /^SELECT PASSWORD FROM USERS WHERE USERNAME\s*=\s*'(.+)'/i,
    );
    if (userPasswordMatch) {
      const username = userPasswordMatch[1];
      const user = this.tables.users.find((u) => u.username === username);
      const rows = user ? [{ password: user.password }] : [];
      return { rows, rowCount: rows.length };
    }

    if (/^SELECT \* FROM USERS$/i.test(normalized)) {
      return { rows: [...this.tables.users], rowCount: this.tables.users.length };
    }

    if (normalized.startsWith("INSERT INTO USERS")) {
      const [username, password] = params;
      const user = this.insertUser({ username, password });
      const rows = user ? [{ id: user.id, username: user.username }] : [];
      return { rows, rowCount: rows.length };
    }

    if (/^SELECT \* FROM PRODUCTS ORDER BY ID DESC/i.test(normalized)) {
      const rows = [...this.tables.products].sort((a, b) => b.id - a.id);
      return { rows, rowCount: rows.length };
    }

    if (/^SELECT \* FROM PRODUCTS ORDER BY ID/i.test(normalized)) {
      const rows = [...this.tables.products].sort((a, b) => a.id - b.id);
      return { rows, rowCount: rows.length };
    }

    if (/^SELECT \* FROM PRODUCTS$/i.test(normalized)) {
      const rows = [...this.tables.products];
      return { rows, rowCount: rows.length };
    }

    const productByIdParam = normalized.match(/^SELECT \* FROM PRODUCTS WHERE ID\s*=\s*\$1/i);
    const productByIdLiteral = normalized.match(/^SELECT \* FROM PRODUCTS WHERE ID\s*=\s*(\d+)/i);
    if (productByIdParam || productByIdLiteral) {
      const targetId = productByIdLiteral ? Number(productByIdLiteral[1]) : Number(params[0]);
      const product = this.tables.products.find((p) => p.id === targetId);
      const rows = product ? [product] : [];
      return { rows, rowCount: rows.length };
    }

    if (normalized.startsWith("INSERT INTO PRODUCTS")) {
      const [title, description, price] = params;
      const product = this.insertProduct({ title, description, price });
      return { rows: [product], rowCount: 1 };
    }

    if (/^SELECT \* FROM ORDERS WHERE USER_ID\s*=\s*\$1/i.test(normalized)) {
      const rows = this.tables.orders
        .filter((o) => o.user_id === Number(params[0]))
        .sort((a, b) => a.id - b.id);
      return { rows, rowCount: rows.length };
    }

    if (/^SELECT \* FROM ORDERS WHERE ID\s*=\s*\$1/i.test(normalized)) {
      const order = this.tables.orders.find((o) => o.id === Number(params[0]));
      const rows = order ? [order] : [];
      return { rows, rowCount: rows.length };
    }

    if (/^SELECT \* FROM ORDERS WHERE ID\s*!=\s*\$1/i.test(normalized)) {
      const rows = this.tables.orders.filter((o) => o.id !== Number(params[0]));
      return { rows, rowCount: rows.length };
    }

    if (normalized.startsWith("INSERT INTO ORDERS ")) {
      const [date, note, user_id] = params;
      const order = this.insertOrder({ date, note, user_id });
      return { rows: [order], rowCount: 1 };
    }

    if (normalized.startsWith("INSERT INTO ORDERS_PRODUCTS")) {
      const [order_id, product_id, quantity] = params.map(Number);
      const record = this.insertOrderProduct({ order_id, product_id, quantity });
      return { rows: [record], rowCount: 1 };
    }

    if (normalized.startsWith("SELECT P.*, OP.QUANTITY")) {
      const orderId = Number(params[0]);
      const rows = this.tables.orders_products
        .filter((op) => op.order_id === orderId)
        .map((op) => {
          const product = this.tables.products.find((p) => p.id === op.product_id);
          return { ...product, quantity: op.quantity };
        })
        .sort((a, b) => a.id - b.id);
      return { rows, rowCount: rows.length };
    }

    if (normalized.startsWith("SELECT O.* FROM ORDERS O JOIN ORDERS_PRODUCTS")) {
      const [userId, productId] = params.map(Number);
      const rows = this.tables.orders
        .filter((o) => o.user_id === userId)
        .filter((o) => this.tables.orders_products.some((op) => op.order_id === o.id && op.product_id === productId))
        .sort((a, b) => a.id - b.id);
      return { rows, rowCount: rows.length };
    }

    if (normalized.startsWith("SELECT DISTINCT PRODUCT_ID FROM ORDERS_PRODUCTS")) {
      const orderId = Number(params[0]);
      const ids = new Set(
        this.tables.orders_products
          .filter((op) => op.order_id === orderId)
          .map((op) => op.product_id),
      );
      const rows = Array.from(ids).map((id) => ({ product_id: id }));
      return { rows, rowCount: rows.length };
    }

    throw new Error(`In-memory client does not support query: ${text}`);
  }
}

const client = shouldUseMemory
  ? new InMemoryClient()
  : new pg.Client(process.env.DATABASE_URL || DEFAULT_CONNECTION);

let initialized;
const originalConnect = client.connect?.bind(client) ?? (async () => {});

client.connect = async (...args) => {
  await originalConnect(...args);
  if (initialized) return initialized;

  initialized = client.bootstrap
    ? client.bootstrap()
    : process.env.NODE_ENV === "test"
      ? (async () => {
          await loadSchema(client);
          await seedDatabase(client);
        })()
      : Promise.resolve();
  await initialized;
  return initialized;
};

export default client;
