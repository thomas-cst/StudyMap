const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Charger le cache au démarrage
let villesFestives = {};
try {
  // Lecture du fichier JSON contenant les données festives
  const data = fs.readFileSync(path.join(__dirname, '../villes_festives.json'), 'utf-8');
  villesFestives = JSON.parse(data);
  console.log('Cache lieux festifs chargé:', Object.keys(villesFestives).length, 'villes');
} catch (e) {
  console.warn('Impossible de charger villes_festives.json:', e.message);
}

/**
 * Route GET /lieux-festifs/:ville
 * Retourne le nombre de bars, boîtes de nuit et pubs pour une ville donnée.
 * Les données proviennent du cache chargé au démarrage.
 * Si la ville n'est pas trouvée, retourne 0.
 */
router.get('/lieux-festifs/:ville', (req, res) => {
  const ville = req.params.ville;
  const count = villesFestives[ville] ?? 0;
  res.json({ ville, lieux_festifs: count });
});

module.exports = router;
