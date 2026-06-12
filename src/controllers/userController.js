// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

// Fonction qui récupère TOUS les utilisateurs
const getAllUsers = async (req, res) => {
  try {
    // Recherche de tous les utilisateurs, avec les infos de leur entreprise
    const users = await prisma.user.findMany({
      include: { entreprise: true },
    });
    // Réponse de succès (200) avec la liste des utilisateurs
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    // En cas d'erreur, réponse d'erreur serveur (500)
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fonction qui CRÉE un nouvel utilisateur
const createUser = async (req, res) => {
  try {
    // Extraction des données envoyées dans le corps de la requête
    const { nom, prenom, email, password, role, entrepriseId } = req.body;

    // Création de l'utilisateur dans la base
    const newUser = await prisma.user.create({
      data: { nom, prenom, email, password, role, entrepriseId },
    });

    // Réponse de succès (201 = ressource créée)
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    // En cas d'erreur, réponse d'erreur serveur (500)
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export des fonctions pour les utiliser dans les routes
module.exports = { getAllUsers, createUser };