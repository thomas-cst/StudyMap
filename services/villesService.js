/**
 * Service métier pour la gestion des villes
 * Responsabilités:
 * - Récupération des villes depuis API ESR
 * - Récupération des images Wikipedia
 * - Insertion en base de données
 * - Gestion de la cache
 */

const https = require('https');
const db = require('../db');

// ====================================================
// CONFIGURATION
// ====================================================

/** Villes d'outre-mer à exclure des résultats */
const VILLES_OUTRE_MER = new Set([
  'Fort-de-France', 'Pointe-à-Pitre', 'Cayenne', 'Saint-Denis', 
  'Mamoudzou', 'Nouméa', 'Papeete', 'Dembeni', 'Punaauia'
]);

/** URL de l'API ESR (Data Enseignement Supérieur & Recherche) */
const API_ESR_URL = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records?where=type_d_etablissement%3D%22Universit%C3%A9%22&limit=100';

/** URL de base Wikipedia */
const WIKIPEDIA_API_URL = 'https://fr.wikipedia.org/w/api.php';

/** Timeout pour les appels Wikipedia (ms) */
const WIKIPEDIA_TIMEOUT = 5000;

/** Délai entre appels Wikipedia (ms) - politesse envers l'API */
const WIKIPEDIA_DELAY = 150;

// ====================================================
// UTILITAIRES
// ====================================================

/**
 * Utilitaire: pause asynchrone
 * @param {number} ms - Millisecondes à attendre
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse les données brutes de l'API ESR pour extraire les villes uniques
 * @param {Array} results - Résultats bruts de l'API ESR
 * @returns {Array} Liste des villes avec code INSEE et coordonnées
 */
function parseVillesFromESR(results) {
  const villesMap = new Map();

  results.forEach(etab => {
    if (!etab.com_nom || !etab.com_code) return;

    // Nettoyer le nom: enlever "1er", "2ème", etc.
    const nomNettoye = etab.com_nom.replace(/\s+\d+(er|e|ème)?$/i, '').trim();

    // Ignorer outre-mer et doublons
    if (VILLES_OUTRE_MER.has(nomNettoye) || villesMap.has(etab.com_code)) {
      return;
    }

    // Extraire les coordonnées
    const lat = etab.coordonnees?.lat || etab.localisation?.coordinates?.[1];
    const lon = etab.coordonnees?.lon || etab.localisation?.coordinates?.[0];

    villesMap.set(etab.com_code, {
      nom: nomNettoye,
      codeInsee: etab.com_code,
      latitude: lat || null,
      longitude: lon || null
    });
  });

  return Array.from(villesMap.values());
}

// ====================================================
// API CALLS
// ====================================================

/**
 * Récupère les villes depuis l'API ESR
 * @returns {Promise<Array>} Liste des villes depuis ESR
 */
async function fetchVillesFromESR() {
  return new Promise((resolve, reject) => {
    https.get(API_ESR_URL, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const villes = parseVillesFromESR(json.results || []);
          console.log(`SUCCESS: ${villes.length} villes trouvées (filtrées sans outre-mer)`);
          resolve(villes);
        } catch (err) {
          reject(new Error(`ERROR parsing ESR: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Récupère l'image d'une ville sur Wikipedia
 * Essaie plusieurs variantes du nom (nom seul, "nom (France)", etc.)
 * @param {string} nomVille - Nom de la ville
 * @returns {Promise<string|null>} URL de l'image ou null
 */
async function fetchImageFromWikipedia(nomVille) {
  const variantes = [nomVille, `${nomVille} (France)`];

  for (const variante of variantes) {
    try {
      const imageUrl = await new Promise((resolve) => {
        const params = new URLSearchParams({
          action: 'query',
          format: 'json',
          prop: 'pageimages',
          piprop: 'original',
          titles: variante
        });

        const url = `${WIKIPEDIA_API_URL}?${params}`;
        const options = {
          headers: {
            'User-Agent': 'StudyMap/1.0 (requests for city images)'
          }
        };

        const req = https.get(url, options, (res) => {
          let data = '';

          // Timeout: si pas de réponse après 5s, abandon
          const timeout = setTimeout(() => {
            resolve(null);
            req.destroy();
          }, WIKIPEDIA_TIMEOUT);

          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            clearTimeout(timeout);
            try {
              const json = JSON.parse(data);
              if (!json.query?.pages) {
                resolve(null);
                return;
              }

              const pages = json.query.pages;
              const page = Object.values(pages)[0];

              if (page?.original?.source) {
                resolve(page.original.source);
              } else {
                resolve(null);
              }
            } catch (err) {
              resolve(null);
            }
          });
        });

        req.on('error', () => resolve(null));
      });

      if (imageUrl) {
        return imageUrl;
      }
    } catch (err) {
      // Continuer avec la variante suivante
    }
  }

  return null;
}

/**
 * Enrichit une liste de villes avec les images Wikipedia
 * @param {Array} villes - Liste de villes à enrichir
 * @returns {Promise<Array>} Villes avec images
 */
async function enrichVillesWithImages(villes) {
  console.log(`LOADING: Récupération des images Wikipedia (${villes.length} villes)...`);

  for (let i = 0; i < villes.length; i++) {
    const ville = villes[i];

    // Afficher la progression tous les 10 villes
    if (i % 10 === 0) {
      console.log(`PROGRESS: ${i}/${villes.length} images traitées`);
    }

    const imageUrl = await fetchImageFromWikipedia(ville.nom);
    if (imageUrl) {
      ville.imageUrl = imageUrl;
    }

    // Délai entre appels (politesse envers Wikipedia)
    if (i < villes.length - 1) {
      await sleep(WIKIPEDIA_DELAY);
    }
  }

  const villesAvecImage = villes.filter(v => v.imageUrl);
  console.log(`SUCCESS: ${villesAvecImage.length}/${villes.length} villes avec images trouvées`);

  return villesAvecImage;
}

/**
 * Insère ou met à jour les villes en base de données
 * @param {Array} villes - Villes à insérer
 * @returns {Promise<number>} Nombre de villes insérées
 */
async function saveVillesToDB(villes) {
  let insertedCount = 0;

  for (const ville of villes) {
    try {
      await db.query(
        `INSERT INTO Villes (codeInsee, nom, imageUrl, latitude, longitude) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE imageUrl=VALUES(imageUrl)`,
        [ville.codeInsee, ville.nom, ville.imageUrl, ville.latitude, ville.longitude]
      );
      insertedCount++;
    } catch (err) {
      console.error(`WARNING: Erreur insertion ${ville.nom}: ${err.message}`);
    }
  }

  console.log(`SUCCESS: ${insertedCount} villes sauvegardées en base de données`);
  return insertedCount;
}

// ====================================================
// PUBLIC API
// ====================================================

/**
 * Récupère les villes depuis la BD
 * @param {number} limit - Nombre max de villes (default: 200)
 * @returns {Promise<Array>} Villes avec images depuis la BD
 */
async function getVillesFromDB(limit = 200) {
  const [villes] = await db.query(
    'SELECT id_ville, codeInsee, nom, imageUrl, latitude, longitude FROM Villes WHERE imageUrl IS NOT NULL LIMIT ?',
    [limit]
  );
  return villes;
}

/**
 * Flux complet: récupérer villes ESR → ajouter images → sauver en BD
 * Utilisé quand la BD est vide
 * @returns {Promise<Array>} Villes enrichies et sauvegardées
 */
async function syncVillesFromESR() {
  console.log('SYNC: Synchronisation des villes depuis ESR...');

  // 1. Récupérer depuis ESR
  const villes = await fetchVillesFromESR();

  // 2. Enrichir avec images
  const villesAvecImages = await enrichVillesWithImages(villes);

  // 3. Sauver en BD
  await saveVillesToDB(villesAvecImages);

  return villesAvecImages;
}

/**
 * Récupère une ville avec ses données complètes (universités, restaurants, météo)
 * @param {number} villeId - ID de la ville
 * @returns {Promise<Object>} Données complètes de la ville
 */
async function getVilleDetails(villeId) {
  // Récupérer la ville
  const [villes] = await db.query(
    'SELECT id_ville, codeInsee, nom, imageUrl, latitude, longitude FROM Villes WHERE id_ville = ?',
    [villeId]
  );

  if (villes.length === 0) {
    throw new Error('Ville non trouvée');
  }

  const ville = villes[0];

  // Récupérer universités
  const [universites] = await db.query(
    'SELECT * FROM Universites WHERE id_ville = ?',
    [villeId]
  );

  // Récupérer restaurants universitaires
  const [restaurants] = await db.query(
    'SELECT * FROM Restaurants_Universitaires WHERE id_ville = ?',
    [villeId]
  );

  // Récupérer météo du mois courant
  const mois = new Date().getMonth() + 1;
  const annee = new Date().getFullYear();
  const [meteo] = await db.query(
    'SELECT * FROM Meteo_Mensuelle WHERE id_ville = ? AND mois = ? AND annee = ?',
    [villeId, mois, annee]
  );

  return {
    ville,
    universites,
    restaurants,
    meteo: meteo[0] || null
  };
}

// ====================================================
// EXPORTS
// ====================================================

module.exports = {
  getVillesFromDB,
  syncVillesFromESR,
  getVilleDetails,
  fetchVillesFromESR,
  enrichVillesWithImages,
  saveVillesToDB
};
