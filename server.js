const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// CORS configuration - Autorise uniquement le frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json()); // Permet de lire les données JSON envoyées par le front

// Une route de test pour vérifier que ça marche
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ message: "Le serveur et la BDD répondent !", result: rows[0].solution });
  } catch (err) {
    console.error('Erreur test BD:', err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour l'inscription
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body; // Angular envoie 'password'
  
  try {
    // 1. On utilise le nom de table exact 'Users' et la colonne 'id_user'
    const [existingUser] = await db.query('SELECT id_user FROM Users WHERE email = ?', [email]);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Utilisateur déjà existant' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Insertion dans 'Users'
    const result = await db.query('INSERT INTO Users (email, password) VALUES (?, ?)', [email, hashedPassword]);

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
    res.status(500).json({ error: "Erreur lors de l'inscription" });
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
    console.error('Erreur lors de la connexion:', err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour la connexion Google
app.post('/api/google-login', async (req, res) => {
  const { googleToken } = req.body;
  console.log('Tentative de connexion Google');

  try {
    // Vérifier le token Google
    const ticket = await googleClient.verifyIdToken({
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const username = payload.name;

    // Vérifier si l'utilisateur existe
    const [existingUsers] = await db.query('SELECT id_user, email FROM Users WHERE email = ?', [email]);

    let userId;
    if (existingUsers.length > 0) {
      // L'utilisateur existe déjà
      userId = existingUsers[0].id_user;
    } else {
      // Créer un nouvel utilisateur (mot de passe aléatoire pour les utilisateurs Google)
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const result = await db.query('INSERT INTO Users (email, password) VALUES (?, ?)', [email, hashedPassword]);
      userId = result[0].insertId;
    }

    res.json({
      message: 'Connexion Google réussie',
      user: { id: userId, email: email, name: username }
    });
  } catch (err) {
    console.error('Erreur lors de la vérification du token Google:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion Google' });
  }
});

// ============ ROUTES POUR LES FAVORIS ============

// 1. Ajouter un favori (crée la ville si elle n'existe pas)
app.post('/api/favorites/add', async (req, res) => {
  const { id_user, nom, imageUrl, latitude, longitude } = req.body;

  if (!id_user || !nom) {
    return res.status(400).json({ error: 'id_user et nom sont requis' });
  }

  try {
    // 1. Insérer la ville ou la récupérer si elle existe déjà
    const [existingVille] = await db.query('SELECT id_ville FROM Villes WHERE nom = ?', [nom]);
    let id_ville;

    if (existingVille.length > 0) {
      id_ville = existingVille[0].id_ville;
    } else {
      const [result] = await db.query(
        'INSERT INTO Villes (nom, imageUrl, latitude, longitude) VALUES (?, ?, ?, ?)',
        [nom, imageUrl || null, latitude || null, longitude || null]
      );
      id_ville = result.insertId;
    }

    // 2. Insérer le favori
    await db.query(
      'INSERT INTO User_favorites (id_user, id_ville) VALUES (?, ?) ON DUPLICATE KEY UPDATE id_ville = id_ville',
      [id_user, id_ville]
    );

    res.json({ message: 'Favori ajouté avec succès', id_ville });
  } catch (err) {
    console.error('Erreur lors de l\'ajout du favori:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 2. Récupérer tous les favoris d'un utilisateur
app.get('/api/favorites/:id_user', async (req, res) => {
  const { id_user } = req.params;

  try {
    const [favoris] = await db.query(
      `SELECT v.id_ville, v.nom, v.imageUrl, v.latitude as lat, v.longitude as lng, uf.added_at
       FROM User_favorites uf
       JOIN Villes v ON uf.id_ville = v.id_ville
       WHERE uf.id_user = ?
       ORDER BY uf.added_at DESC`,
      [id_user]
    );

    res.json({ favoris });
  } catch (err) {
    console.error('Erreur lors de la récupération des favoris:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 3. Supprimer un favori
app.delete('/api/favorites/remove/:id_user/:id_ville', async (req, res) => {
  const { id_user, id_ville } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM User_favorites WHERE id_user = ? AND id_ville = ?',
      [id_user, id_ville]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Favori non trouvé' });
    }

    res.json({ message: 'Favori supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression du favori:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur : http://localhost:${PORT}`);
});