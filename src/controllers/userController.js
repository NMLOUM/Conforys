const prisma  = require("../config/prisma");
const bcrypt  = require("bcrypt");
const { handleErreur } = require("../utils/handleErreur");

const PROFIL_SELECT = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  role: true,
  actif: true,
  entreprise: { select: { id: true, nom: true, secteur: true } },
  site: { select: { id: true, nom: true, ville: true } },
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: PROFIL_SELECT });
    if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    handleErreur(res, error);
  }
};

const updateMe = async (req, res) => {
  try {
    const { nom, prenom, email, password } = req.body;
    const data = {};

    if (nom !== undefined) {
      if (!nom.trim()) return res.status(400).json({ success: false, message: "Le nom est obligatoire." });
      data.nom = nom.trim();
    }
    if (prenom !== undefined) {
      if (!prenom.trim()) return res.status(400).json({ success: false, message: "Le prénom est obligatoire." });
      data.prenom = prenom.trim();
    }
    if (email !== undefined) {
      const emailNormalise = email.trim().toLowerCase();
      if (!emailNormalise || !emailNormalise.includes("@")) {
        return res.status(400).json({ success: false, message: "L'adresse email est invalide." });
      }
      const emailPris = await prisma.user.findFirst({ where: { email: emailNormalise, NOT: { id: req.user.userId } } });
      if (emailPris) return res.status(409).json({ success: false, message: "Cette adresse email est déjà utilisée." });
      data.email = emailNormalise;
    }
    if (password !== undefined && password !== "") {
      if (password.length < 8) return res.status(400).json({ success: false, message: "Le mot de passe doit contenir au moins 8 caractères." });
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({ where: { id: req.user.userId }, data, select: PROFIL_SELECT });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Fonction qui récupère TOUS les utilisateurs — scopés à l'entreprise du demandeur
const getAllUsers = async (req, res) => {
  try {
    // Recherche des utilisateurs de la même entreprise, avec les infos de leur entreprise
    // Le mot de passe est exclu de la réponse même haché
    const users = await prisma.user.findMany({
      where: { entrepriseId: req.user.entrepriseId },
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
    // Extraction des données envoyées dans le corps de la requête —
    // entrepriseId n'est JAMAIS pris du corps de la requête : il serait
    // possible de créer un utilisateur dans une autre entreprise en le
    // fournissant soi-même. Toujours celle de l'ADMIN qui crée le compte.
    const { nom, prenom, email, password, role } = req.body;

    // Hachage du mot de passe (10 = niveau de sécurité du chiffrement)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur avec le mot de passe haché
    const newUser = await prisma.user.create({
      data: { nom, prenom, email, password: hashedPassword, role, entrepriseId: req.user.entrepriseId },
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

    // Vérifie que l'utilisateur visé appartient bien à l'entreprise du
    // demandeur — sans ce contrôle, connaître l'id d'un utilisateur d'une
    // autre entreprise suffirait à le modifier (rôle, mot de passe...).
    const existant = await prisma.user.findFirst({ where: { id, entrepriseId: req.user.entrepriseId } });
    if (!existant) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

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

    // Vérifie que l'utilisateur visé appartient bien à l'entreprise du demandeur
    const existant = await prisma.user.findFirst({ where: { id, entrepriseId: req.user.entrepriseId } });
    if (!existant) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

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
module.exports = { getMe, updateMe, getAllUsers, createUser, updateUser, deleteUser };
