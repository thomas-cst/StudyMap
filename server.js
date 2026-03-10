const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Autorise Angular (souvent sur le port 4200) à appeler ce serveur
app.use(cors());
app.use(express.json()); // Permet de lire les données JSON envoyées par le front

// Une route de test pour vérifier que ça marche
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    console.log('Test BD réussi:', rows[0].solution);
    res.json({ message: "Le serveur et la BDD répondent !", result: rows[0].solution });
  } catch (err) {
    console.error('Erreur test BD:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route pour décrire la table Users
app.get('/api/describe-users', async (req, res) => {
  try {
    const [rows] = await db.query('DESCRIBE Users');
    res.json({ columns: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour l'inscription
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body; // Angular envoie 'password'
  console.log('Tentative d\'inscription:', { email, password: '***' });
  
  try {
    // 1. On utilise le nom de table exact 'Users' et la colonne 'id_user'
    const [existingUser] = await db.query('SELECT id_user FROM Users WHERE email = ?', [email]);
    console.log('Utilisateur existant:', existingUser.length > 0);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Utilisateur déjà existant' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Mot de passe hashé');

    // 2. Insertion dans 'Users'
    const result = await db.query('INSERT INTO Users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    console.log('Insertion réussie:', result);

    // Retourner l'utilisateur créé
    res.json({ 
      message: 'Inscription réussie',
      user: {
        id_user: result[0].insertId,
        email: email
      }
    });
  } catch (err) {
    console.error('Erreur lors de l\'inscription:', err);
    res.status(500).json({ error: "Erreur lors de l'inscription : " + err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // On récupère id_user
    const [users] = await db.query('SELECT id_user, email, password FROM Users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    res.json({ 
      message: 'Connexion réussie',
      user: { id: user.id_user, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour la connexion Google
app.post('/api/google-login', async (req, res) => {
  const { googleToken } = req.body;
  console.log('Tentative de connexion Google');

  try {
    // Vérifier le token Google
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const username = payload.name;

    console.log('Token Google valide pour:', email);

    // Vérifier si l'utilisateur existe
    const [existingUsers] = await db.query('SELECT id_user, email FROM Users WHERE email = ?', [email]);

    let userId;
    if (existingUsers.length > 0) {
      // L'utilisateur existe déjà
      userId = existingUsers[0].id_user;
      console.log('Utilisateur existant trouvé');
    } else {
      // Créer un nouvel utilisateur (mot de passe aléatoire pour les utilisateurs Google)
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const result = await db.query('INSERT INTO Users (email, password) VALUES (?, ?)', [email, hashedPassword]);
      userId = result[0].insertId;
      console.log('Nouvel utilisateur créé');
    }

    res.json({
      message: 'Connexion Google réussie',
      user: { id: userId, email: email, name: username }
    });
  } catch (err) {
    console.error('Erreur lors de la vérification du token Google:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion Google: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur : http://localhost:${PORT}`);
});