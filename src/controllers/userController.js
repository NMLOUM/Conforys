const prisma  = require("../config/prisma");
const bcrypt  = require("bcrypt");
const { handleErreur } = require("../utils/handleErreur");

// Fonction qui récupère TOUS les utilisateurs
const getAllUsers = async (req, res) => {
  try {
    // Recherche de tous les utilisateurs, avec les infos de leur entreprise
    // Le mot de passe est exclu de la réponse même haché
    const users = await prisma.user.findMany({
      omit: { password: true },
      include: { entreprise: true },
    });
    // Réponse de succès (200) avec la liste des utilisateurs
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    // En cas d'erreur, réponse d'erreur serveur (500)
    handleErreur(res, error);
  }
};

// Fonction qui CRÉE un nouvel utilisateur
const createUser = async (req, res) => {
  try {
    // Extraction des données envoyées dans le corps de la requête
    const { nom, prenom, email, password, role, entrepriseId } = req.body;

    // Hachage du mot de passe (10 = niveau de sécurité du chiffrement)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur avec le mot de passe haché
    const newUser = await prisma.user.create({
      data: { nom, prenom, email, password: hashedPassword, role, entrepriseId },
    });

    // On retire le mot de passe de l'objet renvoyé au client
    const { password: _, ...userSansPassword } = newUser;

    // Réponse de succès (201 = ressource créée)
    res.status(201).json({ success: true, data: userSansPassword });
  } catch (error) {
    // En cas d'erreur, réponse d'erreur serveur (500)
    handleErreur(res, error);
  }
};

// Fonction qui MET À JOUR un utilisateur existant
const updateUser = async (req, res) => {
  try {
    // Récupération de l'identifiant depuis l'URL (/api/users/:id)
    const { id } = req.params;
    // Extraction des champs modifiables envoyés dans le corps
    const { nom, prenom, email, password, role, actif } = req.body;

    // Construction de l'objet de mise à jour (uniquement les champs fournis)
    const dataToUpdate = {};
    if (nom !== undefined)   dataToUpdate.nom   = nom;
    if (prenom !== undefined) dataToUpdate.prenom = prenom;
    if (email !== undefined)  dataToUpdate.email  = email;
    if (role !== undefined)   dataToUpdate.role   = role;
    if (actif !== undefined)  dataToUpdate.actif  = actif;

    // Si un nouveau mot de passe est fourni, on le hache avant de le stocker
    if (password !== undefined) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    // Mise à jour de l'utilisateur en base
    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      omit: { password: true },
    });

    // Réponse de succès avec l'utilisateur mis à jour (sans mot de passe)
    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    // Erreur P2025 = enregistrement introuvable dans Prisma
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }
    handleErreur(res, error);
  }
};

// Fonction qui SUPPRIME un utilisateur
const deleteUser = async (req, res) => {
  try {
    // Récupération de l'identifiant depuis l'URL (/api/users/:id)
    const { id } = req.params;

    // Suppression de l'utilisateur en base
    await prisma.user.delete({ where: { id } });

    // Réponse de succès avec message de confirmation
    res.status(200).json({ success: true, message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    // Erreur P2025 = enregistrement introuvable dans Prisma
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }
    handleErreur(res, error);
  }
};

// Export des fonctions pour les utiliser dans les routes
module.exports = { getAllUsers, createUser, updateUser, deleteUser };