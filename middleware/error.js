export function notFound(req, res) {
res.status(404).json({ error: 'Not Found' });
}


export function onError(err, req, res, next) {
console.error(err);
const status = err.status || 500;
res.status(status).json({ error: err.message || 'Internal Server Error' });
}