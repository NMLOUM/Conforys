const { z } = require("zod");

const pieceJointeActionSchema = z.object({
  url: z
    .string({ required_error: "L'URL est obligatoire." })
    .url("L'URL fournie est invalide."),
  nom: z.string().optional(),
  type: z
    .enum(["IMAGE", "DOCUMENT"], { errorMap: () => ({ message: "Type invalide." }) })
    .optional(),
  taille: z.coerce.number().int().positive().optional().or(z.null()),
});

module.exports = { pieceJointeActionSchema };
