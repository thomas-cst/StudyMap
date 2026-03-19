/**
 * Routes API des villes
 * GET  /api/villes         - Liste des villes
 * GET  /api/villes/:id     - Détail d'une ville
 * GET  /api/villes/search/:nom - Recherche BD-first
 * POST /api/villes/sync    - Synchro ESR + enrichissement
 */

const express = require('express');
const router = express.Router();
const villesDataService = require('../services/villesDataService');

// GET /api/villes - Liste des villes depuis Supabase
router.get('/villes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const villes = await villesDataService.getAllVillesFromDB(limit);

    if (villes.length === 0) {
      console.log('ℹ BD vide, nécessite une synchronisation');
      return res.status(200).json({
        message: 'BD vide, veuillez d\'abord faire POST /api/villes/sync',
        villes: []
      });
    }

    console.log(`✓ ${villes.length} villes retournées`);
    res.json(villes);
  } catch (err) {
    console.error(`ERROR: Impossible de récupérer les villes:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/villes/:id - Détail d'une ville
router.get('/villes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ville = await villesDataService.getVilleByIdFromDB(id);

    if (!ville) {
      return res.status(404).json({ error: 'Ville non trouvée' });
    }

    console.log(`✓ Détails ville ${id} retournés`);
    res.json(ville);
  } catch (err) {
    console.error(`ERROR: Détails ville non accessibles:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/villes/search/:nom - Recherche BD-first
router.get('/villes/search/:nom', async (req, res) => {
  try {
    const { nom } = req.params;
    console.log(`🔍 Recherche ville: ${nom}`);

    const ville = await villesDataService.getOrFetchVille(nom);

    if (!ville) {
      return res.status(404).json({ error: 'Ville non trouvée' });
    }

    console.log(`✓ Ville ${nom} trouvée (source: ${ville.source})`);
    res.json(ville);
  } catch (err) {
    console.error(`ERROR: Recherche ville échouée:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/villes/sync - Synchronisation complète (background)
router.post('/villes/sync', async (req, res) => {
  try {
    console.log('⏳ Démarrage synchronisation complète...');
    res.setHeader('Content-Type', 'application/json');

    // Envoyer la réponse immédiatement
    res.json({
      message: 'Synchronisation en cours...',
      status: 'processing'
    });

    // Continuer en arrière-plan
    (async () => {
      try {
        const villes = await villesDataService.syncVillesComplete();
        console.log(`✅ Sync complétée: ${villes.length} villes`);
      } catch (err) {
        console.error('ERROR: Sync failed:', err.message);
      }
    })();
  } catch (err) {
    console.error(`ERROR: Sync request failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
