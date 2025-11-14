import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './pool.js';


const JWT_SECRET = process.env.JWT_SECRET;


export async function createUser({ username, password }) {
const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 10));
const { rows: [user] } = await query(
`INSERT INTO users (username, password)
VALUES ($1, $2)
ON CONFLICT (username) DO NOTHING
RETURNING id, username;`,
[username, hash]
);
return user || null;
}


export async function getUserByUsername(username) {
const { rows: [user] } = await query(`SELECT * FROM users WHERE username=$1;`, [username]);
return user || null;
}


export function signToken(user) {
return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}


export async function verifyPassword(plain, hash) {
return bcrypt.compare(plain, hash);
}