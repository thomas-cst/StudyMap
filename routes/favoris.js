/**
 * Routes API des favoris
 * GET    /api/favorites/:email          - Liste des favoris d'un utilisateur
 * POST   /api/favorites/add             - Ajouter un favori
 * DELETE /api/favorites/remove/:email/:nomVille - Supprimer un favori
 * 
 * L'identification se fait par email (partage entre Supabase Auth et la table users)
 * Le backend resout les IDs internes (users.id, villes.id) de maniere transparente
 */

const express = require('express');
const router = express.Router();
const favorisService = require('../services/favorisService');

// GET /api/favorites/:email - Recuperer les favoris d'un utilisateur
router.get('/favorites/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const villes = await favorisService.getFavoris(email);

    // Mapper le format BDD (nom_ville, url_image...) vers le format Ville du frontend
    const mapped = villes.map(v => ({
      id_ville: v.id,
      nom: v.nom_ville,
      code: v.code_insee || '',
      imageUrl: v.url_image || '',
      lat: v.latitude,
      lng: v.longitude
    }));

    console.log(`[FAVORIS] ${mapped.length} favoris charges pour ${email}`);
    res.json({ favoris: mapped });
  } catch (err) {
    console.error('[FAVORIS] Erreur chargement:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/favorites/add - Ajouter une ville aux favoris
router.post('/favorites/add', async (req, res) => {
  try {
    const { email, nom_ville } = req.body;

    if (!email || !nom_ville) {
      return res.status(400).json({ error: 'email et nom_ville sont requis' });
    }

    const result = await favorisService.addFavoris(email, nom_ville);

    console.log(`[FAVORIS] Favori ajoute: ${nom_ville} pour ${email}`);
    res.json({ id: result.id, message: 'Favori ajoute' });
  } catch (err) {
    // Gerer la violation de contrainte unique (ville deja en favoris)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ville deja en favoris' });
    }
    console.error('[FAVORIS] Erreur ajout:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/favorites/remove/:email/:nomVille - Retirer une ville des favoris
router.delete('/favorites/remove/:email/:nomVille', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const nomVille = decodeURIComponent(req.params.nomVille);

    await favorisService.removeFavoris(email, nomVille);

    console.log(`[FAVORIS] Favori supprime: ${nomVille} pour ${email}`);
    res.json({ message: 'Favori supprime' });
  } catch (err) {
    console.error('[FAVORIS] Erreur suppression:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
