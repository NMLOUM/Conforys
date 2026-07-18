const { z } = require("zod");

// Paramètres du rapport de synthèse par période — dateDebut/dateFin
// obligatoires, siteId optionnel ("tous les sites" si absent).
const rapportSyntheseSchema = z
  .object({
    dateDebut: z
      .string({ required_error: "La date de début est obligatoire." })
      .min(1, "La date de début est obligatoire."),
    dateFin: z
      .string({ required_error: "La date de fin est obligatoire." })
      .min(1, "La date de fin est obligatoire."),
    siteId: z
      .string()
      .uuid("Site invalide.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const debut = new Date(data.dateDebut);
    const fin = new Date(data.dateFin);

    if (isNaN(debut.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateDebut"], message: "Date de début invalide." });
    }
    if (isNaN(fin.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateFin"], message: "Date de fin invalide." });
    }
    if (!isNaN(debut.getTime()) && !isNaN(fin.getTime()) && debut > fin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateFin"],
        message: "La date de fin doit être postérieure ou égale à la date de début.",
      });
    }
  });

module.exports = { rapportSyntheseSchema };
