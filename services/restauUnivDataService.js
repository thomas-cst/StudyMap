/**
 * Service de données des restaurants universitaires
 * - Source: API CROUS via data.enseignementsup-recherche.gouv.fr
 * - Matching: zone CROUS → ville BD → université la plus proche (géolocalisation)
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

const API_CROUS_BASE = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr_crous_restauration_france_entiere/records';
const API_TIMEOUT = 10000;

// ====================================================
// UTILITAIRES
// ====================================================

/**
 * Effectue une requete HTTPS GET avec timeout et gestion d'erreur
 * @param {string} url - URL a appeler
 * @returns {Promise<Object|null>} La reponse JSON parsee, ou null en cas d'erreur ou timeout
 */
function makeRequest(url) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: API_TIMEOUT,
      headers: { 'User-Agent': 'StudyMap/1.0' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Extrait l'adresse du champ contact CROUS
 * Format typique: "Resto U' Nom 23 rue X 67000 Ville E-mail: ..."
 */
function extractAdresse(contact, title) {
  if (!contact) return null;
  // Retirer le nom du restaurant au début
  let addr = contact;
  if (title && addr.startsWith(title)) {
    addr = addr.substring(title.length);
  }
  // Retirer email, téléphone, etc.
  addr = addr.replace(/E-mail\s*:.*$/i, '').replace(/T[eé]l[eé]?phone?\s*:.*$/i, '').replace(/Fax\s*:.*$/i, '').trim();
  return addr || null;
}

/**
 * Distance en km entre deux points (formule de Haversine)
 */
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Convertit une valeur en nombre, retourne null si la conversion est impossible
 * Utile pour les coordonnees qui peuvent etre des chaines vides dans l'API CROUS
 * @param {*} value - Valeur a convertir
 * @returns {number|null} Le nombre converti ou null
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normalise un nom de zone CROUS pour matcher avec nom_ville en BD
 */
function normalizeZone(zone) {
  if (!zone) return null;
  // Ne pas normaliser les zones "Campus X" qui sont des alias importants
  if (/^campus\s*\d+$/i.test(zone.trim())) return zone.trim();
  return zone
    .replace(/\s*\(\d+\)\s*$/, '')          // "Limoges (87)" → "Limoges"
    .replace(/\s*-\s*Campus.*$/i, '')        // "REIMS - Campus Lettres" → "REIMS"
    .replace(/\s*(est|ouest)\b.*$/i, '')     // "Rennes est-Beaulieu" → "Rennes"
    .replace(/\s*\d+$/, '')                  // "Paris 05" → "Paris"
    .trim();
}

// ====================================================
// API CROUS - Fetch
// ====================================================

/**
 * Récupère tous les restaurants CROUS (pagination par 100)
 */
async function fetchAllRestaurants() {
  const allRecords = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${API_CROUS_BASE}?limit=${limit}&offset=${offset}&refine=type%3ARestaurant`;
    const data = await makeRequest(url);
    if (!data?.results?.length) break;
    allRecords.push(...data.results);
    if (data.results.length < limit) break;
    offset += limit;
  }

  return allRecords;
}

/**
 * Parse les résultats CROUS en liste de restaurants
 */
function parseRestaurants(records) {
  return records
    .filter(r => r.title && r.id)
    .map(r => ({
      crous_id: r.id,
      nom: r.title,
      adresse: extractAdresse(r.contact, r.title),
      zone: r.zone || null,
      lat: r.geolocalisation?.lat || r.lat || null,
      lon: r.geolocalisation?.lon || null
    }));
}

// ====================================================
// DATABASE OPERATIONS
// ====================================================

/**
 * Recupere tous les restaurants universitaires avec le nom de leur universite associee
 * @param {number} limit - Nombre maximum de restaurants a retourner (defaut: 500)
 * @returns {Promise<Array>} Liste des restaurants
 */
async function getAllRestauFromDB(limit = 500) {
  const { data, error } = await supabase
    .from('restau_universitaires')
    .select('*, universites(nom)')
    .limit(limit)
    .order('nom');

  if (error) {
    console.error('ERROR getAllRestauFromDB:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Recupere les restaurants universitaires d'une universite specifique
 * @param {number} universiteId - ID de l'universite
 * @returns {Promise<Array>} Liste des restaurants de l'universite, tries par nom
 */
async function getRestauByUniversiteId(universiteId) {
  const { data, error } = await supabase
    .from('restau_universitaires')
    .select('*')
    .eq('universite_id', universiteId)
    .order('nom');

  if (error) {
    console.error('ERROR getRestauByUniversiteId:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Insere ou met a jour un restaurant universitaire dans Supabase (upsert par nom)
 * @param {Object} restau - Objet restaurant avec nom, adresse et universite_id
 * @returns {Promise<boolean>} true si l'operation a reussi, false sinon
 */
async function saveOrUpdateRestau(restau) {
  const { data: existing } = await supabase
    .from('restau_universitaires')
    .select('id')
    .eq('nom', restau.nom)
    .limit(1);

  if (existing?.length) {
    const { error } = await supabase
      .from('restau_universitaires')
      .update({
        adresse: restau.adresse || null,
        universite_id: restau.universite_id
      })
      .eq('id', existing[0].id);

    if (error) {
      console.error(`ERROR update ${restau.nom}:`, error.message);
      return false;
    }
  } else {
    const { error } = await supabase
      .from('restau_universitaires')
      .insert([{
        nom: restau.nom,
        adresse: restau.adresse || null,
        universite_id: restau.universite_id
      }]);

    if (error) {
      console.error(`ERROR insert ${restau.nom}:`, error.message);
      return false;
    }
  }
  return true;
}

// ====================================================
// MATCHING - Restaurant → Université
// ====================================================

/**
 * Trouve l'université la plus proche d'un restaurant
 * Stratégie: zone CROUS → ville BD → université(s) de la ville
 * Si plusieurs universités dans la ville, prend la plus proche (lat/lon)
 */
function findBestUniversite(restau, villeMap, univsByVille, villesById) {
  const zone = normalizeZone(restau.zone);
  if (!zone) return null;

  // Chercher la ville correspondant à la zone
  const zoneLower = zone.toLowerCase();
  let villeId = villeMap[zoneLower];

  // Alias courants pour les zones CROUS
  if (!villeId) {
    const aliases = {
      // Grenoble → pas en BD, pas d'université Grenoble dans la base
      // (Saint-Martin-d'Hères / Grenoble skippés)
      // Chambéry / Savoie
      'chambery': 'chambéry',
      'bourget du lac': 'chambéry',
      'annecy': 'chambéry',
      // Rouen
      'mont saint aignan': 'mont-saint-aignan',
      'rouen': 'mont-saint-aignan',
      // Saint-Étienne
      'saint-etienne': 'saint-étienne',
      'saint etienne du rouvray': 'mont-saint-aignan',
      // IDF
      'marne-la-vallée': 'champs-sur-marne',
      'marne la vallée': 'champs-sur-marne',
      'villeurbanne': 'villeurbanne',
      'cachan': 'paris',
      'bobigny': 'paris',
      'aubervilliers': 'paris',
      'sénart': 'paris',
      'saint-denis': 'villetaneuse',
      // Marseille
      'aix': 'marseille',
      // Nancy/Nice → pas en BD, skippés
      // Lille
      'villeneuve d\'ascq': 'lille',
      'villeneuve d ascq': 'lille',
      // Lyon
      'rockefeller': 'lyon',
      'ens-gerland': 'lyon',
      'les quais - berges du rhône': 'lyon',
      'manufacture': 'lyon',
      'porte des alpes': 'lyon',
      'entpe': 'lyon',
      'ecole centrale': 'lyon',
      // Clermont-Ferrand (zones CROUS: RDO, RCZ, RAU, RMO)
      'rdo': 'clermont-ferrand',
      'rcz': 'clermont-ferrand',
      'cezeaux': 'clermont-ferrand',
      'aurillac': 'clermont-ferrand',
      'montlucon': 'clermont-ferrand',
      // Bordeaux → Pessac (Bordeaux Montaigne) ou Talence (Bordeaux)
      'bordeaux': 'pessac',
      // Caen (zones Campus 2 / Campus 4)
      'campus 2': 'caen',
      'campus 4': 'caen',
      'cote de nacre': 'caen',
      // Valenciennes
      'valenciennes': 'aulnoy-lez-valenciennes',
      // Toulouse zones
      'toulouse': 'toulouse',
      'albi': 'toulouse',
      // Reims
      'charleville': 'reims',
      'chalons': 'reims',
      // Toulon
      'toulon': 'marseille',
      'la garde': 'marseille',
      // Béziers → Montpellier / Perpignan
      'béziers': 'montpellier',
      'beziers': 'montpellier',
    };
    for (const [alias, target] of Object.entries(aliases)) {
      if (zoneLower.includes(alias)) {
        villeId = villeMap[target];
        break;
      }
    }
  }

  // Essayer aussi les zones IDF avec départements
  if (!villeId) {
    const idfMap = {
      'essonne': 'gif-sur-yvette',
      'hauts de seine': 'nanterre',
      'val d\'oise': 'cergy',
      'val d oise': 'cergy',
      'yvelines': 'versailles',
      'seine et bièvre': 'paris',
      'sud seine-et-marne': 'paris',
      'petite couronne': 'paris',
    };
    for (const [dept, target] of Object.entries(idfMap)) {
      if (zoneLower.includes(dept)) {
        villeId = villeMap[target];
        break;
      }
    }
  }

  // Essayer match partiel
  if (!villeId) {
    for (const [nom, id] of Object.entries(villeMap)) {
      if (zoneLower.includes(nom) || nom.includes(zoneLower)) {
        villeId = id;
        break;
      }
    }
  }

  if (!villeId) return null;

  const univs = univsByVille[villeId];
  if (!univs?.length) return null;

  // Si une seule université dans la ville, pas d'ambiguïté
  if (univs.length === 1) {
    return univs[0].id;
  }

  // 1) Priorité: restaurant géolocalisé → université la plus proche
  const restauLat = toNumber(restau.lat);
  const restauLon = toNumber(restau.lon);
  if (restauLat !== null && restauLon !== null) {
    let bestUniv = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const univ of univs) {
      const univLat = toNumber(univ.latitude);
      const univLon = toNumber(univ.longitude);
      if (univLat === null || univLon === null) continue;

      const dist = distanceKm(restauLat, restauLon, univLat, univLon);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestUniv = univ;
      }
    }

    if (bestUniv) return bestUniv.id;
  }

  // 2) Fallback: centre de ville → université la plus proche
  const ville = villesById[villeId];
  const villeLat = toNumber(ville?.latitude);
  const villeLon = toNumber(ville?.longitude);

  if (villeLat !== null && villeLon !== null) {
    let bestUniv = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const univ of univs) {
      const univLat = toNumber(univ.latitude);
      const univLon = toNumber(univ.longitude);
      if (univLat === null || univLon === null) continue;

      const dist = distanceKm(villeLat, villeLon, univLat, univLon);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestUniv = univ;
      }
    }

    if (bestUniv) return bestUniv.id;
  }

  // 3) Dernier fallback: premier élément (comportement historique)
  return univs[0].id;
}

// ====================================================
// SYNC LOGIC
// ====================================================

/**
 * Synchronisation complete des restaurants universitaires depuis l'API CROUS.
 * Recupere les restaurants, les associe aux universites via geolocalisation (Haversine),
 * puis les sauvegarde dans Supabase.
 * @returns {Promise<Array>} Liste complete des restaurants apres synchronisation
 */
async function syncRestauUniv() {
  console.log('🍽️  SYNC RESTAURANTS UNIVERSITAIRES: Démarrage...');

  // 1. Fetch CROUS
  console.log('📡 Appel API CROUS...');
  const records = await fetchAllRestaurants();
  if (!records.length) {
    console.error('❌ CROUS: pas de résultats');
    return [];
  }
  console.log(`✓ CROUS: ${records.length} restaurants reçus`);

  const restaurants = parseRestaurants(records);
  console.log(`✓ ${restaurants.length} restaurants parsés`);

  // 2. Charger les villes et universités pour le matching
  console.log('📍 Chargement des villes et universités...');
  const { data: villes } = await supabase.from('villes').select('id, nom_ville, latitude, longitude');
  const { data: univs } = await supabase.from('universites').select('id, nom, ville_id, latitude, longitude');

  const villeMap = {};
  const villesById = {};
  (villes || []).forEach(v => {
    villeMap[v.nom_ville.toLowerCase()] = v.id;
    villesById[v.id] = v;
  });

  const univsByVille = {};
  (univs || []).forEach(u => {
    if (!univsByVille[u.ville_id]) univsByVille[u.ville_id] = [];
    univsByVille[u.ville_id].push(u);
  });

  // 3. Matcher et sauvegarder
  let saved = 0;
  let skipped = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const restau = restaurants[i];

    const universiteId = findBestUniversite(restau, villeMap, univsByVille, villesById);
    if (!universiteId) {
      console.log(`  ⚠️ [${i + 1}/${restaurants.length}] ${restau.nom}: zone "${restau.zone}" non matchée`);
      skipped++;
      continue;
    }

    const ok = await saveOrUpdateRestau({
      nom: restau.nom,
      adresse: restau.adresse,
      universite_id: universiteId
    });

    if (ok) {
      saved++;
      console.log(`  ✅ [${i + 1}/${restaurants.length}] ${restau.nom} → univ ${universiteId}`);
    }
  }

  console.log(`\n🍽️  SYNC terminée: ${saved} sauvegardés, ${skipped} skippés (zone non matchée)\n`);

  return getAllRestauFromDB();
}

// ====================================================
// EXPORTS
// ====================================================

module.exports = {
  getAllRestauFromDB,
  getRestauByUniversiteId,
  syncRestauUniv
};
