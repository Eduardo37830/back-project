const express = require('express');
require('dotenv').config();
const connectionDB = require('./config/database');
const routes = require('./routes/routes');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const port = process.env.PORT || 3005;

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use('/api/v1', routes);

// app.options("*", cors());  <-- Comenta o elimina esta línea

app.listen(port, () => {
    console.log(`Project running on port ${port}`);
});

connectionDB();