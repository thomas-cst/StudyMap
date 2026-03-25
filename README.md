🎓 StudyMap
Le comparateur de villes intelligent pour étudiants. > Projet Universitaire - Licence 3 (IHM & Architectures logicielles)

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

StudyMap permet aux étudiants d'évaluer et de comparer les villes françaises selon des critères réels : loyers moyen, météo, vie nocturne, universités, transports et proximité géographique (mer/montagne).

✨ Fonctionnalités
📊 Comparaison Multi-critères : Analyse comparative des loyers, ensoleillement, et offre culturelle.

🏫 Annuaire Académique : Recherche d'universités et de restaurants universitaires (CROUS).

📍 Itinéraires : Calcul automatique du temps de trajet via OpenRouteService.

⭐ Favoris : Sauvegarde des villes préférées sur un compte personnel.

🔐 Auth Sécurisée : Connexion via Google OAuth propulsée par Supabase.

📱 Responsive Design : Interface moderne adaptée aux mobiles et tablettes.

🛠️ Stack Technique
Frontend : Angular 17+

Backend : Node.js & Express

Base de données : PostgreSQL (via Supabase)

APIs Externes : OpenRouteService (Cartographie), Data.gouv (Données ESR/CROUS)

## 🚀 Installation et Démarrage
1. Clonage du projet

git clone git@github.com:thomas-cst/StudyMap.git
cd studymap

2. Configuration des environnements (Crucial) 🛡️

Le projet utilise des fichiers modèles pour éviter la fuite de clés API.

Côté Backend :

## Copier le modèle et remplir avec vos clés
cp .env.example .env
Éditez le .env et renseignez SUPABASE_URL, SUPABASE_KEY et ORS_API_KEY.

Côté Frontend (Angular) :

## Créer le dossier environments si absent et copier le modèle
mkdir -p src/environments
cp src/environments/environment.template.ts src/environments/environment.ts
cp src/environments/environment.template.ts src/environments/environment.development.ts

Remplissez les valeurs dans src/environments/environment.ts et src/environments/environment.development.ts.

3. Installation des dépendances


## Installation globale des outils
npm install -g @angular/cli

## Installation des dépendances projet
npm install

## Configuration de la Base de Données (Supabase)

L'application utilise **PostgreSQL** via Supabase. Pour initialiser votre base de données :

1.  Rendez-vous sur votre [Dashboard Supabase](https://supabase.com/) > **SQL Editor**.
2.  Créez une **"New Query"**.
3.  Copiez le contenu du fichier [**database/schema.sql**](./database/schema.sql) de ce projet et collez-le dans l'éditeur.
4.  Cliquez sur **Run**.

### 🔄 Peupler les données
Une fois les tables créées, vous devez peupler la base de données avec les informations réelles (villes, universités, etc.).

Prérequis : Le serveur backend doit être lancé (node server.js).

Ouvrez un nouveau terminal et exécutez ces commandes l'une après l'autre :

### 1. Synchroniser les villes (données de base)
curl -X POST http://localhost:3000/api/villes/sync

### 2. Synchroniser les universités
curl -X POST http://localhost:3000/api/universites/sync

### 3. Synchroniser les restaurants universitaires (CROUS)
curl -X POST http://localhost:3000/api/restau-univ/sync

5. Lancement de l'application

Vous devez lancer deux terminaux séparés :

Terminal 1 : Backend (Express)

Depuis la racine
npm run dev
Serveur actif sur : http://localhost:3000

Terminal 2 : Frontend (Angular)

Depuis la racine
npm start
Application accessible sur : http://localhost:4200

### 📂 Structure du Projet
```plaintext
studymap/
├── src/                # Code source Angular (Frontend)
│   ├── app/            # Composants et Services
│   └── environments/   # Configuration (URL API, Clés Publiques)
├── routes/             # Points d'entrée API Backend (Express)
├── services/           # Logique métier et appels Supabase (Backend)
├── server.js           # Point d'entrée du serveur Node
├── .env.example        # Modèle de variables d'environnement
└── .gitignore          # Protection contre le versioning des clés
```

⚠️ Notes de Sécurité
Zéro Clé sur Git : Ne poussez jamais vos fichiers .env ou environment.ts. Utilisez uniquement les fichiers .template ou .example.

Architecture : Le frontend communique exclusivement avec le backend Express. Le backend se charge de la liaison sécurisée avec Supabase.

### 🛠️ Dépannage (FAQ)
* **Erreur `Unregistered API key`** : Vérifiez que vos clés dans `.env` et `environment.ts` sont bien à jour et que vous avez redémarré les serveurs.
* **Problème de CORS** : Assurez-vous que l'URL du frontend dans le `.env` du backend correspond exactement à celle de votre navigateur (généralement `http://localhost:4200`).
* **Port 3000 déjà utilisé** : Vous pouvez changer le port dans le fichier `.env`.

  
👥 Auteurs (L3 Informatique)
Noah Cabaret — noahcabaret0902@gmail.com

Thomas Castella — castella.thomas30@gmail.com

Alexandra Pean — alexandra070305@gmail.com

Besoin d'aide ? Contactez nous.
