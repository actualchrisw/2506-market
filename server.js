import 'dotenv/config';
import express from 'express';
import usersRouter from './routes/users.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import { notFound, onError } from './middleware/error.js';


const app = express();
app.use(express.json()); // body parser


app.get('/', (req, res) => res.json({ ok: true, service: 'MARKET API' }));


app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);


app.use(notFound);
app.use(onError);


const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Server listening on :${port}`));