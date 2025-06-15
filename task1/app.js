const express = require('express');
const app = express();

app.get('/user/:id', (req, res) => {
  res.status(200).json({ id: req.params.id });
});

app.get('/settings/:id', (req, res) => {
  res.status(200).json({ setting: req.params.id });
});

module.exports = app;