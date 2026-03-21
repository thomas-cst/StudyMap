/**
 * Service de donnees des favoris
 * Gere les operations CRUD sur la table 'favoris' dans Supabase
 * 
 * Structure BDD :
 * - Table 'favoris' : id, user_id (ref users.id), ville_id (ref villes.id)
 * - Table 'users' : id, email, password, created_at
 * - Table 'villes' : id, nom_ville, code_insee, latitude, longitude, url_image, created_at
 * 
 * L'identification se fait par email (partage entre Supabase Auth et la table users)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialiser le client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Recupere l'id de l'utilisateur dans la table users a partir de son email
 * @param {string} email - Email de l'utilisateur
 * @returns {number} L'id de l'utilisateur
 */
async function getUserIdByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (error) throw new Error(`Utilisateur non trouve pour ${email}: ${error.message}`);
  return data.id;
}

/**
 * Recupere l'id de la ville dans la table villes a partir de son nom
 * @param {string} nomVille - Nom de la ville
 * @returns {number} L'id de la ville
 */
async function getVilleIdByNom(nomVille) {
  const { data, error } = await supabase
    .from('villes')
    .select('id')
    .eq('nom_ville', nomVille)
    .single();

  if (error) throw new Error(`Ville non trouvee: ${nomVille}: ${error.message}`);
  return data.id;
}

/**
 * Recupere tous les favoris d'un utilisateur avec les donnees des villes
 * @param {string} email - Email de l'utilisateur
 * @returns {Array} Liste des villes en favoris
 */
async function getFavoris(email) {
  const userId = await getUserIdByEmail(email);

  // Recuperer les ville_id depuis la table favoris
  const { data: favData, error: favError } = await supabase
    .from('favoris')
    .select('ville_id')
    .eq('user_id', userId);

  if (favError) throw favError;
  if (!favData || favData.length === 0) return [];

  // Recuperer les details des villes correspondantes
  const villeIds = favData.map(f => f.ville_id);
  const { data: villesData, error: villesError } = await supabase
    .from('villes')
    .select('*')
    .in('id', villeIds);

  if (villesError) throw villesError;
  return villesData || [];
}

/**
 * Ajoute une ville aux favoris d'un utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} nomVille - Nom de la ville a ajouter
 * @returns {Object} Le favori cree
 */
async function addFavoris(email, nomVille) {
  const userId = await getUserIdByEmail(email);
  const villeId = await getVilleIdByNom(nomVille);

  const { data, error } = await supabase
    .from('favoris')
    .insert([{ user_id: userId, ville_id: villeId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprime un favori par email utilisateur et nom de ville
 * @param {string} email - Email de l'utilisateur
 * @param {string} nomVille - Nom de la ville a retirer
 */
async function removeFavoris(email, nomVille) {
  const userId = await getUserIdByEmail(email);
  const villeId = await getVilleIdByNom(nomVille);

  const { error } = await supabase
    .from('favoris')
    .delete()
    .eq('user_id', userId)
    .eq('ville_id', villeId);

  if (error) throw error;
}

module.exports = { getFavoris, addFavoris, removeFavoris };
