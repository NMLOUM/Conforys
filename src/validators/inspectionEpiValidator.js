const { z } = require("zod");

// Enregistrement d'une inspection — la date et le commentaire sont facultatifs
const inspectionSchema = z.object({
  dateInspection: z.string().optional().or(z.literal("")),
  conforme: z.coerce.boolean().optional(),
  commentaire: z.string().optional().or(z.literal("")),
});

module.exports = { inspectionSchema };
