🎓 StudyMap
Le comparateur de villes intelligent pour étudiants. > Projet Universitaire - Licence 3 (IHM & Architectures logicielles)

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

🚀 Installation et Démarrage
1. Clonage du projet

Bash
git clone https://github.com/votre-compte/studymap.git
cd studymap
2. Configuration des environnements (Crucial) 🛡️

Le projet utilise des fichiers modèles pour éviter la fuite de clés API.

Côté Backend :

Bash
# Copier le modèle et remplir avec vos clés
cp .env.example .env
Éditez le .env et renseignez SUPABASE_URL, SUPABASE_KEY et ORS_API_KEY.

Côté Frontend (Angular) :

Bash
# Créer le dossier environments si absent et copier le modèle
mkdir -p src/environments
cp src/environments/environment.template.ts src/environments/environment.ts
Remplissez les valeurs dans src/environments/environment.ts.

3. Installation des dépendances

Bash
# Installation globale des outils
npm install -g @angular/cli

# Installation des dépendances projet
npm install
4. Lancement de l'application

Vous devez lancer deux terminaux séparés :

Terminal 1 : Backend (Express)

Bash
# Depuis la racine
node server.js
Serveur actif sur : http://localhost:3000

Terminal 2 : Frontend (Angular)

Bash
# Depuis la racine
ng serve
Application accessible sur : http://localhost:4200

📂 Structure du Projet
Plaintext
studymap/
├── src/                # Code source Angular (Frontend) \n
│   ├── app/            # Composants et Services \n
│   └── environments/   # Configuration (URL API, Clés Publiques) \n
├── routes/             # Points d'entrée API Backend (Express) \n
├── services/           # Logique métier et appels Supabase (Backend) \n
├── server.js           # Point d'entrée du serveur Node \n
├── .env.example        # Modèle de variables d'environnement \n
└── .gitignore          # Protection contre le versioning des clés \n

⚠️ Notes de Sécurité
Zéro Clé sur Git : Ne poussez jamais vos fichiers .env ou environment.ts. Utilisez uniquement les fichiers .template ou .example.

Architecture : Le frontend communique exclusivement avec le backend Express. Le backend se charge de la liaison sécurisée avec Supabase.

👥 Auteurs (L3 Informatique)
Noah Cabaret — noahcabaret0902@gmail.com

Thomas Castella — castella.thomas30@gmail.com

Alexandra Pean — alexandra070305@gmail.com

Besoin d'aide ? Consultez la documentation officielle de Supabase ou d'Angular.
