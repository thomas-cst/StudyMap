/**
 * Route backend pour l'emploi et l'attractivité des villes universitaires
 */

const express = require('express');
const router = express.Router();

let accessToken = null;
let tokenExpiry = 0;


/**
 * Récupère et met en cache le token d'accès France Travail (API offres d'emploi)
 * Le token est rafraîchi automatiquement avant expiration.
 */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID,
    client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET,
    scope: 'api_offresdemploiv2 o2dsoffre'
  });

  // Appel à l'API d'authentification France Travail
  const response = await fetch('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Erreur auth France Travail: ${response.status}`);
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return accessToken;
}


// Cache en mémoire pour les résultats (durée : 24h)
const cache = {
  data: null,
  updatedAt: 0,
  TTL: 1000 * 60 * 60 * 24 // 24h
};

// Liste des villes à interroger avec leur code INSEE
const VILLES = [
  { nom: 'Paris', code: '75056' },
  { nom: 'Lyon', code: '69123' },
  { nom: 'Marseille', code: '13055' },
  { nom: 'Toulouse', code: '31555' },
  { nom: 'Bordeaux', code: '33063' },
  { nom: 'Lille', code: '59350' },
  { nom: 'Nantes', code: '44109' },
  { nom: 'Strasbourg', code: '67482' },
  { nom: 'Montpellier', code: '34172' },
  { nom: 'Nice', code: '06088' },
  { nom: 'Rennes', code: '35238' },
  { nom: 'Grenoble', code: '38185' },
  { nom: 'Clermont-Ferrand', code: '63113' },
  { nom: 'Dijon', code: '21231' },
  { nom: 'Angers', code: '49007' },
  { nom: 'Rouen', code: '76540' },
  { nom: 'Saint-Étienne', code: '42218' },
  { nom: 'Reims', code: '51454' },
  { nom: 'Le Mans', code: '72181' },
  { nom: 'Metz', code: '57463' },
  { nom: 'Tours', code: '37261' },
  { nom: 'Amiens', code: '80021' },
  { nom: 'Caen', code: '14118' },
  { nom: 'Besançon', code: '25056' },
  { nom: 'Orléans', code: '45234' },
  { nom: 'Perpignan', code: '66136' },
  { nom: 'Le Havre', code: '76351' },
  { nom: 'Nancy', code: '54395' },
  { nom: 'Avignon', code: '84007' },
  { nom: 'Brest', code: '29019' },
  { nom: 'Poitiers', code: '86194' },
  { nom: 'Pau', code: '64445' },
  { nom: 'Mulhouse', code: '68224' },
  { nom: 'La Rochelle', code: '17300' },
  { nom: 'Nîmes', code: '30189' },
  { nom: 'Lorient', code: '56121' },
  { nom: 'Chambéry', code: '73065' },
  { nom: 'Limoges', code: '87085' },
  { nom: 'Versailles', code: '78646' },
  { nom: 'Cergy', code: '95127' },
  { nom: 'Créteil', code: '94028' },
  { nom: 'Nanterre', code: '92050' },
  { nom: 'Saint-Denis', code: '93077' },
  { nom: 'Évry-Courcouronnes', code: '91223' },
  { nom: 'Villeurbanne', code: '69266' },
  { nom: 'Bastia', code: '2B096' },
];

/**
 * Récupère le nombre d'offres d'emploi pour une ville
 */
async function getNbOffresVille(token, codeInsee) {
  const url = `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?commune=${codeInsee}&range=0-0`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) return 0;

  // Le nombre total d'offres est dans le header Content-Range
  const contentRange = response.headers.get('Content-Range');
  if (contentRange) {
    const total = parseInt(contentRange.split('/')[1]);
    return isNaN(total) ? 0 : total;
  }
  return 0;
}

/**
 * Route GET /emploi
 * Retourne la liste des villes universitaires triées par nombre d'offres d'emploi (France Travail)
 * Les résultats sont mis en cache pour 24h pour limiter les appels API.
 */
router.get('/emploi', async (req, res) => {
  try {
    if (cache.data && Date.now() < cache.updatedAt + cache.TTL) {
      return res.json(cache.data);
    }

    const token = await getAccessToken();

    const results = [];
    const batchSize = 5;

    for (let i = 0; i < VILLES.length; i += batchSize) {
      const batch = VILLES.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (ville) => {
          const nbOffres = await getNbOffresVille(token, ville.code);
          return { ville: ville.nom, nbobs_com: nbOffres, attractif: nbOffres > 5000 };
        })
      );
      results.push(...batchResults);
      if (i + batchSize < VILLES.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Trier du plus d'offres au moins
    results.sort((a, b) => b.nbobs_com - a.nbobs_com);

    // Mettre à jour le cache
    cache.data = results;
    cache.updatedAt = Date.now();

    res.json(results);
  } catch (err) {
    console.error('Erreur /api/emploi:', err.message);

    // En cas d'erreur, servir le cache expiré si disponible
    if (cache.data) {
      console.warn('Fallback sur cache expiré');
      return res.json(cache.data);
    }

    res.status(500).json({ error: 'Impossible de récupérer les données emploi' });
  }
});

module.exports = router;