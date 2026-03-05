const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();

// Autorise Angular (souvent sur le port 4200) à appeler ce serveur
app.use(cors());
app.use(express.json()); // Permet de lire les données JSON envoyées par le front

// Une route de test pour vérifier que ça marche
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ message: "Le serveur et la BDD répondent !", result: rows[0].solution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur : http://localhost:${PORT}`);
});