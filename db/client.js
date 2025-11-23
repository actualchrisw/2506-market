import pg from "pg";
import { loadSchema, seedDatabase } from "./setup.js";

const connectionString = process.env.DATABASE_URL || "postgres://localhost/market";
const client = new pg.Client(connectionString);

let initialized;
const originalConnect = client.connect.bind(client);

client.connect = async (...args) => {
  await originalConnect(...args);
  if (!initialized && process.env.NODE_ENV === "test") {
    initialized = (async () => {
      await loadSchema(client);
      await seedDatabase(client);
    })();
    await initialized;
  }
};

export default client;