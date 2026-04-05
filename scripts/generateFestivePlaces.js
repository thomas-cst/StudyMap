// Script pour pré-calculer les lieux festifs de chaque ville et sauvegarder dans un fichier JSON
const fs = require('fs');
const axios = require('axios');


// Charger le cache existant si présent
let villesFestives = {};
try {
  villesFestives = require('../villes_festives.json');
} catch (e) {
  villesFestives = {};
}

// Liste des villes à traiter (à adapter selon ton besoin)
const villes = [
  "Aix-en-Provence", "Amiens", "Angers", "Arras", "Aubière", "Aulnoy-lez-Valenciennes", "Avignon", "Besançon", "Bordeaux", "Brest", "Caen", "Cergy", "Chambéry", "Champs-sur-Marne", "Clermont-Ferrand", "Corte", "Créteil", "Dijon", "Dunkerque", "Évry-Courcouronnes", "Gif-sur-Yvette", "Grenoble", "La Garde", "La Rochelle", "Le Havre", "Le Mans", "Lille", "Limoges", "Lorient", "Lyon", "Marseille", "Metz", "Mont-Saint-Aignan", "Montpellier", "Mulhouse", "Nancy", "Nanterre", "Nantes", "Nice", "Nîmes", "Orléans", "Paris", "Pau", "Perpignan", "Pessac", "Poitiers", "Reims", "Rennes", "Rouen", "Saint-Étienne", "Strasbourg", "Talence", "Toulouse", "Tours", "Versailles", "Villetaneuse", "Villeurbanne"
];

async function getFestiveCount(ville) {
  try {
    // Utilisation de Nominatim pour obtenir le bounding box de la ville
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(ville)}&country=France&format=json&limit=1`;
    const nominatimRes = await axios.get(nominatimUrl, { headers: { 'User-Agent': 'StudyMap/1.0' } });
    if (!nominatimRes.data[0]) {
      console.warn(`Ville non trouvée: ${ville}`);
      return 0;
    }
    const bbox = nominatimRes.data[0].boundingbox; // [south, north, west, east]
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="bar"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
        node["amenity"="pub"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
        node["amenity"="nightclub"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
      );
      out count;
    `;
    const overpassRes = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(overpassQuery)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000
    });
    // Log de la réponse brute
    console.log(`Réponse Overpass pour ${ville}:`, JSON.stringify(overpassRes.data));
    if (!overpassRes.data || typeof overpassRes.data !== 'object' || !Array.isArray(overpassRes.data.elements)) {
      console.warn(`Réponse Overpass inattendue pour ${ville}`);
      return 0;
    }
    let count = overpassRes.data.elements[0]?.count;
    if (typeof count !== 'number') {
      // Essayer de lire le champ tags.total (string)
      const tags = overpassRes.data.elements[0]?.tags;
      if (tags && typeof tags.total === 'string') {
        count = parseInt(tags.total, 10);
        if (!isNaN(count)) {
          console.log(`Lieux festifs pour ${ville} (via tags.total): ${count}`);
          return count;
        }
      }
      console.warn(`Champ 'count' ou 'tags.total' manquant ou invalide pour ${ville} (elements: ${JSON.stringify(overpassRes.data.elements)})`);
      return 0;
    }
    console.log(`Lieux festifs pour ${ville}: ${count}`);
    return count;
  } catch (err) {
    console.warn(`Erreur pour ${ville}:`, err.message);
    return 0;
  }
}


(async () => {
  for (const ville of villes) {
    if (villesFestives[ville] && villesFestives[ville] > 0) {
      console.log(`Déjà OK: ${ville} (${villesFestives[ville]})`);
      continue;
    }
    console.log(`Traitement: ${ville}`);
    villesFestives[ville] = await getFestiveCount(ville);
    // Attendre 10s entre chaque requête pour éviter le rate limit
    await new Promise(r => setTimeout(r, 10000));
    fs.writeFileSync('villes_festives.json', JSON.stringify(villesFestives, null, 2));
  }
  console.log('Fichier villes_festives.json mis à jour.');
})();
