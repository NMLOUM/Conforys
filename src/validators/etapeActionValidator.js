const { z } = require("zod");

const ajouterEtapeSchema = z.object({
  libelle: z
    .string({ required_error: "Le libellé de l'étape est obligatoire." })
    .trim()
    .min(2, "Le libellé doit faire au moins 2 caractères.")
    .max(200, "Le libellé est trop long (200 caractères maximum)."),
});

const modifierEtapeSchema = z.object({
  libelle:  z.string().trim().min(2, "Le libellé doit faire au moins 2 caractères.").max(200).optional(),
  complete: z.boolean().optional(),
});

module.exports = { ajouterEtapeSchema, modifierEtapeSchema };
