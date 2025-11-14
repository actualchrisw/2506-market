import jwt from 'jsonwebtoken';


export function requireUser(req, res, next) {
try {
const auth = req.headers.authorization || '';
const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
if (!token) return res.status(401).json({ error: 'Unauthorized: missing token' });


const payload = jwt.verify(token, process.env.JWT_SECRET);
req.user = payload; // { id, username }
next();
} catch (err) {
return res.status(401).json({ error: 'Unauthorized: invalid token' });
}
}