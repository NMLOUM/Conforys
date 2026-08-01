const { z } = require("zod");

// Domaines autorisés pour l'hébergement des pièces jointes (ImgBB uniquement
// côté frontend) — empêche d'enregistrer une URL arbitraire (contenu externe
// non maîtrisé, contournement du flux d'upload prévu).
const DOMAINES_AUTORISES = ["i.ibb.co", "ibb.co"];
const TAILLE_MAX_OCTET = 5 * 1024 * 1024; // 5 Mo — même limite que le frontend

const urlHebergeeValide = (val) => {
  try {
    return DOMAINES_AUTORISES.includes(new URL(val).hostname);
  } catch {
    return false;
  }
};

const pieceJointeActionSchema = z.object({
  url: z
    .string({ required_error: "L'URL est obligatoire." })
    .url("L'URL fournie est invalide.")
    .refine(urlHebergeeValide, { message: "Seules les URL hébergées sur ImgBB sont acceptées." }),
  nom: z.string().optional(),
  type: z
    .enum(["IMAGE", "DOCUMENT"], { errorMap: () => ({ message: "Type invalide." }) })
    .optional(),
  taille: z.coerce.number().int().positive().max(TAILLE_MAX_OCTET, "Fichier trop volumineux (5 Mo max).").optional().or(z.null()),
});

module.exports = { pieceJointeActionSchema };
