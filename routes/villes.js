/**
 * Routes API pour la gestion des villes
 * 
 * Endpoints:
 * - GET /api/villes - Récupère la liste de toutes les villes
 * - GET /api/villes/:id - Récupère les détails d'une ville
 */

const express = require('express');
const router = express.Router();
const villesService = require('../services/villesService');

// ====================================================
// GET /api/villes
// ====================================================

/**
 * GET /api/villes
 * 
 * Récupère la liste de toutes les villes avec leurs images
 * 
 * Stratégie de récupération:
 * 1. BD d'abord (si données disponibles avec images) - réponse rapide en cache
 * 2. Fallback: Synchroniser depuis API ESR + Wikipedia (initialisation)
 * 
 * @route GET /api/villes
 * @returns {Array} Liste des villes
 * @example
 *   GET /api/villes
 *   Response:
 *   [
 *     { 
 *       id_ville: 1, 
 *       codeInsee: '75056', 
 *       nom: 'Paris', 
 *       imageUrl: 'https://...', 
 *       latitude: 48.8, 
 *       longitude: 2.4 
 *     },
 *     ...
 *   ]
 */
router.get('/villes', async (req, res) => {
  try {
    // 1. Essayer d'abord la BD (avec cache d'images)
    let villes = await villesService.getVillesFromDB();

    if (villes.length > 0) {
      console.log(`INFO: ${villes.length} villes chargées depuis la base de données (cache)`);
      return res.json(villes);
    }

    // 2. BD vide → Synchroniser depuis ESR
    console.log('INFO: Base de données vide, synchronisation en cours depuis API ESR...');
    villes = await villesService.syncVillesFromESR();

    res.json(villes);
  } catch (err) {
    console.error(`ERROR: Impossible de récupérer les villes: ${err.message}`);
    res.status(500).json({ error: `Erreur récupération villes: ${err.message}` });
  }
});

// ====================================================
// GET /api/villes/:id
// ====================================================

/**
 * GET /api/villes/:id
 * 
 * Récupère les détails complets d'une ville:
 * - Informations de base (nom, coordonnées, image)
 * - Universités présentes dans la ville
 * - Restaurants universitaires
 * - Données météorologiques (mois courant)
 * 
 * @route GET /api/villes/:id
 * @param {number} id - ID de la ville (id_ville)
 * @returns {Object} Détails complets de la ville
 * @example
 *   GET /api/villes/1
 *   Response:
 *   {
 *     "ville": { 
 *       id_ville: 1, 
 *       codeInsee: "75056", 
 *       nom: "Paris",
 *       imageUrl: "https://...",
 *       latitude: 48.8556,
 *       longitude: 2.3522
 *     },
 *     "universites": [ 
 *       { id_universite: 1, nom: "Sorbonne", ... } 
 *     ],
 *     "restaurants": [ 
 *       { id_restaurant: 1, nom: "RU Panthéon", ... } 
 *     ],
 *     "meteo": { 
 *       temperature: 15, 
 *       precipitation: 2,
 *       mois: 3,
 *       annee: 2026
 *     }
 *   }
 */
router.get('/villes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`INFO: Récupération des détails pour la ville (id: ${id})`);

    const details = await villesService.getVilleDetails(id);

    res.json(details);
  } catch (err) {
    console.error(`ERROR: Détails ville non accessibles: ${err.message}`);

    if (err.message === 'Ville non trouvée') {
      return res.status(404).json({ error: 'Ville non trouvée' });
    }

    res.status(500).json({ error: `Erreur détail ville: ${err.message}` });
  }
});

module.exports = router;
