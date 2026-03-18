/**
 * StudyMap Backend Server
 * 
 * Architecture:
 * - Express.js server
 * - Supabase PostgreSQL database
 * - Routes: authentication (via Supabase), villes (cities)
 */

const express = require('express');
const cors = require('cors');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Configuration
require('dotenv').config();

// Initialiser Supabase
const supabaseUrl = 'https://bjkpbzsftztbkurneezq.supabase.co';
const supabaseKey = 'sb_publishable_w7vbFRPStWM_hnKkuQc3AQ_UcfGpPre';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());


// ====================================================
// ROUTES DE TEST
// ====================================================

app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('villes')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    res.json({ message: "Connexion Supabase réussie !", status: 'ok' });
  } catch (err) {
    console.error('ERROR: Impossible de tester la BD:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Reset la table villes (supprimer tout)
 * GET /api/reset
 */
app.get('/api/reset', async (req, res) => {
  try {
    console.log('🔴 Suppression de toutes les villes...');
    // Récupérer tous les IDs puis les supprimer
    const { data: allVilles, error: selectError } = await supabase
      .from('villes')
      .select('id');
    
    if (selectError) throw selectError;
    
    if (allVilles && allVilles.length > 0) {
      const ids = allVilles.map(v => v.id);
      const { error: deleteError } = await supabase
        .from('villes')
        .delete()
        .in('id', ids);
      
      if (deleteError) throw deleteError;
    }
    
    console.log('✅ Table vidée');
    res.json({ message: 'Table villes vidée' });
  } catch (err) {
    console.error('ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Initialiser les villes depuis l'API ESR
 * À appeler UNE SEULE FOIS au démarrage
 * GET /api/init
 */
app.get('/api/init', async (req, res) => {
  try {
    console.log('🔄 Initialisation des villes...');
    
    const esr_url = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records?limit=500';
    
    // Utiliser https.get au lieu de fetch
    const fetchFromAPI = () => {
      return new Promise((resolve, reject) => {
        console.log('📡 Appel API ESR...');
        https.get(esr_url, (response) => {
          console.log(`📥 Réponse reçue: ${response.statusCode}`);
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              console.log('✅ JSON parsé, résultats:', parsed.results?.length || 'undefined');
              resolve(parsed);
            } catch (e) {
              console.error('❌ Erreur parsing JSON:', e.message);
              reject(e);
            }
          });
        }).on('error', (err) => {
          console.error('❌ Erreur HTTPS:', err.message);
          reject(err);
        });
      });
    };
    
    const esr_data = await fetchFromAPI();
    console.log('📊 API ESR retournée, nombre de résultats:', esr_data.results?.length || 0);
    
    // Extraire les villes uniques
    const villesMap = new Map();
    
    if (esr_data.results && Array.isArray(esr_data.results)) {
      console.log('🔍 Parcours des résultats...');
      esr_data.results.forEach((etabl, idx) => {
        // Essayer différents champs pour obtenir la ville
        const nomVille = etabl.com_nom || etabl.commune || etabl.ville;
        const codeVille = etabl.com_code || etabl.code_commune || etabl.code_insee;
        
        if (nomVille && codeVille) {
          if (!villesMap.has(codeVille)) {
            let lat = null, lng = null;
            
            // Essayer différents formats de coordonnées
            if (etabl.localisation?.coordinates && Array.isArray(etabl.localisation.coordinates)) {
              lng = etabl.localisation.coordinates[0];
              lat = etabl.localisation.coordinates[1];
            } else if (etabl.coordonnees?.lat && etabl.coordonnees?.lon) {
              lat = etabl.coordonnees.lat;
              lng = etabl.coordonnees.lon;
            }
            
            villesMap.set(codeVille, {
              nom_ville: nomVille,
              code_insee: codeVille,
              latitude: lat,
              longitude: lng,
              url_image: null
            });
          }
        }
      });
    }
    
    console.log(`📍 Villes extraites: ${villesMap.size}`);
    
    // Si pas de villes trouvées, utiliser des données hardcoded
    if (villesMap.size === 0) {
      console.log('⚠️  Pas de données de l\'API ESR, utilisation des données hardcoded...');
      
      const villesHardcoded = [
        { nom_ville: 'Paris', code_insee: '75056', latitude: 48.8566, longitude: 2.3522, url_image: null },
        { nom_ville: 'Lyon', code_insee: '69123', latitude: 45.7640, longitude: 4.8357, url_image: null },
        { nom_ville: 'Marseille', code_insee: '13055', latitude: 43.2965, longitude: 5.3698, url_image: null },
        { nom_ville: 'Toulouse', code_insee: '31555', latitude: 43.6047, longitude: 1.4442, url_image: null },
        { nom_ville: 'Nice', code_insee: '06088', latitude: 43.7102, longitude: 7.2620, url_image: null },
        { nom_ville: 'Nantes', code_insee: '44109', latitude: 47.2184, longitude: -1.5536, url_image: null },
        { nom_ville: 'Strasbourg', code_insee: '67482', latitude: 48.5734, longitude: 7.7521, url_image: null },
        { nom_ville: 'Montpellier', code_insee: '34172', latitude: 43.6108, longitude: 3.8767, url_image: null },
        { nom_ville: 'Bordeaux', code_insee: '33063', latitude: 44.8378, longitude: -0.5792, url_image: null },
        { nom_ville: 'Lille', code_insee: '59350', latitude: 50.6292, longitude: 3.0573, url_image: null },
        { nom_ville: 'Rennes', code_insee: '35238', latitude: 48.1173, longitude: -1.6778, url_image: null },
        { nom_ville: 'Reims', code_insee: '51454', latitude: 49.2588, longitude: 4.0344, url_image: null },
        { nom_ville: 'Le Havre', code_insee: '76321', latitude: 49.4944, longitude: 0.1079, url_image: null },
        { nom_ville: 'Saint-Étienne', code_insee: '42218', latitude: 45.4398, longitude: 4.3910, url_image: null },
        { nom_ville: 'Toulon', code_insee: '83137', latitude: 43.1256, longitude: 5.9355, url_image: null },
        { nom_ville: 'Grenoble', code_insee: '38185', latitude: 45.1885, longitude: 5.7245, url_image: null },
        { nom_ville: 'Angers', code_insee: '49007', latitude: 47.4667, longitude: -0.5500, url_image: null },
        { nom_ville: 'Valence', code_insee: '26362', latitude: 44.9333, longitude: 4.8917, url_image: null },
        { nom_ville: 'Pau', code_insee: '64445', latitude: 43.2965, longitude: -0.3697, url_image: null },
        { nom_ville: 'Orléans', code_insee: '45234', latitude: 47.9023, longitude: 1.9095, url_image: null },
        { nom_ville: 'Aix-en-Provence', code_insee: '13001', latitude: 43.5298, longitude: 5.4474, url_image: null },
        { nom_ville: 'Dijon', code_insee: '21231', latitude: 47.3225, longitude: 5.0409, url_image: null },
        { nom_ville: 'Nîmes', code_insee: '30189', latitude: 43.8345, longitude: 4.3605, url_image: null },
        { nom_ville: 'Dunkerque', code_insee: '59183', latitude: 51.0364, longitude: 2.3746, url_image: null },
        { nom_ville: 'Lens', code_insee: '62498', latitude: 50.4308, longitude: 2.8211, url_image: null },
        { nom_ville: 'Saint-Denis', code_insee: '93066', latitude: 48.9355, longitude: 2.3568, url_image: null },
        { nom_ville: 'Brest', code_insee: '29019', latitude: 48.3905, longitude: -4.4860, url_image: null },
        { nom_ville: 'Limoges', code_insee: '87085', latitude: 45.8304, longitude: 1.2592, url_image: null },
        { nom_ville: 'Villeurbanne', code_insee: '69266', latitude: 45.7694, longitude: 4.8846, url_image: null },
        { nom_ville: 'Le Mans', code_insee: '72181', latitude: 48.0055, longitude: 0.1992, url_image: null },
        { nom_ville: 'Amiens', code_insee: '80021', latitude: 49.8942, longitude: 2.2955, url_image: null },
        { nom_ville: 'Metz', code_insee: '57463', latitude: 49.1193, longitude: 6.1757, url_image: null },
        { nom_ville: 'Clermont-Ferrand', code_insee: '63113', latitude: 45.7772, longitude: 3.0862, url_image: null },
        { nom_ville: 'Besançon', code_insee: '25056', latitude: 47.2379, longitude: 6.0242, url_image: null },
        { nom_ville: 'Perpignan', code_insee: '66136', latitude: 42.6987, longitude: 2.8945, url_image: null },
        { nom_ville: 'Caen', code_insee: '14118', latitude: 49.1829, longitude: -0.3597, url_image: null },
        { nom_ville: 'Poitiers', code_insee: '86194', latitude: 46.5847, longitude: 0.3406, url_image: null },
        { nom_ville: 'Tours', code_insee: '37261', latitude: 47.3941, longitude: 0.6848, url_image: null },
        { nom_ville: 'Nanterre', code_insee: '92050', latitude: 48.8905, longitude: 2.2256, url_image: null },
        { nom_ville: 'Versailles', code_insee: '78646', latitude: 48.8048, longitude: 2.1303, url_image: null },
        { nom_ville: 'Bourges', code_insee: '18033', latitude: 47.0798, longitude: 2.3977, url_image: null },
        { nom_ville: 'Lyon (2e)', code_insee: '69381', latitude: 45.7571, longitude: 4.8353, url_image: null },
        { nom_ville: 'Villejuif', code_insee: '94077', latitude: 48.7988, longitude: 2.3625, url_image: null },
        { nom_ville: 'Saint-Herblain', code_insee: '44190', latitude: 47.1907, longitude: -1.6414, url_image: null },
        { nom_ville: 'Rouen', code_insee: '76540', latitude: 49.4432, longitude: 1.0992, url_image: null },
        { nom_ville: 'Villefranche-sur-Saône', code_insee: '69702', latitude: 45.9972, longitude: 4.7225, url_image: null },
        { nom_ville: 'Colmar', code_insee: '68066', latitude: 48.0736, longitude: 7.3577, url_image: null },
        { nom_ville: 'Marseille (2e)', code_insee: '13212', latitude: 43.3098, longitude: 5.3699, url_image: null }
      ];
      
      villesMap.clear();
      villesHardcoded.forEach(v => villesMap.set(v.code_insee, v));
      console.log('✅ Données hardcoded chargées');
    }
    
    // Vérifier si la table est déjà remplie
    console.log('🔐 Vérification Supabase...');
    const { data: existingVilles, error: selectError } = await supabase
      .from('villes')
      .select('id');
    
    if (selectError) {
      console.error('❌ Erreur lors de la lecture:', selectError);
      throw selectError;
    }
    
    if (existingVilles && existingVilles.length > 0) {
      console.log(`⚠️  Base déjà initialisée avec ${existingVilles.length} villes`);
      return res.json({ message: 'Base déjà initialisée', count: existingVilles.length });
    }
    
    // Insérer les villes
    const villesToInsert = Array.from(villesMap.values());
    console.log(`💾 Insertion de ${villesToInsert.length} villes...`);
    console.log('Données à insérer:', villesToInsert.slice(0, 2));
    
    const { data: inserted, error: insertError } = await supabase
      .from('villes')
      .insert(villesToInsert)
      .select();
    
    if (insertError) {
      console.error('❌ Erreur insertion:', insertError);
      throw insertError;
    }
    
    console.log(`✅ SUCCESS: ${inserted?.length || villesToInsert.length} villes insérées`);
    res.json({ message: 'Initialisation réussie', count: inserted?.length || villesToInsert.length });
    
  } catch (err) {
    console.error('🔴 ERROR FATAL:', err.message || err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: err.message || 'Erreur lors de l\'initialisation' });
  }
});

// ====================================================
// ROUTES AUTHENTICATION (via Supabase)
// ====================================================

/**
 * Signup - Créer un nouvel utilisateur
 * @route POST /api/signup
 * @body {email, password}
 */
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  console.log(`SIGNUP: Tentative d'inscription avec ${email}`);

  try {
    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email);

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: 'Cet email existe déjà' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer dans la table users
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword }])
      .select();

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    console.log(`SUCCESS: Utilisateur créé avec l'email ${email}`);
    res.json({
      message: 'Inscription réussie',
      user: { id: userData[0].id, email: userData[0].email }
    });
  } catch (err) {
    console.error(`ERROR: Erreur lors de l'inscription: ${err.message}`);
    res.status(500).json({ error: "Erreur lors de l'inscription : " + err.message });
  }
});

/**
 * Login - Connecter un utilisateur
 * @route POST /api/login
 * @body {email, password}
 */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`LOGIN: Tentative de connexion pour ${email}`);

  try {
    // Récupérer l'utilisateur
    const { data: users, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (selectError || !users || users.length === 0) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    console.log(`SUCCESS: Connexion réussie pour ${email}`);
    res.json({
      message: 'Connexion réussie',
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error(`ERROR: Erreur connexion: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// ROUTES VILLES
// ====================================================

/**
 * Get all villes
 * @route GET /api/villes
 */
app.get('/api/villes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('villes')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get villes by search
 * @route GET /api/villes/search
 */
app.get('/api/villes/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Paramètre de recherche requis' });
  }

  try {
    const { data, error } = await supabase
      .from('villes')
      .select('*')
      .ilike('nom_ville', `%${q}%`);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Récupérer les images Wikipedia pour chaque ville
 * GET /api/fetch-images
 */
app.get('/api/fetch-images', async (req, res) => {
  try {
    console.log('🖼️  Récupération des images Wikipedia...');
    
    // Récupérer toutes les villes
    const { data: villes, error: selectError } = await supabase
      .from('villes')
      .select('*');
    
    if (selectError) throw selectError;
    if (!villes || villes.length === 0) {
      return res.json({ message: 'Aucune ville trouvée' });
    }
    
    console.log(`📍 ${villes.length} villes à traiter...`);
    
    // Fonction pour appeler Wikidata avec le code INSEE
    const fetchImageFromWikidata = (codeInsee, nomVille) => {
      return new Promise((resolve) => {
        // Chercher l'entité Wikidata par code INSEE
        const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(nomVille)}&type=item&language=fr&format=json`;
        
        https.get(url, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const results = parsed.search || [];
              
              if (results.length > 0) {
                const entityId = results[0].id;
                console.log(`  🔗 ${nomVille}: ${entityId}`);
                
                // Maintenant récupérer l'image pour cette entité
                const imgUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${entityId}&property=P18&format=json`;
                
                https.get(imgUrl, (imgResponse) => {
                  let imgData = '';
                  imgResponse.on('data', chunk => imgData += chunk);
                  imgResponse.on('end', () => {
                    try {
                      const imgParsed = JSON.parse(imgData);
                      const claims = imgParsed.claims?.P18 || [];
                      
                      if (claims.length > 0) {
                        const fileName = claims[0].mainsnak.datavalue.value;
                        // URL de l'image sur Wikimedia Commons
                        const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&format=json`;
                        
                        https.get(commonsUrl, (commonsResponse) => {
                          let commonsData = '';
                          commonsResponse.on('data', chunk => commonsData += chunk);
                          commonsResponse.on('end', () => {
                            try {
                              const commonsParsed = JSON.parse(commonsData);
                              const pages = commonsParsed.query?.pages || {};
                              const firstPage = Object.values(pages)[0];
                              
                              if (firstPage && firstPage.imageinfo && firstPage.imageinfo[0]) {
                                const imageUrl = firstPage.imageinfo[0].url;
                                console.log(`  ✅ ${nomVille}: image trouvée`);
                                resolve(imageUrl);
                              } else {
                                console.log(`  ❌ ${nomVille}: pas d'image trouvée`);
                                resolve(null);
                              }
                            } catch (e) {
                              console.log(`  ⚠️  ${nomVille}: erreur Commons`);
                              resolve(null);
                            }
                          });
                        }).on('error', () => {
                          console.log(`  ⚠️  ${nomVille}: erreur réseau Commons`);
                          resolve(null);
                        });
                      } else {
                        console.log(`  ❌ ${nomVille}: pas de propriété P18`);
                        resolve(null);
                      }
                    } catch (e) {
                      console.log(`  ⚠️  ${nomVille}: erreur parsing claims`);
                      resolve(null);
                    }
                  });
                }).on('error', () => {
                  console.log(`  ⚠️  ${nomVille}: erreur réseau claims`);
                  resolve(null);
                });
              } else {
                console.log(`  ❌ ${nomVille}: entité Wikidata non trouvée`);
                resolve(null);
              }
            } catch (e) {
              console.log(`  ⚠️  ${nomVille}: erreur parsing entity`);
              resolve(null);
            }
          });
        }).on('error', () => {
          console.log(`  ⚠️  ${nomVille}: erreur réseau entity`);
          resolve(null);
        });
      });
    };
    
    // Traiter chaque ville
    let updated = 0;
    for (const ville of villes) {
      console.log(`🔄 Traitement de ${ville.nom_ville}...`);
      const imageUrl = await fetchImageFromWikidata(ville.code_insee, ville.nom_ville);
      
      if (imageUrl) {
        const { error: updateError } = await supabase
          .from('villes')
          .update({ url_image: imageUrl })
          .eq('id', ville.id);
        
        if (!updateError) {
          updated++;
          console.log(`  💾 Sauvegardé en BD`);
        } else {
          console.log(`  ⚠️  Erreur BD: ${updateError.message}`);
        }
      }
      
      // Délai plus long pour Wikidata
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ ${updated}/${villes.length} images récupérées et sauvegardées`);
    res.json({ message: 'Images récupérées', count: updated, total: villes.length });
    
  } catch (err) {
    console.error('ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur : http://localhost:${PORT}`);
});