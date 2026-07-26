const { z } = require("zod");

const CATEGORIES_5M = ["MAIN_OEUVRE", "MATERIEL", "METHODE", "MILIEU", "MATIERE"];

const causeIshikawaSchema = z.object({
  categorie: z.enum(CATEGORIES_5M, { errorMap: () => ({ message: "Catégorie 5M invalide." }) }),
  libelle: z.string().min(2, "Le libellé doit faire au moins 2 caractères."),
  retenue: z.boolean().optional(),
});

const etapePourquoiSchema = z.object({
  ordre: z.coerce.number().int().min(1).max(5),
  question: z.string().min(2, "La question est obligatoire."),
  reponse: z.string().min(1, "La réponse est obligatoire."),
});

// Schéma de mise à jour — tous les champs sont optionnels, seuls ceux fournis
// sont appliqués (causesIshikawa/etapesPourquoi remplacent l'ensemble de la
// section quand ils sont fournis, voir analyseCausesService.updateAnalyse).
const updateAnalyseSchema = z.object({
  causeRacine: z.string().max(2000).optional().or(z.literal("")).or(z.null()),
  causesIshikawa: z.array(causeIshikawaSchema).optional(),
  etapesPourquoi: z.array(etapePourquoiSchema).optional(),
  valider: z.boolean().optional(),
});

module.exports = { updateAnalyseSchema };
