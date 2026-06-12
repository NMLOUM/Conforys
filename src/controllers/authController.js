// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");
// Importation de bcrypt pour comparer les mots de passe
const bcrypt = require("bcrypt");
// Importation de jsonwebtoken pour générer le token de connexion
const jwt = require("jsonwebtoken");

// Fonction de connexion (login)
const login = async (req, res) => {
  try {
    // Récupération de l'email et du mot de passe envoyés par l'utilisateur
    const { email, password } = req.body;

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

    // Génération du token JWT (la "carte d'accès" de l'utilisateur connecté)
    // Il contient l'id et le rôle, est signé avec la clé secrète, et expire en 24h
    const token = jwt.sign(
      { userId: user.id, role: user.role },
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
      },
    });
  } catch (error) {
    // En cas d'erreur serveur, on renvoie une erreur 500
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export de la fonction login pour l'utiliser dans les routes
module.exports = { login };