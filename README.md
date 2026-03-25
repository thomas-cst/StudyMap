StudyMap
Comparateur de villes pour étudiants

Description
StudyMap est une application web destinée aux étudiants qui souhaitent comparer différentes villes pour leurs études. Elle permet d’évaluer et de comparer les villes françaises selon de nombreux critères : loyer, météo, événements sportifs et culturels, universités, bars, boîtes de nuit, proximité de la mer ou de la montagne, ensoleillement, transports, emploi, etc. L’objectif est d’aider les étudiants à choisir la ville la plus adaptée à leurs besoins et envies.

Fonctionnalités principales
Comparaison multi-critères de villes (loyer, météo, vie nocturne, universités, etc.)
Recherche et affichage des universités, restaurants universitaires, événements
Calcul d’itinéraires et estimation du temps de trajet
Gestion des favoris
Authentification via Google (Supabase)
Interface moderne et responsive
Contexte du projet
Projet universitaire de Licence 3 (IHM & Architectures logicielles)

Objectifs théoriques : fondamentaux du développement web, API, architectures, outils de conception
Objectifs pratiques : conception complète d’une application web, intégration d’API externes, UI/UX, travail en groupe
Auteurs
Noah Cabaret — noahcabaret0902@gmail.com
Thomas Castella — castella.thomas30@gmail.com
Alexandra Pean — alexandra070305@gmail.com
Prérequis
Node.js (v18 ou supérieur recommandé)
npm (v9 ou supérieur recommandé)
Installation
Cloner le dépôt
Installer les dépendances (frontend & backend)
Créer le fichier .env à la racine du projet
Copie le fichier .env.example (ou crée un .env vierge) et renseigne les clés nécessaires :
Obtenir les clés API
1. Supabase
Crée un compte sur https://supabase.com/
Crée un nouveau projet (choisir une base PostgreSQL)
Récupère l’URL du projet et la clé API (Project API keys > anon ou service_role selon les besoins)
Renseigne ces valeurs dans le .env :
SUPABASE_URL=...
SUPABASE_KEY=...
2. OpenRouteService
Crée un compte sur https://openrouteservice.org/dev/#/signup
Gère tes clés dans le dashboard > API Keys
Copie la clé et ajoute-la dans le .env :
ORS_API_KEY=...
Ne jamais versionner vos clés API !

Lancement de l’application
1. Démarrer le backend (Express)
Le serveur écoute par défaut sur http://localhost:3000

2. Démarrer le frontend (Angular)
Le frontend est accessible sur http://localhost:4200

Structure du projet
src : code source Angular (frontend)
server.js : serveur backend Express
routes : routes API backend
services : services backend (accès BDD, etc.)
.env : variables d’environnement (à créer)
Notes importantes
Le frontend ne communique jamais directement avec Supabase : toutes les requêtes passent par le backend Express.
L’authentification Google et la gestion des utilisateurs sont gérées via Supabase côté backend.
Aucune clé API ne doit être poussée sur le dépôt !
Développement Angular (CLI)
Cette application utilise Angular CLI version 21.0.5.

Développement frontend
Pour lancer le serveur de développement Angular :

Puis ouvrir http://localhost:4200/

Générer un composant Angular
Pour la liste complète des schémas disponibles :

Build (compilation)
Les fichiers de build sont générés dans dist/.

Tests unitaires
Pour exécuter les tests unitaires avec Vitest :

Tests end-to-end
Pour les tests e2e :

Pour aller plus loin
Modifier les critères de comparaison dans le code source selon vos besoins
Ajouter d’autres APIs ou sources de données
Adapter le design (UI/UX)
Contact
Pour toute question, contactez un des auteurs par email.