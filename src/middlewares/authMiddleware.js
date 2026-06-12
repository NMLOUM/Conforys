// Importation de jsonwebtoken pour vérifier le token
const jwt = require("jsonwebtoken");

// Middleware qui protège les routes : vérifie le token avant de laisser passer
const protect = (req, res, next) => {
  try {
    // On récupère l'en-tête "Authorization" envoyé par le client
    const authHeader = req.headers.authorization;

    // Si aucun en-tête ou mauvais format : accès refusé
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Accès refusé. Token manquant.",
      });
    }

    // Le format attendu est "Bearer <token>", on extrait juste le token
    const token = authHeader.split(" ")[1];

    // On vérifie que le token est valide et non expiré (avec la clé secrète)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // On attache les infos de l'utilisateur (id, rôle) à la requête
    // Ainsi, les routes suivantes savent QUI est connecté
    req.user = decoded;

    // Tout est bon : on laisse passer vers la route demandée
    next();
  } catch (error) {
    // Token invalide ou expiré : accès refusé
    return res.status(401).json({
      success: false,
      message: "Token invalide ou expiré.",
    });
  }
};

// Export du middleware pour l'utiliser dans les routes
module.exports = { protect };