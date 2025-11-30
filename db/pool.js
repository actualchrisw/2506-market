import { existsSync } from "node:fs";
import pkg from "pg";

const { Pool } = pkg;

if (typeof process.loadEnvFile === "function") {
  const envPath = new URL("../.env", import.meta.url);
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV !== "test") {
    console.log("db", { text: text.split("\n")[0], duration, rows: res.rowCount });
  }

  return res;
}