// Attestations de formation : certificat délivré automatiquement quand un
// employé est validé sur une session présentielle (sous-bloc A) ou réussit
// le quiz d'un module en ligne (sous-bloc B). Génère un PDF avec QR code de
// vérification, et expose une consultation publique du code (sans données
// personnelles sensibles).
const crypto = require("crypto");
const qrcode = require("qrcode");
const prisma = require("../config/prisma");
const pdf = require("./pdfService");

// Erreur métier avec code HTTP — cohérent avec les autres services
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Code de vérification public — volontairement distinct de l'id interne
// (jamais exposer une clé primaire de base de données dans une URL publique)
const genererCodeVerification = () => crypto.randomBytes(12).toString("hex");

// Crée une attestation si aucune n'existe déjà pour ce bénéficiaire et cette
// formation (même titre + même source) — évite les doublons en cas de
// double-validation ou de re-soumission d'un quiz déjà réussi.
const creerSiAbsente = async ({ beneficiaireId, titreFormation, themeFormation, dateExpiration, scoreObtenu, source }) => {
  const existante = await prisma.attestation.findFirst({
    where: { beneficiaireId, titreFormation, source },
  });
  if (existante) return existante;

  return await prisma.attestation.create({
    data: {
      codeVerification: genererCodeVerification(),
      beneficiaireId,
      titreFormation,
      themeFormation: themeFormation || null,
      dateExpiration: dateExpiration || null,
      scoreObtenu: scoreObtenu ?? null,
      source,
    },
  });
};

// Attestations d'un utilisateur donné, les plus récentes d'abord
const getMesAttestations = async (userId) => {
  return await prisma.attestation.findMany({
    where: { beneficiaireId: userId },
    orderBy: { dateObtention: "desc" },
  });
};

// Toutes les attestations délivrées, scopées à l'entreprise du demandeur —
// avec filtres optionnels par bénéficiaire, texte de formation et statut de
// validité (calculé, jamais stocké : une attestation "expire" simplement en
// franchissant sa dateExpiration, sans action explicite).
const getToutesAttestations = async (entrepriseId, { beneficiaireId, recherche, statut } = {}) => {
  const attestations = await prisma.attestation.findMany({
    where: {
      beneficiaire: { entrepriseId },
      ...(beneficiaireId && { beneficiaireId }),
      ...(recherche && { titreFormation: { contains: recherche, mode: "insensitive" } }),
    },
    include: { beneficiaire: { select: { id: true, nom: true, prenom: true } } },
    orderBy: { dateObtention: "desc" },
  });

  const maintenant = new Date();
  const annotees = attestations.map((a) => ({
    ...a,
    statut: a.dateExpiration
      ? (new Date(a.dateExpiration) < maintenant ? "EXPIREE" : "VALIDE")
      : "VALIDE",
  }));

  return statut ? annotees.filter((a) => a.statut === statut) : annotees;
};

// Génère le PDF de l'attestation, avec un QR code encodant l'URL de
// vérification publique. Retourne { doc, filename } — même contrat que les
// autres services PDF (incident, audit, rapport de synthèse).
// Accès restreint au bénéficiaire lui-même, au RESPONSABLE_QHSE ou à l'ADMIN.
const genererPdf = async (attestationId, demandeur) => {
  const attestation = await prisma.attestation.findUnique({
    where: { id: attestationId },
    include: { beneficiaire: { select: { nom: true, prenom: true, entrepriseId: true } } },
  });
  if (!attestation) throw new ErreurMetier("Attestation introuvable.", 404);

  // Un QHSE/ADMIN ne peut consulter que les attestations de sa propre
  // entreprise — sans ce contrôle, connaître un id suffirait à télécharger
  // l'attestation d'un bénéficiaire d'une autre entreprise.
  const estAutorise = attestation.beneficiaireId === demandeur.userId
    || ((demandeur.role === "RESPONSABLE_QHSE" || demandeur.role === "ADMIN")
        && attestation.beneficiaire.entrepriseId === demandeur.entrepriseId);
  if (!estAutorise) {
    throw new ErreurMetier("Vous n'êtes pas autorisé à consulter cette attestation.", 403);
  }

  const urlVerification = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verifier/${attestation.codeVerification}`;
  const qrDataUrl = await qrcode.toDataURL(urlVerification, { margin: 1, width: 300 });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const doc = pdf.creerDocument();
  const perimee = attestation.dateExpiration && new Date(attestation.dateExpiration) < new Date();

  pdf.dessinerEnTete(doc, "Attestation de formation", attestation.titreFormation);

  pdf.dessinerTitreSection(doc, "Bénéficiaire");
  pdf.dessinerLigneInfo(doc, "Nom", `${attestation.beneficiaire.prenom} ${attestation.beneficiaire.nom}`);

  pdf.dessinerTitreSection(doc, "Formation");
  pdf.dessinerLigneInfo(doc, "Intitulé", attestation.titreFormation);
  if (attestation.themeFormation) pdf.dessinerLigneInfo(doc, "Thème", attestation.themeFormation);
  pdf.dessinerLigneInfo(doc, "Date d'obtention", attestation.dateObtention.toLocaleDateString("fr-FR"));
  if (attestation.dateExpiration) {
    pdf.dessinerLigneInfoColoree(
      doc, "Date d'expiration", new Date(attestation.dateExpiration).toLocaleDateString("fr-FR"),
      perimee ? pdf.COULEURS.rouge : pdf.COULEURS.vert
    );
  }
  if (attestation.scoreObtenu != null) pdf.dessinerLigneInfo(doc, "Score obtenu", `${attestation.scoreObtenu}%`);

  // ── QR code de vérification, centré ──
  doc.moveDown(1.5);
  const tailleQr = 120;
  const xCentre = (doc.page.width - tailleQr) / 2;
  doc.image(qrBuffer, xCentre, doc.y, { width: tailleQr, height: tailleQr });
  doc.y += tailleQr + 8;

  doc.font("Helvetica").fontSize(8).fillColor(pdf.COULEURS.slate)
    .text("Ce document peut être vérifié en scannant le code ci-dessus", { align: "center" });
  doc.font("Helvetica").fontSize(7).fillColor(pdf.COULEURS.slateClair)
    .text(`Code de vérification : ${attestation.codeVerification}`, { align: "center" });

  pdf.dessinerPiedDePage(doc);

  const nomFichier = attestation.titreFormation.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return { doc, filename: `attestation-${nomFichier}.pdf` };
};

// Vérification publique par code — ne renvoie que le strict nécessaire
// (prénom + initiale du nom, formation, dates, validité) : pas d'email, pas
// d'id interne, pas de score détaillé — conformité protection des données.
const verifierParCode = async (code) => {
  const attestation = await prisma.attestation.findUnique({
    where: { codeVerification: code },
    include: { beneficiaire: { select: { nom: true, prenom: true } } },
  });
  if (!attestation) return null;

  const maintenant = new Date();
  const expiree = attestation.dateExpiration && new Date(attestation.dateExpiration) < maintenant;

  return {
    valide: !expiree,
    beneficiaire: `${attestation.beneficiaire.prenom} ${attestation.beneficiaire.nom.charAt(0)}.`,
    titreFormation: attestation.titreFormation,
    themeFormation: attestation.themeFormation,
    dateObtention: attestation.dateObtention,
    dateExpiration: attestation.dateExpiration,
  };
};

module.exports = {
  creerSiAbsente,
  getMesAttestations,
  getToutesAttestations,
  genererPdf,
  verifierParCode,
};
