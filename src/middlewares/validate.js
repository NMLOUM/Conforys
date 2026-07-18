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

// Variante : valide req.query au lieu de req.body — utilisée pour les routes
// GET paramétrées (ex: rapport de synthèse par période).
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const premier = Object.values(errors).flat()[0] ?? "Paramètres invalides.";
    return res.status(400).json({
      success: false,
      message: premier,
      errors,
    });
  }
  req.query = result.data;
  next();
};

module.exports = { validate, validateQuery };
