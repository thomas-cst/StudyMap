-- ==========================================================
-- SCRIPT D'INITIALISATION DU SCHÉMA STUDYMAP
-- ==========================================================

-- 1. Table des utilisateurs (Liée à l'Auth Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT, -- NULL pour les connexions Google OAuth
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des villes
CREATE TABLE villes (
  id SERIAL PRIMARY KEY,
  nom_ville TEXT NOT NULL,
  code_insee TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  url_image TEXT,
  nb_hab INTEGER,
  nb_etu INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table des universités
CREATE TABLE universites (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  ville_id INTEGER REFERENCES villes(id) ON DELETE CASCADE,
  nb_etu INTEGER,
  url_image TEXT,
  lien TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table des gares
CREATE TABLE gares (
  id SERIAL PRIMARY KEY,
  ville_id INTEGER REFERENCES villes(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  sncf_id TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
);

-- 5. Table des restaurants universitaires (CROUS)
CREATE TABLE restau_universitaires (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  adresse TEXT,
  universite_id INTEGER REFERENCES universites(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table de cache pour les trajets de train
CREATE TABLE train_cache (
  id SERIAL PRIMARY KEY,
  gare_dep_id INTEGER REFERENCES gares(id),
  gare_arr_id INTEGER REFERENCES gares(id),
  gare_dep_nom TEXT,
  gare_arr_nom TEXT,
  duree_minutes INTEGER,
  correspondances INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table des favoris
CREATE TABLE favoris (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ville_id INTEGER REFERENCES villes(id) ON DELETE CASCADE,
  universite_id INTEGER REFERENCES universites(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);