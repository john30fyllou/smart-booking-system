const express = require('express');
require('./db');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.send("Smart Booking System API is running!");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});