/**
 * StudyMap Backend Server
 * Express.js + Supabase PostgreSQL
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();


const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// ====================================================
// ROUTES
// ====================================================

// Routes villes
const villesRoutes = require('./routes/villes');
app.use('/api', villesRoutes);

// Routes universités
const universitesRoutes = require('./routes/universites');
app.use('/api', universitesRoutes);

// Routes restaurants universitaires
const restauUnivRoutes = require('./routes/restauUniv');
app.use('/api', restauUnivRoutes);
// Routes favoris
const favorisRoutes = require('./routes/favoris');
app.use('/api', favorisRoutes);

// Routes travel time
const travelTimeRoutes = require('./routes/travelTime');
app.use('/api', travelTimeRoutes);

// ====================================================
// HEALTH CHECK
// ====================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ====================================================
// ERROR HANDLING
// ====================================================

app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur'
  });
});

// ====================================================
// START SERVER
// ====================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
