/**
 * Routes API des restaurants universitaires
 * GET  /api/restau-univ                    - Liste des restaurants
 * GET  /api/restau-univ/universite/:univId - Restaurants d'une université
 * POST /api/restau-univ/sync               - Synchro CROUS
 */

const express = require('express');
const router = express.Router();
const restauService = require('../services/restauUnivDataService');

// GET /api/restau-univ
router.get('/restau-univ', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const restaurants = await restauService.getAllRestauFromDB(limit);
    res.json(restaurants);
  } catch (err) {
    console.error('ERROR restau-univ:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/restau-univ/universite/:univId
router.get('/restau-univ/universite/:univId', async (req, res) => {
  try {
    const restaurants = await restauService.getRestauByUniversiteId(req.params.univId);
    res.json(restaurants);
  } catch (err) {
    console.error('ERROR restau-univ par université:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/restau-univ/sync
router.post('/restau-univ/sync', async (req, res) => {
  try {
    res.json({ message: 'Synchronisation des restaurants en cours...', status: 'processing' });
    restauService.syncRestauUniv().catch(err => {
      console.error('SYNC restau-univ error:', err.message);
    });
  } catch (err) {
    console.error('ERROR sync restau-univ:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
