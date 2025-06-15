const express = require('express');
const app = express();
const routes = require('./routes/api');
const { sequelize } = require('./models');

require('dotenv').config();

app.use(express.json());
app.use('/api', routes);

sequelize.sync(); // Sync DB

module.exports = app;