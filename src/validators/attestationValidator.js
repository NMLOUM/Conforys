const { z } = require("zod");

// Filtres de la liste des attestations (tous facultatifs)
const listeAttestationsSchema = z.object({
  beneficiaireId: z.string().uuid().optional(),
  recherche: z.string().optional(),
  statut: z.enum(["VALIDE", "EXPIREE"]).optional(),
});

module.exports = { listeAttestationsSchema };
