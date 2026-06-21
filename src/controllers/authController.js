const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const { handleErreur } = require("../utils/handleErreur");

// Fonction de connexion (login)
const login = async (req, res) => {
  try {
    // Récupération de l'email et du mot de passe envoyés par l'utilisateur
    const { email, password } = req.body;

    // Validation : les deux champs sont obligatoires
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "L'email et le mot de passe sont obligatoires.",
      });
    }

    // Recherche de l'utilisateur dans la base grâce à son email (unique)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Si aucun utilisateur trouvé : message d'erreur (sans préciser quoi, par sécurité)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect.",
      });
    }

    // Comparaison du mot de passe tapé avec le mot de passe haché en base
    const passwordValid = await bcrypt.compare(password, user.password);

    // Si le mot de passe ne correspond pas : même message d'erreur
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect.",
      });
    }

    // Génération du token JWT — contient id, rôle et entreprise pour le filtrage côté API
    const token = jwt.sign(
      { userId: user.id, role: user.role, entrepriseId: user.entrepriseId },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Réponse de succès : on renvoie le token et les infos publiques de l'utilisateur
    res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        entrepriseId: user.entrepriseId,
      },
    });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Export de la fonction login pour l'utiliser dans les routes
module.exports = { login };