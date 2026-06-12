// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

// Calcule toutes les statistiques des incidents
const getIncidentStats = async () => {
  // 1. Nombre total d'incidents
  const total = await prisma.incident.count();

  // 2. Répartition par gravité (groupBy compte les incidents par valeur)
  const parGravite = await prisma.incident.groupBy({
    by: ["gravite"],
    _count: { gravite: true },
  });

  // 3. Répartition par statut
  const parStatut = await prisma.incident.groupBy({
    by: ["statut"],
    _count: { statut: true },
  });

  // 4. Répartition par type
  const parType = await prisma.incident.groupBy({
    by: ["type"],
    _count: { type: true },
  });

  // 5. Les 5 incidents les plus récents
  const recents = await prisma.incident.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      site: { select: { nom: true } },
      declarePar: { select: { nom: true, prenom: true } },
    },
  });

  // On retourne toutes les stats dans un seul objet structuré
  return {
    total,
    parGravite,
    parStatut,
    parType,
    recents,
  };
};

// Export du service
module.exports = { getIncidentStats };
