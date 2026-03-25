# 🎓 StudyMap
> **Le comparateur de villes intelligent pour étudiants.** > *Projet Universitaire - Licence 3 (IHM & Architectures logicielles)*

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

StudyMap permet aux étudiants d'évaluer et de comparer les villes françaises selon des critères réels : loyers moyens, météo, vie nocturne, universités, transports et proximité géographique.

---

## ✨ Fonctionnalités

* **📊 Comparaison Multi-critères** : Analyse comparative des loyers, ensoleillement et offre culturelle.
* **🏫 Annuaire Académique** : Recherche d'universités et de restaurants universitaires (CROUS).
* **📍 Itinéraires** : Calcul automatique du temps de trajet via OpenRouteService.
* **⭐ Favoris** : Sauvegarde des villes préférées sur un compte personnel.
* **🔐 Auth Sécurisée** : Connexion via Google OAuth propulsée par Supabase.
* **📱 Responsive Design** : Interface moderne adaptée aux mobiles et tablettes.

---

## 🛠️ Stack Technique

* **Frontend** : Angular 17+
* **Backend** : Node.js & Express
* **Base de données** : PostgreSQL (via Supabase)
* **APIs Externes** : OpenRouteService (Cartographie), Data.gouv (Données ESR/CROUS)

---

## 🚀 Installation et Démarrage

### 1. Clonage du projet
```bash
git clone git@github.com:thomas-cst/StudyMap.git
cd StudyMap
```

2. Installation des outils et dépendances

# Installation globale d'Angular CLI (si non présent)
```bash
npm install -g @angular/cli
```

# Installation des dépendances du projet
```bash
npm install
```

3. Obtention des clés API 🔑

A. Supabase (Base de données & Auth)

Créez un compte sur Supabase.com.

Créez un nouveau projet (ex: "StudyMap").

Allez dans Project Settings (icône roue crantée en bas à gauche) > API.

Copiez l'Project URL et la clé anon (public).

B. OpenRouteService (Calcul d'itinéraires)

Créez un compte gratuit sur OpenRouteService API.

Validez votre email et connectez-vous au Dashboard.

Dans l'onglet Tokens, cliquez sur Create Token.

Donnez un nom (ex: "StudyMap-Dev") et copiez la clé générée.

4. Configuration des environnements 🛡️

Côté Backend (Racine) :

```bash
cp .env.example .env
# Éditez le fichier .env et collez vos clés :
# SUPABASE_URL, SUPABASE_KEY et ORS_API_KEY.
```
Côté Frontend (Angular) :
```bash
mkdir -p src/environments
cp src/environments/environment.template.ts src/environments/environment.ts
cp src/environments/environment.template.ts src/environments/environment.development.ts
# Remplissez les valeurs supabaseUrl et supabaseKey dans les fichiers .ts générés.
```

5. Configuration de la Base de Données (Supabase)

Rendez-vous sur votre Dashboard Supabase > SQL Editor.

Cliquez sur "New Query".

Ouvrez le fichier database/schema.sql situé dans ce projet.

Copiez le code, collez-le dans l'éditeur Supabase et cliquez sur Run.

6. Lancement de l'application

Vous devez lancer deux terminaux séparés :

Terminal 1 : Backend (Express)

```bash
# Depuis la racine
npm run dev
```

Serveur actif sur : http://localhost:3000

Terminal 2 : Frontend (Angular)

```bash
# Depuis la racine
npm start
```

🔄 Peupler les données (Seeding)
Une fois les serveurs lancés, vous pouvez remplir votre base de données automatiquement via votre terminal :

```bash
# 1. Synchroniser les villes (Données de base)
curl -X POST http://localhost:3000/api/villes/sync

# 2. Synchroniser les universités
curl -X POST http://localhost:3000/api/universites/sync

# 3. Synchroniser les restaurants universitaires (CROUS)
curl -X POST http://localhost:3000/api/restau-univ/sync
```

📂 Structure du Projet

```plaintext
studymap/
├── database/           # Scripts SQL d'initialisation (schema.sql)
├── src/                # Code source Angular (Frontend)
│   ├── app/            # Composants et Services
│   └── environments/   # Configuration (URL API, Clés Publiques)
├── routes/             # Points d'entrée API Backend (Express)
├── services/           # Logique métier et appels Supabase (Backend)
├── server.js           # Point d'entrée du serveur Node
├── .env.example        # Modèle de variables d'environnement
└── .gitignore          # Protection contre le versioning des clés
```

🛠️ Dépannage (FAQ)
Erreur Unregistered API key : Vérifiez que vos clés dans .env ou environment.ts correspondent bien à votre projet Supabase actuel. Redémarrez les terminaux après modification.

Problème de CORS : Assurez-vous que la variable FRONTEND_URL dans votre .env backend est bien positionnée sur http://localhost:4200.

Port 3000 déjà utilisé : Vous pouvez modifier le port dans le fichier .env du backend.

👥 Auteurs (L3 Informatique)
Noah Cabaret — noahcabaret0902@gmail.com

Thomas Castella — castella.thomas30@gmail.com

Alexandra Pean — alexandra070305@gmail.com

Besoin d'aide ? Contactez l'un des auteurs par email.
