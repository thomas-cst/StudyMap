/**
 * Routes API du calcul d'itineraire
 * POST /api/travel-time - Calcule la distance et la duree d'un trajet en voiture via OpenRouteService
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * POST /api/travel-time
 * Calcule la distance et la duree d'un trajet voiture entre deux points via l'API OpenRouteService.
 * La cle API ORS est injectee cote serveur pour ne pas l'exposer au frontend.
 *
 * @body {Array} coordinates - Tableau de deux points [[lng, lat], [lng, lat]]
 * @returns {{ distance: number, duration: number }} distance en km, duree en minutes
 */
router.post('/travel-time', async (req, res) => {
  const { coordinates } = req.body;
  if (!coordinates || coordinates.length < 2) {
    return res.status(400).json({ error: 'coordinates est requis' });
  }
  try {
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      { coordinates },
      {
        headers: {
          'Authorization': process.env.ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );


    const summary = response.data?.features?.[0]?.properties?.summary;

    res.json({
      distance: summary ? Math.round(summary.distance / 100) / 10 : 0,
      duration: summary ? Math.round(summary.duration / 60) : 0
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur ORS' });
  }
});

module.exports = router;