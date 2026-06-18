const prisma = require("../config/prisma");

const getAllSites = async () =>
  prisma.site.findMany({ orderBy: { nom: "asc" } });

module.exports = { getAllSites };
