// ====================================================
// LOYERS - Lecture du CSV local (assets)
// ====================================================

const fs = require('fs');
const path = require('path');
const csvFilePath = path.join(__dirname, '../src/assets/pred-app3-mef-dhup.csv');
let loyersCache = null;

/**
 * Charge et parse le CSV des loyers une seule fois (cache en mémoire)
 * @returns {Promise<Array<Object>>}
 */
async function loadLoyersCSV() {
  if (loyersCache) return loyersCache;
  return new Promise((resolve, reject) => {
    fs.readFile(csvFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Erreur lecture CSV loyers:', err.message);
        return resolve([]);
      }
      const lines = data.split(/\r?\n/).filter(Boolean);
      const header = lines[0].split(';').map(h => h.replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const cols = line.split(';');
        const obj = {};
        header.forEach((h, i) => {
          obj[h] = cols[i] ? cols[i].replace(/"/g, '') : '';
        });
        return obj;
      });
      loyersCache = rows;
      resolve(rows);
    });
  });
}

/**
 * Récupère le loyer moyen d'une ville (prix/m²) via le CSV local
 * @param {string} nomVille
 * @param {string} [codeInsee] (optionnel)
 * @returns {Promise<number|null>} Loyer moyen au m² ou null si non trouvé
 */
async function fetchLoyerMoyenCSV(nomVille, codeInsee = null) {
  const loyers = await loadLoyersCSV();
  // Recherche insensible à la casse et aux accents
  const normalize = s => s?.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const nomVilleNorm = normalize(nomVille);
  let found = loyers.find(row => normalize(row.LIBGEO) === nomVilleNorm);
  // Si pas trouvé, tente par code INSEE si fourni
  if (!found && codeInsee) {
    found = loyers.find(row => row.INSEE_C === codeInsee);
  }
  if (!found) return null;
  // Le champ "loypredm2" contient le loyer moyen au m² (remplacer virgule par point)
  const loyerStr = found.loypredm2?.replace(',', '.');
  const loyer = parseFloat(loyerStr);
  return isNaN(loyer) ? null : loyer;
}
/**
 * Service de données des villes
 * - Images via Wikipedia, coordonnées via Open-Meteo, code INSEE via COG
 * - Stratégie BD-first: Supabase d'abord, APIs si absent
 */

const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Initialiser Supabase
require('dotenv').config();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ====================================================
// CONFIGURATION
// ====================================================

/** Villes d'outre-mer à exclure */
const VILLES_OUTRE_MER = new Set([
  'Fort-de-France', 'Pointe-à-Pitre', 'Cayenne', 'Saint-Denis',
  'Mamoudzou', 'Nouméa', 'Papeete', 'Dembeni', 'Punaauia'
]);

/** URL API ESR */
const API_ESR_URL = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records?where=type_d_etablissement%3D%22Universit%C3%A9%22&limit=100';

/** Open-Meteo Geocoding API */
const OPENMETEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Wikidata API */
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql';

/** COG API pour codes INSEE */
const COG_API_URL = 'http://api.cog.fr/commune/like/';

/** Timeout pour API calls (ms) */
const API_TIMEOUT = 8000;

/** Délai entre appels */
const API_DELAY = 100;

// ====================================================
// UTILITAIRES
// ====================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRequest(url, options = {}) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      ...options
    }, (res) => {
      let data = '';
      let timeout;

      const onTimeout = () => {
        req.destroy();
        console.error(`[TIMEOUT] ${url}`);
        resolve(null);
      };

      timeout = setTimeout(onTimeout, API_TIMEOUT);

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          // Affiche le début de la réponse pour debug
          console.error(`[PARSE ERROR] ${url}: ${e.message}`);
          if (data && typeof data === 'string') {
            console.error('Réponse brute (début):', data.slice(0, 300));
          }
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[REQUEST ERROR] ${url}: ${err.message}`);
      resolve(null);
    });
  });
}

// ====================================================
// WIKIPEDIA - Images
// ====================================================

async function fetchImageFromWikipedia(nomVille) {
  try {
    // Format: ["search", [titles], [descriptions], [urls]]
    const searchUrl = `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(nomVille)}&limit=3`;
    const searchResult = await makeRequest(searchUrl);
    
    if (!Array.isArray(searchResult) || searchResult.length < 4 || !searchResult[3] || !searchResult[3].length) {
      console.log(`  ⚠️  ${nomVille}: aucun résultat Wikipedia`);
      return null;
    }

    // Récupérer le titre de la première page trouvée
    const titles = searchResult[1];
    const urls = searchResult[3];
    
    if (!titles || !titles.length) {
      console.log(`  ⚠️  ${nomVille}: pas de titre trouvé`);
      return null;
    }

    const pageTitle = titles[0];
    console.log(`  🔗 ${nomVille}: trouvé page '${pageTitle}'`);

    // Récupérer le thumbnail (600px au lieu de l'original qui peut faire 10MB+)
    const imageUrl = `https://fr.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&piprop=thumbnail&pithumbsize=600`;
    const imageResult = await makeRequest(imageUrl);

    if (imageResult?.query?.pages) {
      const page = Object.values(imageResult.query.pages)[0];
      const imgSrc = page?.thumbnail?.source;
      if (imgSrc) {
        console.log(`  ✓ ${nomVille}: image trouvée ✅`);
        return imgSrc;
      } else {
        console.log(`  ❌ ${nomVille}: page trouvée mais sans image`);
      }
    }

    return null;
  } catch (err) {
    console.error(`WARN: Erreur image Wikipedia ${nomVille}:`, err.message);
    return null;
  }
}

// ====================================================
// WIKIDATA - Population & Gentilé
// ====================================================

function parseWikidataPopulation(claims) {
  const populationClaims = claims?.P1082;
  if (!populationClaims?.length) return null;

  for (const claim of populationClaims) {
    const amount = claim?.mainsnak?.datavalue?.value?.amount;
    if (!amount) continue;
    const num = Number(String(amount).replace('+', ''));
    if (Number.isFinite(num) && num > 0) {
      return Math.round(num);
    }
  }
  return null;
}

async function fetchWikidataEntityIdByInsee(codeInsee) {
  if (!codeInsee) return null;

  try {
    const query = `
      SELECT ?item WHERE {
        ?item wdt:P374 "${codeInsee}" .
      }
      LIMIT 1
    `;

    const url = `${WIKIDATA_SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`;
    const result = await makeRequest(url, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'StudyMap/1.0 (contact: studymap-app)'
      }
    });

    const itemUrl = result?.results?.bindings?.[0]?.item?.value;
    if (!itemUrl) return null;

    const match = itemUrl.match(/\/entity\/(Q\d+)$/);
    return match?.[1] || null;
  } catch (err) {
    console.error(`WARN: Erreur SPARQL INSEE ${codeInsee}:`, err.message);
    return null;
  }
}

function pickBestWikidataCityEntity(searchResults) {
  if (!Array.isArray(searchResults) || !searchResults.length) return null;

  const scored = searchResults.map((item) => {
    const description = (item.description || '').toLowerCase();
    let score = 0;
    if (description.includes('commune')) score += 3;
    if (description.includes('ville')) score += 3;
    if (description.includes('municipalité')) score += 2;
    if (description.includes('france')) score += 2;
    return { item, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.item || null;
}

async function fetchPopulationFromWikidata(nomVille, codeInsee = null) {
  try {
    let entityId = await fetchWikidataEntityIdByInsee(codeInsee);

    if (!entityId) {
      const searchUrl = `${WIKIDATA_API_URL}?action=wbsearchentities&format=json&language=fr&type=item&limit=8&search=${encodeURIComponent(nomVille)}`;
      const searchResult = await makeRequest(searchUrl);
      const entity = pickBestWikidataCityEntity(searchResult?.search);
      entityId = entity?.id || null;
    }

    if (!entityId) return null;

    const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`;
    const entityResult = await makeRequest(entityUrl);
    const claims = entityResult?.entities?.[entityId]?.claims;
    if (!claims) return null;

    const population = parseWikidataPopulation(claims);
    return { nb_hab: population };
  } catch (err) {
    console.error(`WARN: Erreur Wikidata ${nomVille}:`, err.message);
    return null;
  }
}

// ====================================================
// OPEN-METEO - Coordonnées
// ====================================================

async function fetchCoordinatesFromOpenMeteo(nomVille) {
  try {
    const url = `${OPENMETEO_GEOCODING_URL}?name=${encodeURIComponent(nomVille)}&country=France&language=fr&limit=1`;
    const result = await makeRequest(url);

    if (result?.results?.length > 0) {
      const city = result.results[0];
      return {
        latitude: city.latitude,
        longitude: city.longitude
      };
    }

    return null;
  } catch (err) {
    console.error(`WARN: Erreur coordonnées OpenMeteo ${nomVille}:`, err.message);
    return null;
  }
}

// ====================================================
// COG API - Code INSEE
// ====================================================

async function fetchCodeInseeFromCOG(nomVille) {
  try {
    const url = `${COG_API_URL}${encodeURIComponent(nomVille.toUpperCase())}`;
    const result = await makeRequest(url);

    if (result && Array.isArray(result) && result.length > 0) {
      return result[0].code || null;
    }

    return null;
  } catch (err) {
    console.error(`WARN: Erreur INSEE ${nomVille}:`, err.message);
    return null;
  }
}

// ====================================================
// PARSE ESR
// ====================================================

function parseVillesFromESR(results) {
  const villesMap = new Map();

  results.forEach(etab => {
    if (!etab.com_nom) return;

    const nomNettoye = etab.com_nom.replace(/\s+\d+(er|e|ème)?$/i, '').trim();

    if (VILLES_OUTRE_MER.has(nomNettoye) || villesMap.has(nomNettoye)) {
      return;
    }

    villesMap.set(nomNettoye, {
      nom_ville: nomNettoye,
      code_insee: etab.com_code || null,
      latitude: etab.coordonnees?.lat || null,
      longitude: etab.coordonnees?.lon || null,
      nb_hab: null,
      nb_etu: null
    });
  });

  return Array.from(villesMap.values());
}

// ====================================================
// FETCH FROM APIs
// ====================================================

async function fetchVillesFromESR() {
  try {
    console.log('📡 Appel API ESR...');
    const result = await makeRequest(API_ESR_URL);
    
    if (!result) {
      console.error('❌ ESR: aucune réponse');
      return [];
    }
    
    if (result.error_code) {
      console.error('❌ ESR ERROR:', result.error_code);
      console.error('  Message:', result.message);
      return [];
    }
    
    if (!result.results) {
      console.error('❌ ESR: pas de champ results dans la réponse');
      console.error('  Clés disponibles:', Object.keys(result).join(', '));
      return [];
    }

    console.log(`✓ ESR: ${result.results.length} établissements reçus`);

    const villes = parseVillesFromESR(result.results);
    console.log(`✓ ESR: ${villes.length} villes uniques extraites (sans doublons)`);

    return villes;
  } catch (err) {
    console.error('ERROR: Erreur fetch ESR:', err.message);
    return [];
  }
}

async function enrichVille(ville) {
  console.log(`⏳ Enrichissement: ${ville.nom_ville}...`);

  // Coordonnées
  if (!ville.latitude || !ville.longitude) {
    const coords = await fetchCoordinatesFromOpenMeteo(ville.nom_ville);
    if (coords) {
      ville.latitude = coords.latitude;
      ville.longitude = coords.longitude;
    }
    await sleep(API_DELAY);
  }

  // Code INSEE
  if (!ville.code_insee) {
    const codeInsee = await fetchCodeInseeFromCOG(ville.nom_ville);
    if (codeInsee) {
      ville.code_insee = codeInsee;
    }
    await sleep(API_DELAY);
  }

  // Image
  if (!ville.url_image) {
    const imageUrl = await fetchImageFromWikipedia(ville.nom_ville);
    if (imageUrl) {
      ville.url_image = imageUrl;
    }
    await sleep(API_DELAY);
  }

  // Population (Wikidata)
  if (!ville.nb_hab) {
    const wikidataMeta = await fetchPopulationFromWikidata(ville.nom_ville, ville.code_insee);
    if (wikidataMeta && wikidataMeta.nb_hab) {
      ville.nb_hab = wikidataMeta.nb_hab;
    }
    await sleep(API_DELAY);
  }

  return ville;
}

// ====================================================
// DATABASE OPERATIONS (Supabase)
// ====================================================

async function getVilleFromDB(nomVille, codeInsee = null) {
  try {
    let query = supabase.from('villes').select('*').eq('nom_ville', nomVille);
    
    if (codeInsee) {
      query = supabase.from('villes').select('*').or(`code_insee.eq.${codeInsee},nom_ville.eq.${nomVille}`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('ERROR: Erreur getVilleFromDB:', error.message);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('ERROR: Erreur getVilleFromDB:', err.message);
    return null;
  }
}

async function saveOrUpdateVilleInDB(ville) {
  try {
    const existing = await getVilleFromDB(ville.nom_ville, ville.code_insee);

    if (existing) {
      // UPDATE
      const { error } = await supabase
        .from('villes')
        .update({
          url_image: ville.url_image || existing.url_image,
          latitude: ville.latitude || existing.latitude,
          longitude: ville.longitude || existing.longitude,
          code_insee: ville.code_insee || existing.code_insee,
          nb_hab: ville.nb_hab || existing.nb_hab,
          nb_etu: ville.nb_etu ?? existing.nb_etu
        })
        .eq('id', existing.id);

      if (error) {
        console.error(`ERROR: Update ${ville.nom_ville}:`, error.message);
        return false;
      }
    } else {
      // INSERT
      const { error } = await supabase
        .from('villes')
        .insert([ville]);

      if (error) {
        console.error(`ERROR: Insert ${ville.nom_ville}:`, error.message);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error(`ERROR: Save ${ville.nom_ville}:`, err.message);
    return false;
  }
}

async function getAllVillesFromDB(limit = 200) {
  try {
    const { data, error } = await supabase
      .from('villes')
      .select('*')
      .limit(limit)
      .order('nom_ville');

    if (error) {
      console.error('ERROR: getAllVillesFromDB:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('ERROR: getAllVillesFromDB:', err.message);
    return [];
  }
}

async function getVilleByIdFromDB(villeId) {
  try {
    const { data, error } = await supabase
      .from('villes')
      .select('*')
      .eq('id', villeId)
      .single();

    if (error) {
      console.error('ERROR: getVilleByIdFromDB:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('ERROR: getVilleByIdFromDB:', err.message);
    return null;
  }
}

// ====================================================
// MAIN LOGIC: BD FIRST
// ====================================================

async function getOrFetchVille(nomVille) {
  console.log(`🔍 Recherche: ${nomVille}`);

  // 1. Chercher en BD
  let ville = await getVilleFromDB(nomVille);

  if (ville) {
    console.log(`✓ BD: ${nomVille} trouvée`);
    return { ...ville, source: 'database' };
  }

  // 2. Pas en BD, enrichir via APIs
  console.log(`⬇ API: Enrichissement...`);

  let nouvelleVille = {
    nom_ville: nomVille,
    code_insee: null,
    latitude: null,
    longitude: null,
    url_image: null,
    nb_hab: null,
    nb_etu: null
  };

  nouvelleVille = await enrichVille(nouvelleVille);

  // 3. Sauvegarder
  await saveOrUpdateVilleInDB(nouvelleVille);

  return { ...nouvelleVille, source: 'api' };
}

async function syncVillesComplete() {
  console.log('🔄 SYNC: Synchronisation complète...');

  // 1. Récupérer depuis ESR
  const villes = await fetchVillesFromESR();
  if (villes.length === 0) {
    console.warn('⚠ Pas de villes trouvées depuis ESR');
    return [];
  }

  console.log(`\n📍 ${villes.length} villes à enrichir\n`);

  // 2. Enrichir chaque ville
  const villesEnrichies = [];
  for (let i = 0; i < villes.length; i++) {
    const ville = villes[i];

    // Vérifier si déjà en BD complète
    const villeDB = await getVilleFromDB(ville.nom_ville, ville.code_insee);
    if (villeDB && villeDB.url_image && villeDB.latitude && villeDB.longitude && villeDB.nb_hab && villeDB.nb_etu !== null && villeDB.nb_etu !== undefined) {
      console.log(`✓ [${i + 1}/${villes.length}] ${ville.nom_ville} déjà OK`);
      villesEnrichies.push(villeDB);
      continue;
    }

    // Enrichir et sauver
    console.log(`🔄 [${i + 1}/${villes.length}] Enrichissement: ${ville.nom_ville}`);
    const enrichie = await enrichVille(ville);
    
    const saved = await saveOrUpdateVilleInDB(enrichie);

    if (saved) {
      console.log(`✅ [${i + 1}/${villes.length}] ${ville.nom_ville} sauvegardée`);
      villesEnrichies.push(enrichie);
    } else {
      console.log(`❌ [${i + 1}/${villes.length}] ${ville.nom_ville} ERREUR SAVE`);
    }

    // Barre de progression
    if ((i + 1) % 10 === 0) {
      console.log(`\n⏳ Progression: ${i + 1}/${villes.length}\n`);
    }
  }

  // Calculer nb_etu par ville (somme des nb_etu des universités)
  console.log('\n📊 Calcul du nombre d\'étudiants par ville...');
  const allVillesDB = await getAllVillesFromDB();
  for (const ville of allVillesDB) {
    const { data: unis, error } = await supabase
      .from('universites')
      .select('nb_etu')
      .eq('ville_id', ville.id);

    if (!error && unis) {
      const totalEtu = unis.reduce((sum, u) => sum + (u.nb_etu || 0), 0);
      await supabase
        .from('villes')
        .update({ nb_etu: totalEtu })
        .eq('id', ville.id);
    }
  }
  console.log(`✅ nb_etu mis à jour pour ${allVillesDB.length} villes`);

  console.log(`\n✅ SYNC complétée: ${villesEnrichies.length} villes sauvegardées\n`);
  return villesEnrichies;
}

// ====================================================
// EXPORTS
// ====================================================

module.exports = {
  getAllVillesFromDB,
  getVilleByIdFromDB,
  getOrFetchVille,
  syncVillesComplete,
  fetchLoyerMoyenCSV
};
