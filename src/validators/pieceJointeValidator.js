const { z } = require("zod");

// L'URL est fournie par ImgBB côté frontend, on vérifie qu'elle est valide
const pieceJointeSchema = z.object({
  url: z
    .string({ required_error: "L'URL est obligatoire." })
    .url("L'URL fournie est invalide."),
  nom: z.string().optional(),
  type: z
    .enum(["IMAGE", "DOCUMENT"], { errorMap: () => ({ message: "Type invalide." }) })
    .optional(),
});

module.exports = { pieceJointeSchema };
