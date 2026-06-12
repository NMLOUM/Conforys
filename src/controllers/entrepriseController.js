// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

// Fonction qui récupère TOUTES les entreprises
const getAllEntreprises = async (req, res) => {
  try {
    // Recherche de toutes les entreprises avec leurs utilisateurs (sans les mots de passe)
    const entreprises = await prisma.entreprise.findMany({
      include: { users: { omit: { password: true } } },
    });
    // Réponse de succès (200) avec la liste des entreprises
    res.status(200).json({ success: true, data: entreprises });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fonction qui récupère UNE entreprise par son identifiant
const getEntrepriseById = async (req, res) => {
  try {
    // Récupération de l'identifiant depuis l'URL (/api/entreprises/:id)
    const { id } = req.params;

    // Recherche de l'entreprise avec ses utilisateurs (sans les mots de passe)
    const entreprise = await prisma.entreprise.findUnique({
      where: { id },
      include: { users: { omit: { password: true } } },
    });

    // Si aucune entreprise trouvée, on renvoie une 404
    if (!entreprise) {
      return res.status(404).json({ success: false, message: "Entreprise introuvable." });
    }

    // Réponse de succès avec l'entreprise trouvée
    res.status(200).json({ success: true, data: entreprise });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fonction qui CRÉE une nouvelle entreprise
const createEntreprise = async (req, res) => {
  try {
    // Extraction des données envoyées dans le corps de la requête
    const { nom, secteur, adresse, telephone, email } = req.body;

    // Création de l'entreprise en base
    const newEntreprise = await prisma.entreprise.create({
      data: { nom, secteur, adresse, telephone, email },
    });

    // Réponse de succès (201 = ressource créée)
    res.status(201).json({ success: true, data: newEntreprise });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fonction qui MET À JOUR une entreprise existante
const updateEntreprise = async (req, res) => {
  try {
    // Récupération de l'identifiant depuis l'URL (/api/entreprises/:id)
    const { id } = req.params;
    // Extraction des champs modifiables envoyés dans le corps
    const { nom, secteur, adresse, telephone, email } = req.body;

    // Construction de l'objet de mise à jour (uniquement les champs fournis)
    const dataToUpdate = {};
    if (nom !== undefined) dataToUpdate.nom = nom;
    if (secteur !== undefined) dataToUpdate.secteur = secteur;
    if (adresse !== undefined) dataToUpdate.adresse = adresse;
    if (telephone !== undefined) dataToUpdate.telephone = telephone;
    if (email !== undefined) dataToUpdate.email = email;

    // Mise à jour de l'entreprise en base
    const updatedEntreprise = await prisma.entreprise.update({
      where: { id },
      data: dataToUpdate,
    });

    // Réponse de succès avec l'entreprise mise à jour
    res.status(200).json({ success: true, data: updatedEntreprise });
  } catch (error) {
    // Erreur P2025 = enregistrement introuvable dans Prisma
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Entreprise introuvable." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fonction qui SUPPRIME une entreprise
const deleteEntreprise = async (req, res) => {
  try {
    // Récupération de l'identifiant depuis l'URL (/api/entreprises/:id)
    const { id } = req.params;

    // Suppression de l'entreprise en base
    await prisma.entreprise.delete({ where: { id } });

    // Réponse de succès avec message de confirmation
    res.status(200).json({ success: true, message: "Entreprise supprimée avec succès." });
  } catch (error) {
    // Erreur P2025 = enregistrement introuvable dans Prisma
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Entreprise introuvable." });
    }
    // Contrainte de clé étrangère : l'entreprise a encore des utilisateurs (P2003 ou erreur FK PostgreSQL)
    if (error.code === "P2003" || error.message?.includes("foreign key constraint")) {
      return res.status(400).json({
        success: false,
        message: "Impossible de supprimer cette entreprise : elle contient des utilisateurs.",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export des fonctions pour les utiliser dans les routes
module.exports = {
  getAllEntreprises,
  getEntrepriseById,
  createEntreprise,
  updateEntreprise,
  deleteEntreprise,
};
