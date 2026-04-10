/**
 * Service de données des universités
 * - Source: API ESR (établissements d'enseignement supérieur)
 * - Images: Wikidata (P18/P154) via identifiant_wikidata ESR, fallback Wikipedia
 * - Stratégie BD-first: Supabase d'abord, APIs si absent
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ====================================================
// CONFIGURATION
// ====================================================

const API_ESR_URL = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records?where=type_d_etablissement%3D%22Universit%C3%A9%22&limit=100';

const API_TIMEOUT = 10000;
const API_DELAY = 150;

// ====================================================
// UTILITAIRES
// ====================================================

/**
 * Pause l'execution pour eviter le rate-limiting des APIs externes
 * @param {number} ms - Duree de la pause en millisecondes
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Effectue une requete HTTPS GET avec timeout et gestion d'erreur
 * @param {string} url - URL a appeler
 * @returns {Promise<Object|null>} La reponse JSON parsee, ou null en cas d'erreur ou timeout
 */
function makeRequest(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'StudyMap/1.0 (university data fetcher)'
      }
    }, (res) => {
      let data = '';
      const timeout = setTimeout(() => {
        req.destroy();
        console.error(`[TIMEOUT] ${url}`);
        resolve(null);
      }, API_TIMEOUT);

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          resolve(JSON.parse(data));
        } catch {
          console.error(`[PARSE ERROR] ${url}`);
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
// WIKIDATA - Images (batch)
// ====================================================

/**
 * Convertit un nom de fichier Wikimedia Commons en URL thumbnail 600px
 */
function wikimediaThumbUrl(filename) {
  const encoded = encodeURIComponent(filename.replace(/ /g, '_'));
  return `https://commons.wikimedia.org/w/thumb.php?f=${encoded}&w=600`;
}

/**
 * Récupère les images depuis Wikidata en batch (max 50 IDs par requête)
 * Cherche P18 (image) puis P154 (logo) en fallback
 */
async function fetchImagesFromWikidata(wikidataIds) {
  const imageMap = {};
  if (!wikidataIds || wikidataIds.length === 0) return imageMap;

  // Wikidata API supporte max 50 IDs par requête
  const batches = [];
  for (let i = 0; i < wikidataIds.length; i += 50) {
    batches.push(wikidataIds.slice(i, i + 50));
  }

  for (const batch of batches) {
    const ids = batch.join('|');
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=claims&format=json`;
    const result = await makeRequest(url);

    if (!result?.entities) continue;

    for (const [qid, entity] of Object.entries(result.entities)) {
      const claims = entity.claims || {};

      // P18 = image principale, P154 = logo
      let filename = null;
      if (claims.P18?.[0]?.mainsnak?.datavalue?.value) {
        filename = claims.P18[0].mainsnak.datavalue.value;
      } else if (claims.P154?.[0]?.mainsnak?.datavalue?.value) {
        filename = claims.P154[0].mainsnak.datavalue.value;
      }

      if (filename) {
        imageMap[qid] = wikimediaThumbUrl(filename);
      }
    }

    await sleep(API_DELAY);
  }

  return imageMap;
}

/**
 * Fallback: cherche une image via Wikipedia opensearch
 */
async function fetchImageFromWikipedia(nomUniversite) {
  try {
    const searchUrl = `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(nomUniversite)}&limit=3`;
    const searchResult = await makeRequest(searchUrl);

    if (!Array.isArray(searchResult) || !searchResult[1]?.length) return null;

    const pageTitle = searchResult[1][0];
    const imageUrl = `https://fr.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&piprop=thumbnail&pithumbsize=600`;
    const imageResult = await makeRequest(imageUrl);

    if (imageResult?.query?.pages) {
      const page = Object.values(imageResult.query.pages)[0];
      return page?.thumbnail?.source || null;
    }
    return null;
  } catch {
    return null;
  }
}

// ====================================================
// ESR API - Parsing
// ====================================================

/**
 * Récupère le dernier nombre d'inscrits disponible (2022..2010)
 */
function getLatestInscrits(record) {
  for (let year = 2024; year >= 2010; year--) {
    const val = record[`inscrits_${year}`];
    if (val != null) return Math.round(Number(val));
  }
  return null;
}

/**
 * Parse les résultats ESR en liste d'universités
 */
function parseUniversitesFromESR(results) {
  return results
    .filter(r => r.uo_lib)
    .map(r => {
      const villeNom = (r.uucr_nom || '').replace(/\s+\d+(er|e|ème)?$/i, '').trim();
      const comNom = (r.com_nom || '').replace(/\s+\d+(er|e|ème)?$/i, '').trim();
      const coords = r.coordonnees || {};
      return {
        nom: r.uo_lib,
        ville_nom: villeNom || comNom,
        com_nom: comNom,
        nb_etu: getLatestInscrits(r),
        wikidata_id: r.identifiant_wikidata?.[0] || null,
        lien: r.url || null,
        latitude: coords.lat || null,
        longitude: coords.lon || null
      };
    })
    .filter(u => u.ville_nom);
}

// ====================================================
// DATABASE OPERATIONS
// ====================================================

/**
 * Récupère le ville_id depuis la table villes par nom
 */
async function getVilleIdByNom(nomVille) {
  const { data, error } = await supabase
    .from('villes')
    .select('id')
    .ilike('nom_ville', nomVille)
    .limit(1);

  if (error || !data?.length) return null;
  return data[0].id;
}

/**
 * Récupère toutes les universités depuis Supabase
 */
async function getAllUniversitesFromDB(limit = 200) {
  const { data, error } = await supabase
    .from('universites')
    .select('*, villes(nom_ville)')
    .limit(limit)
    .order('nom');

  if (error) {
    console.error('ERROR getAllUniversitesFromDB:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Récupère une université par ID
 */
async function getUniversiteByIdFromDB(id) {
  const { data, error } = await supabase
    .from('universites')
    .select('*, villes(nom_ville)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('ERROR getUniversiteByIdFromDB:', error.message);
    return null;
  }
  return data;
}

/**
 * Récupère les universités d'une ville
 */
async function getUniversitesByVilleId(villeId) {
  const { data, error } = await supabase
    .from('universites')
    .select('*')
    .eq('ville_id', villeId)
    .order('nom');

  if (error) {
    console.error('ERROR getUniversitesByVilleId:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Insert ou update une université
 */
async function saveOrUpdateUniversite(univ) {
  // Chercher si elle existe déjà
  const { data: existing } = await supabase
    .from('universites')
    .select('id, url_image, lien')
    .eq('nom', univ.nom)
    .limit(1);

  if (existing?.length) {
    const { error } = await supabase
      .from('universites')
      .update({
        nb_etu: univ.nb_etu ?? existing[0].nb_etu,
        url_image: univ.url_image || existing[0].url_image,
        lien: univ.lien || existing[0].lien || null,
        ville_id: univ.ville_id,
        latitude: univ.latitude || null,
        longitude: univ.longitude || null
      })
      .eq('id', existing[0].id);

    if (error) {
      console.error(`ERROR update ${univ.nom}:`, error.message);
      return false;
    }
  } else {
    const { error } = await supabase
      .from('universites')
      .insert([{
        nom: univ.nom,
        ville_id: univ.ville_id,
        nb_etu: univ.nb_etu,
        url_image: univ.url_image || null,
        lien: univ.lien || null,
        latitude: univ.latitude || null,
        longitude: univ.longitude || null
      }]);

    if (error) {
      console.error(`ERROR insert ${univ.nom}:`, error.message);
      return false;
    }
  }
  return true;
}

// ====================================================
// SYNC LOGIC
// ====================================================

/**
 * Synchronisation complete des universites depuis l'API ESR.
 * Recupere les etablissements, resout les ville_id, recupere les images via Wikidata
 * (batch) puis Wikipedia en fallback, et sauvegarde chaque universite dans Supabase.
 * @returns {Promise<{saved: number, skipped: number, total: number}>} Statistiques de la synchronisation
 */
async function syncUniversites() {
  console.log('🎓 SYNC UNIVERSITÉS: Démarrage...');

  // 1. Fetch ESR
  console.log('📡 Appel API ESR...');
  const result = await makeRequest(API_ESR_URL);

  if (!result?.results) {
    console.error('❌ ESR: pas de résultats');
    return [];
  }

  console.log(`✓ ESR: ${result.results.length} établissements reçus`);
  const universites = parseUniversitesFromESR(result.results);
  console.log(`✓ ${universites.length} universités parsées`);

  // 2. Récupérer les ville_id en batch
  console.log('📍 Résolution des ville_id...');
  const { data: villes } = await supabase.from('villes').select('id, nom_ville');
  const villeMap = {};
  (villes || []).forEach(v => {
    villeMap[v.nom_ville.toLowerCase()] = v.id;
  });

  // 3. Récupérer les images Wikidata en batch
  const wikidataIds = universites
    .map(u => u.wikidata_id)
    .filter(Boolean);

  console.log(`🖼️  Récupération images Wikidata pour ${wikidataIds.length} universités...`);
  const imageMap = await fetchImagesFromWikidata(wikidataIds);
  console.log(`✓ ${Object.keys(imageMap).length} images trouvées via Wikidata`);

  // 4. Sauvegarder chaque université
  let saved = 0;
  let skipped = 0;

  for (let i = 0; i < universites.length; i++) {
    const univ = universites[i];

    // Résoudre ville_id: essayer com_nom (plus spécifique) puis uucr_nom
    const villeId = (univ.com_nom ? villeMap[univ.com_nom.toLowerCase()] : null)
      || villeMap[univ.ville_nom.toLowerCase()];
    if (!villeId) {
      console.log(`  ⚠️ [${i + 1}/${universites.length}] ${univ.nom}: ville "${univ.ville_nom}"${univ.com_nom && univ.com_nom !== univ.ville_nom ? ` / "${univ.com_nom}"` : ''} non trouvée en BD`);
      skipped++;
      continue;
    }

    // Image: Wikidata d'abord, fallback Wikipedia
    let imageUrl = null;
    if (univ.wikidata_id && imageMap[univ.wikidata_id]) {
      imageUrl = imageMap[univ.wikidata_id];
    } else {
      imageUrl = await fetchImageFromWikipedia(univ.nom);
      await sleep(API_DELAY);
    }

    const ok = await saveOrUpdateUniversite({
      nom: univ.nom,
      ville_id: villeId,
      nb_etu: univ.nb_etu,
      url_image: imageUrl,
      lien: univ.lien,
      latitude: univ.latitude,
      longitude: univ.longitude
    });

    if (ok) {
      saved++;
      console.log(`  ✅ [${i + 1}/${universites.length}] ${univ.nom} (${univ.ville_nom}) - ${univ.nb_etu || '?'} étudiants`);
    } else {
      console.log(`  ❌ [${i + 1}/${universites.length}] ${univ.nom} ERREUR`);
    }
  }

  console.log(`\n🎓 SYNC terminée: ${saved} sauvegardées, ${skipped} skippées (ville manquante)\n`);
  return { saved, skipped, total: universites.length };
}

// ====================================================
// EXPORTS
// ====================================================

module.exports = {
  getAllUniversitesFromDB,
  getUniversiteByIdFromDB,
  getUniversitesByVilleId,
  syncUniversites
};
