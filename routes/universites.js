/**
 * Routes API des universités
 * GET  /api/universites           - Liste des universités
 * GET  /api/universites/:id       - Détail d'une université
 * GET  /api/universites/ville/:villeId - Universités d'une ville
 * POST /api/universites/sync      - Synchro ESR + Wikidata
 */

const express = require('express');
const router = express.Router();
const universitesService = require('../services/universitesDataService');

// GET /api/universites
router.get('/universites', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const universites = await universitesService.getAllUniversitesFromDB(limit);

    if (universites.length === 0) {
      return res.status(200).json({
        message: 'Aucune université en BD, faites POST /api/universites/sync',
        universites: []
      });
    }

    console.log(`✓ ${universites.length} universités retournées`);
    res.json(universites);
  } catch (err) {
    console.error('ERROR universites:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/universites/:id
router.get('/universites/:id', async (req, res) => {
  try {
    const univ = await universitesService.getUniversiteByIdFromDB(req.params.id);
    if (!univ) return res.status(404).json({ error: 'Université non trouvée' });
    res.json(univ);
  } catch (err) {
    console.error('ERROR université detail:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/universites/ville/:villeId
router.get('/universites/ville/:villeId', async (req, res) => {
  try {
    const universites = await universitesService.getUniversitesByVilleId(req.params.villeId);
    res.json(universites);
  } catch (err) {
    console.error('ERROR universites par ville:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/universites/sync
router.post('/universites/sync', async (req, res) => {
  try {
    console.log('🎓 Démarrage sync universités...');

    res.json({
      message: 'Synchronisation des universités en cours...',
      status: 'processing'
    });

    (async () => {
      try {
        const result = await universitesService.syncUniversites();
        console.log(`🎓 Sync terminée:`, result);
      } catch (err) {
        console.error('ERROR sync universités:', err.message);
      }
    })();
  } catch (err) {
    console.error('ERROR sync request:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
