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
  console.log(`
╔════════════════════════════════════════╗
║  StudyMap Backend Server               ║
╚════════════════════════════════════════╝

📡 Server running on port ${PORT}
🌍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}
💾 Database: Supabase PostgreSQL
🔄 Villes Service: villesDataService.js

Available routes:
  GET  /health
  GET  /api/villes              - Liste toutes les villes (BD)
  GET  /api/villes/:id         - Détail d'une ville
  GET  /api/villes/search/:nom - Cherche une ville (BD→API)
  POST /api/villes/sync        - Synchronise les villes

Quick start:
  1. POST /api/villes/sync      - Initialiser les villes
  2. GET  /api/villes           - Récupérer la liste
  3. GET  /api/villes/search/Paris - Chercher une ville
  `);
});

module.exports = app;
