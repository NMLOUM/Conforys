// Service mutualisé de génération de PDF (PDFKit) — utilitaires réutilisables
// par tous les rapports (incident, audit...). Ce fichier ne connaît aucune
// donnée métier : il ne fait que dessiner (en-tête, titres, tableaux, pied de
// page) selon la charte graphique CONFORYS.
const PDFDocument = require("pdfkit");

// ── Palette CONFORYS (identique à la charte frontend) ─────────────────────────
const COULEURS = {
  navy:        "#0D2B4E",
  vert:        "#2E7D32",
  orange:      "#EA580C",
  rouge:       "#DC2626",
  bleu:        "#2563EB",
  amber:       "#CA8A04",
  slateFonce:  "#1E293B",
  slate:       "#475569",
  slateClair:  "#94A3B8",
  bordure:     "#E2E8F0",
  fondClair:   "#F8FAFC",
};

const MARGE_X = 50;
const LARGEUR_PAGE = 495; // A4 (595pt) - 2×50pt de marge

// Crée un nouveau document PDF au format A4. bufferPages: true permet de
// revenir sur toutes les pages une fois le contenu terminé, pour y ajouter
// une pagination exacte ("Page X / Y") dans dessinerPiedDePage.
const creerDocument = () => {
  return new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: MARGE_X, right: MARGE_X },
    bufferPages: true,
  });
};

// En-tête principal (première page) : nom CONFORYS + sous-titre du rapport + référence
const dessinerEnTete = (doc, sousTitre, reference) => {
  doc.font("Helvetica-Bold").fontSize(22).fillColor(COULEURS.navy).text("CONFORYS");
  doc.font("Helvetica").fontSize(9).fillColor(COULEURS.slate).text("Plateforme de gestion QHSE");
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").fontSize(15).fillColor(COULEURS.slateFonce).text(sousTitre);
  if (reference) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COULEURS.navy).text(reference);
  }

  doc.moveDown(0.5);
  const y = doc.y;
  doc.moveTo(MARGE_X, y).lineTo(MARGE_X + LARGEUR_PAGE, y).strokeColor(COULEURS.bordure).lineWidth(1).stroke();
  doc.moveDown(1);
};

// Titre de section (souligné, en navy)
const dessinerTitreSection = (doc, titre) => {
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COULEURS.navy).text(titre.toUpperCase());
  const y = doc.y + 2;
  doc.moveTo(MARGE_X, y).lineTo(MARGE_X + LARGEUR_PAGE, y).strokeColor(COULEURS.navy).lineWidth(1.2).stroke();
  doc.y = y + 8;
};

// Ligne "Label : valeur" — utilise {continued:true} pour rester sur la même ligne
const dessinerLigneInfo = (doc, label, valeur) => {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COULEURS.slate).text(`${label} : `, { continued: true });
  doc.font("Helvetica").fontSize(9).fillColor(COULEURS.slateFonce).text(valeur ?? "—");
  doc.moveDown(0.15);
};

// Variante colorée pour les valeurs sémantiques (statut, gravité, criticité...)
const dessinerLigneInfoColoree = (doc, label, valeur, couleur) => {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COULEURS.slate).text(`${label} : `, { continued: true });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(couleur ?? COULEURS.slateFonce).text(valeur ?? "—");
  doc.moveDown(0.15);
};

// Paragraphe de texte libre (description, commentaires longs)
const dessinerParagraphe = (doc, texte) => {
  doc.font("Helvetica").fontSize(9).fillColor(COULEURS.slateFonce).text(texte || "—", { align: "justify" });
  doc.moveDown(0.5);
};

// Message discret quand une section n'a rien à afficher
const dessinerMessageVide = (doc, texte) => {
  doc.font("Helvetica-Oblique").fontSize(9).fillColor(COULEURS.slateClair).text(texte);
  doc.moveDown(0.5);
};

// Tableau simple à hauteur de ligne dynamique (le texte s'enroule dans la largeur
// de colonne). Gère automatiquement le changement de page et répète l'en-tête.
// colonnes : [{ label, largeur }]  —  lignes : [[val1, val2, ...], ...]
const dessinerTableau = (doc, colonnes, lignes) => {
  const padding = 4;
  const hauteurEntete = 20;

  const dessinerEntete = () => {
    let x = MARGE_X;
    const y = doc.y;
    doc.rect(MARGE_X, y, LARGEUR_PAGE, hauteurEntete).fill(COULEURS.navy);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(8);
    colonnes.forEach((col) => {
      doc.text(col.label, x + padding, y + 6, { width: col.largeur - padding * 2 });
      x += col.largeur;
    });
    // PDFKit laisse le curseur x sur la dernière colonne écrite : on le
    // remet explicitement à la marge gauche pour ne pas fausser les
    // prochains appels .text() sans coordonnées explicites (ils hériteraient
    // sinon d'une largeur résiduelle minuscule et joueraient un texte tassé).
    doc.x = MARGE_X;
    doc.y = y + hauteurEntete;
  };

  dessinerEntete();

  if (lignes.length === 0) {
    doc.y += 6;
    dessinerMessageVide(doc, "Aucune donnée à afficher.");
    doc.x = MARGE_X;
    return;
  }

  lignes.forEach((ligne, i) => {
    doc.font("Helvetica").fontSize(8);
    const hauteurs = ligne.map((val, j) =>
      doc.heightOfString(String(val ?? "—"), { width: colonnes[j].largeur - padding * 2 })
    );
    const hauteurLigne = Math.max(...hauteurs, 14) + 8;

    // Saut de page si la ligne ne rentre pas — on répète l'en-tête sur la nouvelle page
    if (doc.y + hauteurLigne > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      dessinerEntete();
    }

    const y = doc.y;
    if (i % 2 === 1) {
      doc.rect(MARGE_X, y, LARGEUR_PAGE, hauteurLigne).fill(COULEURS.fondClair);
    }
    let x = MARGE_X;
    doc.fillColor(COULEURS.slateFonce).font("Helvetica").fontSize(8);
    ligne.forEach((val, j) => {
      doc.text(String(val ?? "—"), x + padding, y + 4, { width: colonnes[j].largeur - padding * 2 });
      x += colonnes[j].largeur;
    });
    doc.y = y + hauteurLigne;
  });

  doc.x = MARGE_X;
  doc.y += 8;
};

// Bloc "score" bien visible, coloré selon le niveau (vert ≥75, orange ≥50, rouge sinon)
const dessinerScore = (doc, score) => {
  const couleur = score == null ? COULEURS.slateClair : score >= 75 ? COULEURS.vert : score >= 50 ? COULEURS.orange : COULEURS.rouge;
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COULEURS.slate).text("SCORE DE CONFORMITÉ", { align: "center" });
  doc.font("Helvetica-Bold").fontSize(40).fillColor(couleur).text(score != null ? `${score}%` : "—", { align: "center" });
  doc.moveDown(0.5);
};

// Pied de page : date de génération + pagination "Page X / Y". Doit être appelé
// juste avant doc.end() — parcourt toutes les pages déjà mises en mémoire
// (bufferPages: true) pour connaître le nombre total de pages à l'avance.
const dessinerPiedDePage = (doc) => {
  const plage = doc.bufferedPageRange();
  const dateGeneration = new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

  for (let i = plage.start; i < plage.start + plage.count; i++) {
    doc.switchToPage(i);

    // Écrire dans la marge basse déclenche normalement un saut de page
    // automatique chez PDFKit (il considère qu'on dépasse la zone de
    // contenu) : on désactive temporairement la marge pour ce pied de page,
    // avec lineBreak:false pour empêcher tout retour à la ligne intempestif.
    const margeBasOriginale = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const bas = doc.page.height - margeBasOriginale + 15;
    doc.font("Helvetica").fontSize(7).fillColor(COULEURS.slateClair)
      .text(`Document généré le ${dateGeneration} — CONFORYS`, MARGE_X, bas, { width: 350, lineBreak: false });
    doc.text(`Page ${i - plage.start + 1} / ${plage.count}`, MARGE_X + 345, bas, { width: 150, align: "right", lineBreak: false });

    doc.page.margins.bottom = margeBasOriginale;
  }
};

module.exports = {
  COULEURS,
  creerDocument,
  dessinerEnTete,
  dessinerTitreSection,
  dessinerLigneInfo,
  dessinerLigneInfoColoree,
  dessinerParagraphe,
  dessinerMessageVide,
  dessinerTableau,
  dessinerScore,
  dessinerPiedDePage,
};
