const prisma = require("../config/prisma");

// Crée une entrée immuable dans la piste d'audit d'un incident.
// Ne lève pas d'erreur vers l'appelant — l'audit ne doit jamais bloquer l'opération principale.
const enregistrer = async (incidentId, auteurId, action, details = null) => {
  try {
    return await prisma.historiqueIncident.create({
      data: { incidentId, auteurId, action, details },
    });
  } catch (err) {
    // On logue sans propager : la piste d'audit est complémentaire, pas critique
    console.error("[HISTORIQUE] Échec enregistrement :", err.message);
  }
};

// Retourne l'historique complet d'un incident, du plus récent au plus ancien.
// Inclut nom/prénom de l'auteur pour l'affichage côté client.
const getHistoriqueByIncident = async (incidentId) => {
  return await prisma.historiqueIncident.findMany({
    where:   { incidentId },
    include: { auteur: { select: { id: true, nom: true, prenom: true } } },
    orderBy: { dateAction: "desc" },
  });
};

module.exports = { enregistrer, getHistoriqueByIncident };
