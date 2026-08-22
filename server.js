require('dotenv').config();

const express = require('express');
require('./db');

const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const intentRoutes = require('./routes/intentRoutes');

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Smart Booking System API is running!');
});

app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/intent', intentRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});