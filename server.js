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

// Routes emploi
const emploiRoutes = require('./routes/emploi');
app.use('/api', emploiRoutes);

// Routes lieux festifs
const lieuxFestifsRoutes = require('./routes/lieuxFestifs');
app.use('/api', lieuxFestifsRoutes);

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
  GET  /api/universites         - Liste des universités
  GET  /api/universites/:id    - Détail d'une université
  GET  /api/universites/ville/:villeId - Par ville
  POST /api/universites/sync   - Synchro ESR + Wikidata
  GET  /api/restau-univ         - Liste des restaurants
  GET  /api/restau-univ/universite/:univId - Par université
  POST /api/restau-univ/sync   - Synchro CROUS
  GET  /api/favorites/:email  - Favoris d'un utilisateur
  POST /api/favorites/add      - Ajouter un favori
  DEL  /api/favorites/remove/:email/:nomVille - Supprimer un favori
  GET  /api/lieux-festifs      - Liste des lieux festifs

Quick start:
  1. POST /api/villes/sync      - Initialiser les villes
  2. GET  /api/villes           - Récupérer la liste
  3. GET  /api/villes/search/Paris - Chercher une ville
  `);
});

module.exports = app;
