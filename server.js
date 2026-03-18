/**
 * StudyMap Backend Server
 * 
 * Architecture:
 * - Express.js server
 * - MySQL database (Aiven)
 * - Routes: authentication (signup, login, Google), villes (cities)
 * 
 * Modules importants:
 * - routes/villes.js: API endpoints pour les villes
 * - services/villesService.js: Logique métier (fetch ESR, Wikipedia, BD)
 * - db.js: Pool MySQL
 */

const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

// Import des routes
const villesRoutes = require('./routes/villes');

// Configuration
require('dotenv').config();

const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ====================================================
// MIDDLEWARE
// ====================================================

// CORS: Autoriser Angular (port 4200) et autres origins à appeler ce serveur
app.use(cors());

// Parser JSON pour lire les bodies des requêtes
app.use(express.json());


// ====================================================
// ROUTES DE TEST
// ====================================================

/**
 * Test endpoint: Vérifie que le serveur et la BD répondent
 * @route GET /api/test
 * @returns {Object} { message, result: 1+1 }
 */
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    console.log('SUCCESS: Test connexion BD réussi');
    res.json({ message: "Le serveur et la BDD répondent !", result: rows[0].solution });
  } catch (err) {
    console.error('ERROR: Impossible de tester la BD:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Debug endpoint: Décrit la structure de la table Users
 * @route GET /api/describe-users
 * @returns {Array} Colonnes de la table Users
 */
app.get('/api/describe-users', async (req, res) => {
  try {
    const [rows] = await db.query('DESCRIBE Users');
    res.json({ columns: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// ROUTES AUTHENTICATION
// ====================================================

/**
 * Inscription: Crée un nouvel utilisateur
 * @route POST /api/signup
 * @body {email, password}
 * @returns {Object} { message, user: { id_user, email } }
 */
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  console.log(`SIGNUP: Tentative d'inscription avec ${email}`);

  try {
    // Vérifier si l'utilisateur existe déjà
    const [existingUser] = await db.query('SELECT id_user FROM Users WHERE email = ?', [email]);

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Utilisateur déjà existant' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer le nouvel utilisateur
    const result = await db.query('INSERT INTO Users (email, password) VALUES (?, ?)', [email, hashedPassword]);

    console.log(`SUCCESS: Utilisateur créé avec l'email ${email}`);

    res.json({
      message: 'Inscription réussie',
      user: {
        id_user: result[0].insertId,
        email: email
      }
    });
  } catch (err) {
    console.error(`ERROR: Erreur lors de l'inscription: ${err.message}`);
    res.status(500).json({ error: "Erreur lors de l'inscription : " + err.message });
  }
});

/**
 * Connexion: Authenticate un utilisateur avec email/password
 * @route POST /api/login
 * @body {email, password}
 * @returns {Object} { message, user: { id, email } }
 */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`LOGIN: Tentative de connexion pour ${email}`);

  try {
    // Récupérer l'utilisateur
    const [users] = await db.query('SELECT id_user, email, password FROM Users WHERE email = ?', [email]);

    if (users.length === 0) {
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
      user: { id: user.id_user, email: user.email }
    });
  } catch (err) {
    console.error(`ERROR: Erreur connexion: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Connexion Google: Authenticate via Google OAuth token
 * @route POST /api/google-login
 * @body {googleToken}
 * @returns {Object} { message, user: { id, email, name } }
 */
app.post('/api/google-login', async (req, res) => {
  const { googleToken } = req.body;
  console.log('GOOGLE_LOGIN: Tentative de connexion Google');

  try {
    // Vérifier et décoder le token Google
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const username = payload.name;

    console.log(`SUCCESS: Token Google valide pour ${email}`);

    // Vérifier si l'utilisateur existe
    const [existingUsers] = await db.query('SELECT id_user FROM Users WHERE email = ?', [email]);

    let userId;
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id_user;
      console.log(`INFO: Utilisateur Google existant trouvé (id: ${userId})`);
    } else {
      // Créer un nouvel utilisateur avec mot de passe aléatoire
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const result = await db.query(
        'INSERT INTO Users (email, password) VALUES (?, ?)',
        [email, hashedPassword]
      );
      userId = result[0].insertId;
      console.log(`SUCCESS: Nouvel utilisateur Google créé (${email})`);
    }

    res.json({
      message: 'Connexion Google réussie',
      user: { id: userId, email: email, name: username }
    });
  } catch (err) {
    console.error(`ERROR: Erreur connexion Google: ${err.message}`);
    res.status(500).json({ error: 'Erreur connexion Google: ' + err.message });
  }
});

// ====================================================
// ROUTES VILLES (importées depuis routes/villes.js)
// ====================================================

app.use('/api', villesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur : http://localhost:${PORT}`);
});