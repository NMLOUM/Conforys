const { ZodError } = require("zod");

// Middleware générique : valide req.body avec un schéma Zod
// En cas d'échec → 400 avec les messages d'erreur par champ
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    // Premier message trouvé comme message principal
    const premier = Object.values(errors).flat()[0] ?? "Données invalides.";
    return res.status(400).json({
      success: false,
      message: premier,
      errors,
    });
  }
  // Remplace req.body par les données validées et converties (ex: coerce number)
  req.body = result.data;
  next();
};

module.exports = { validate };
