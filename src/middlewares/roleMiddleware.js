// ── Middleware RBAC — Contrôle d'accès par rôle ──────────────────────────────
// Doit toujours être utilisé APRÈS le middleware protect (qui décode le JWT
// et remplit req.user avec { userId, role }).

/**
 * authorize(...rolesAutorises)
 * Retourne un middleware qui vérifie que req.user.role est dans la liste.
 * Exemple : authorize("ADMIN", "RESPONSABLE_QHSE")
 */
const authorize = (...rolesAutorises) => {
  return (req, res, next) => {
    // Si protect n'a pas été appelé avant, req.user est absent
    if (!req.user || !rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé. Permission insuffisante.",
      });
    }
    // Rôle autorisé : on laisse passer
    next();
  };
};

module.exports = { authorize };
