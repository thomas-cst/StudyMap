-- ==========================================================
-- DONNÉES INITIALES : Scores transport par ville
-- ==========================================================

-- 1. Les Mégapoles & Grandes Métropoles
UPDATE villes SET score_transport = 95, nb_lignes_transport = 350, nb_arrets_transport = 12000, km_lignes_transport = 1800 WHERE nom_ville = 'Paris';
UPDATE villes SET score_transport = 88, nb_lignes_transport = 130, nb_arrets_transport = 3500, km_lignes_transport = 600 WHERE nom_ville = 'Lyon';
UPDATE villes SET score_transport = 85, nb_lignes_transport = 125, nb_arrets_transport = 3200, km_lignes_transport = 550 WHERE nom_ville = 'Villeurbanne';
UPDATE villes SET score_transport = 82, nb_lignes_transport = 110, nb_arrets_transport = 3000, km_lignes_transport = 500 WHERE nom_ville = 'Marseille';
UPDATE villes SET score_transport = 84, nb_lignes_transport = 85, nb_arrets_transport = 2800, km_lignes_transport = 450 WHERE nom_ville = 'Toulouse';
UPDATE villes SET score_transport = 86, nb_lignes_transport = 80, nb_arrets_transport = 3100, km_lignes_transport = 480 WHERE nom_ville = 'Bordeaux';
UPDATE villes SET score_transport = 85, nb_lignes_transport = 75, nb_arrets_transport = 2500, km_lignes_transport = 400 WHERE nom_ville = 'Lille';
UPDATE villes SET score_transport = 87, nb_lignes_transport = 65, nb_arrets_transport = 2200, km_lignes_transport = 380 WHERE nom_ville = 'Strasbourg';
UPDATE villes SET score_transport = 85, nb_lignes_transport = 70, nb_arrets_transport = 2400, km_lignes_transport = 420 WHERE nom_ville = 'Nantes';

-- 2. Villes d'Île-de-France
UPDATE villes SET score_transport = 80, nb_lignes_transport = 45, nb_arrets_transport = 400, km_lignes_transport = 150 WHERE nom_ville IN ('Nanterre', 'Créteil', 'Versailles', 'Cergy', 'Évry-Courcouronnes');
UPDATE villes SET score_transport = 75, nb_lignes_transport = 25, nb_arrets_transport = 150, km_lignes_transport = 80  WHERE nom_ville IN ('Champs-sur-Marne', 'Gif-sur-Yvette', 'Villetaneuse');

-- 3. Grandes Villes
UPDATE villes SET score_transport = 81, nb_lignes_transport = 65, nb_arrets_transport = 1800, km_lignes_transport = 300 WHERE nom_ville = 'Rennes';
UPDATE villes SET score_transport = 79, nb_lignes_transport = 40, nb_arrets_transport = 1500, km_lignes_transport = 250 WHERE nom_ville = 'Montpellier';
UPDATE villes SET score_transport = 74, nb_lignes_transport = 35, nb_arrets_transport = 1200, km_lignes_transport = 200 WHERE nom_ville = 'Dijon';
UPDATE villes SET score_transport = 76, nb_lignes_transport = 30, nb_arrets_transport = 1100, km_lignes_transport = 180 WHERE nom_ville = 'Angers';
UPDATE villes SET score_transport = 75, nb_lignes_transport = 25, nb_arrets_transport = 1000, km_lignes_transport = 170 WHERE nom_ville = 'Tours';
UPDATE villes SET score_transport = 77, nb_lignes_transport = 28, nb_arrets_transport = 1050, km_lignes_transport = 190 WHERE nom_ville = 'Clermont-Ferrand';
UPDATE villes SET score_transport = 78, nb_lignes_transport = 35, nb_arrets_transport = 1300, km_lignes_transport = 220 WHERE nom_ville = 'Nice';
UPDATE villes SET score_transport = 73, nb_lignes_transport = 32, nb_arrets_transport = 1150, km_lignes_transport = 160 WHERE nom_ville = 'Saint-Étienne';

-- 4. Villes Moyennes
UPDATE villes SET score_transport = 68, nb_lignes_transport = 25, nb_arrets_transport = 800, km_lignes_transport = 120 WHERE nom_ville = 'Amiens';
UPDATE villes SET score_transport = 70, nb_lignes_transport = 22, nb_arrets_transport = 750, km_lignes_transport = 110 WHERE nom_ville = 'Brest';
UPDATE villes SET score_transport = 69, nb_lignes_transport = 24, nb_arrets_transport = 850, km_lignes_transport = 130 WHERE nom_ville = 'Caen';
UPDATE villes SET score_transport = 71, nb_lignes_transport = 26, nb_arrets_transport = 900, km_lignes_transport = 140 WHERE nom_ville = 'Le Havre';
UPDATE villes SET score_transport = 67, nb_lignes_transport = 20, nb_arrets_transport = 700, km_lignes_transport = 100 WHERE nom_ville = 'Mulhouse';
UPDATE villes SET score_transport = 65, nb_lignes_transport = 21, nb_arrets_transport = 650, km_lignes_transport = 95  WHERE nom_ville = 'Avignon';
UPDATE villes SET score_transport = 66, nb_lignes_transport = 18, nb_arrets_transport = 600, km_lignes_transport = 90  WHERE nom_ville = 'Limoges';
UPDATE villes SET score_transport = 68, nb_lignes_transport = 19, nb_arrets_transport = 620, km_lignes_transport = 85  WHERE nom_ville = 'Poitiers';
UPDATE villes SET score_transport = 65, nb_lignes_transport = 17, nb_arrets_transport = 580, km_lignes_transport = 80  WHERE nom_ville = 'Nîmes';
UPDATE villes SET score_transport = 64, nb_lignes_transport = 15, nb_arrets_transport = 550, km_lignes_transport = 75  WHERE nom_ville = 'Perpignan';
UPDATE villes SET score_transport = 67, nb_lignes_transport = 16, nb_arrets_transport = 500, km_lignes_transport = 70  WHERE nom_ville = 'Besançon';
UPDATE villes SET score_transport = 63, nb_lignes_transport = 14, nb_arrets_transport = 450, km_lignes_transport = 65  WHERE nom_ville = 'La Rochelle';
UPDATE villes SET score_transport = 61, nb_lignes_transport = 13, nb_arrets_transport = 400, km_lignes_transport = 60  WHERE nom_ville = 'Pau';
UPDATE villes SET score_transport = 62, nb_lignes_transport = 12, nb_arrets_transport = 380, km_lignes_transport = 55  WHERE nom_ville = 'Chambéry';
UPDATE villes SET score_transport = 64, nb_lignes_transport = 14, nb_arrets_transport = 420, km_lignes_transport = 60  WHERE nom_ville = 'Lorient';

-- 5. Communes spécifiques
UPDATE villes SET score_transport = 80, nb_lignes_transport = 20, nb_arrets_transport = 200, km_lignes_transport = 50  WHERE nom_ville IN ('Pessac', 'Talence');
UPDATE villes SET score_transport = 55, nb_lignes_transport = 10, nb_arrets_transport = 250, km_lignes_transport = 45  WHERE nom_ville = 'Arras';
UPDATE villes SET score_transport = 52, nb_lignes_transport = 8,  nb_arrets_transport = 200, km_lignes_transport = 40  WHERE nom_ville = 'Aulnoy-lez-Valenciennes';
UPDATE villes SET score_transport = 60, nb_lignes_transport = 12, nb_arrets_transport = 300, km_lignes_transport = 50  WHERE nom_ville = 'La Garde';
UPDATE villes SET score_transport = 58, nb_lignes_transport = 9,  nb_arrets_transport = 220, km_lignes_transport = 35  WHERE nom_ville = 'Mont-Saint-Aignan';
UPDATE villes SET score_transport = 35, nb_lignes_transport = 2,  nb_arrets_transport = 40,  km_lignes_transport = 120 WHERE nom_ville = 'Corte';

-- 6. Complément
UPDATE villes SET score_transport = 76, nb_lignes_transport = 38, nb_arrets_transport = 1250, km_lignes_transport = 210 WHERE nom_ville = 'Orléans';
UPDATE villes SET score_transport = 74, nb_lignes_transport = 32, nb_arrets_transport = 1100, km_lignes_transport = 195 WHERE nom_ville = 'Le Mans';
UPDATE villes SET score_transport = 72, nb_lignes_transport = 28, nb_arrets_transport = 950,  km_lignes_transport = 160 WHERE nom_ville = 'Dunkerque';
UPDATE villes SET score_transport = 77, nb_lignes_transport = 35, nb_arrets_transport = 1350, km_lignes_transport = 230 WHERE nom_ville = 'Reims';
