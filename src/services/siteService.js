const prisma = require("../config/prisma");

const getAllSites = async (entrepriseId) =>
  prisma.site.findMany({ where: { entrepriseId }, orderBy: { nom: "asc" } });

module.exports = { getAllSites };
