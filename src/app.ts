import express from 'express';
import measureRoutes from './routes/MeasureRoutes';
require('dotenv').config();


const app = express();

app.use(express.json());
app.use(measureRoutes);

export default app;
