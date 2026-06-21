// Traducteur d'erreurs Prisma et métier → messages français pour l'API
const handleErreur = (res, error) => {
  // Erreur métier (ErreurMetier avec statusCode)
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  // Erreurs Prisma : les codes P2xxx sont des erreurs connues et traduisibles
  if (error.code) {
    switch (error.code) {
      case "P2002": {
        const champs = error.meta?.target ?? [];
        if (champs.includes("email")) {
          return res.status(409).json({ success: false, message: "Cet email est déjà utilisé par un autre compte." });
        }
        if (champs.includes("numeroReference")) {
          return res.status(409).json({ success: false, message: "Référence déjà attribuée. Veuillez réessayer." });
        }
        return res.status(409).json({ success: false, message: "Cette valeur existe déjà (doublon non autorisé)." });
      }
      case "P2025":
        return res.status(404).json({ success: false, message: "Enregistrement introuvable." });
      case "P2003":
        return res.status(400).json({ success: false, message: "Référence invalide : l'élément lié n'existe pas." });
      case "P2000":
        return res.status(400).json({ success: false, message: "La valeur saisie est trop longue pour ce champ." });
      case "P2011":
      case "P2012":
        return res.status(400).json({ success: false, message: "Un champ obligatoire est manquant." });
      default:
        break;
    }
  }

  // Erreur inattendue — on masque les détails techniques à l'utilisateur
  console.error("[ERREUR SERVEUR]", error);
  return res.status(500).json({
    success: false,
    message: "Une erreur inattendue est survenue. Veuillez réessayer.",
  });
};

module.exports = { handleErreur };
