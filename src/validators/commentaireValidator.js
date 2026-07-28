const { z } = require("zod");

const commentaireSchema = z.object({
  contenu: z
    .string({ required_error: "Le commentaire ne peut pas être vide." })
    .trim()
    .min(1, "Le commentaire ne peut pas être vide.")
    .max(2000, "Le commentaire est trop long (2000 caractères maximum)."),
});

module.exports = { commentaireSchema };
