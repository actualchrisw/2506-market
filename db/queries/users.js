import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../client.js";

export const JWT_SECRET = process.env.JWT_SECRET || "development-secret";

export async function createUser({ username, password }) {
  const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 10));
  const {
    rows: [user],
  } = await db.query(
    `INSERT INTO users (username, password)
    VALUES ($1, $2)
    ON CONFLICT (username) DO NOTHING
    RETURNING id, username;`,
    [username, hash],
  );
  return user || null;
   }

export async function getUserByUsername(username) {
  const {
    rows: [user],
  } = await db.query(`SELECT * FROM users WHERE username=$1;`, [username]);
  return user || null;
}

export async function getUserById(id) {
  const {
    rows: [user],
  } = await db.query(`SELECT * FROM users WHERE id=$1;`, [id]);
  return user || null;
}


export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

