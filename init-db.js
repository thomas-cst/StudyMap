const mysql = require('mysql2');
require('dotenv').config();

// Connexion sans sélectionner une DB spécifique (pour créer la DB)
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  multipleStatements: true, // Permet d'exécuter plusieurs requêtes à la fois
  connectTimeout: 15000
});

connection.connect(async (err) => {
  if (err) {
    console.error('❌ Erreur de connexion à Aiven:', err);
    process.exit(1);
  }

  console.log('✅ Connecté à Aiven MySQL');

  // SQL pour créer les tables
  const sql = `
    CREATE TABLE IF NOT EXISTS Users (
      id_user INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      google_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Villes (
      id_ville INT AUTO_INCREMENT PRIMARY KEY,
      nom_ville VARCHAR(255) NOT NULL,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Favoris (
      id_favori INT AUTO_INCREMENT PRIMARY KEY,
      id_user INT NOT NULL,
      id_ville INT NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_user) REFERENCES Users(id_user) ON DELETE CASCADE,
      FOREIGN KEY (id_ville) REFERENCES Villes(id_ville) ON DELETE CASCADE,
      UNIQUE KEY unique_user_ville (id_user, id_ville)
    );

    CREATE TABLE IF NOT EXISTS Notes (
      id_note INT AUTO_INCREMENT PRIMARY KEY,
      id_user INT NOT NULL,
      id_ville INT NOT NULL,
      note INT CHECK (note >= 0 AND note <= 5),
      commentaire TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_user) REFERENCES Users(id_user) ON DELETE CASCADE,
      FOREIGN KEY (id_ville) REFERENCES Villes(id_ville) ON DELETE CASCADE
    );
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Erreur lors de la création des tables:', err);
      process.exit(1);
    }

    console.log('✅ Tables créées avec succès !');
    connection.end();
    process.exit(0);
  });
});
