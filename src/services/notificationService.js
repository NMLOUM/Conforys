// Notifications in-app : création (unitaire ou groupée), lecture par
// utilisateur, marquage lu, et calcul des alertes métier (EPI, habilitations,
// actions correctives, incidents critiques, audits planifiés).
const prisma = require("../config/prisma");
const { calculerNiveauAlerte } = require("./epiService");

// Erreur métier avec code HTTP — cohérent avec les autres services
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Crée une notification pour un destinataire unique. Ne propage jamais
// l'erreur vers l'appelant : une notification est complémentaire, elle ne
// doit jamais faire échouer l'opération métier principale (ex: déclaration
// d'un incident) si son enregistrement échoue.
const creer = async (destinataireId, type, titre, message, lien = null) => {
  try {
    return await prisma.notification.create({
      data: { destinataireId, type, titre, message, lien },
    });
  } catch (err) {
    console.error("[NOTIFICATION] Échec création :", err.message);
  }
};

// Crée la même notification pour plusieurs destinataires en une seule requête
// (ex : tous les RESPONSABLE_QHSE d'une entreprise à la déclaration d'un incident).
const creerPourPlusieurs = async (destinataireIds, type, titre, message, lien = null) => {
  if (!destinataireIds || destinataireIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: destinataireIds.map((destinataireId) => ({ destinataireId, type, titre, message, lien })),
    });
  } catch (err) {
    console.error("[NOTIFICATION] Échec création groupée :", err.message);
  }
};

// Notifications d'un utilisateur, les plus récentes d'abord. Limitées aux
// 50 dernières — la cloche affiche un flux récent, pas un historique complet.
const getByUser = async (userId) => {
  return await prisma.notification.findMany({
    where: { destinataireId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};

// Marque une notification comme lue — vérifie qu'elle appartient bien à
// l'utilisateur connecté (pas d'accès croisé entre comptes).
const marquerLu = async (id, userId) => {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.destinataireId !== userId) {
    throw new ErreurMetier("Notification introuvable.", 404);
  }
  return await prisma.notification.update({ where: { id }, data: { lu: true } });
};

// Marque toutes les notifications non lues de l'utilisateur comme lues
const marquerToutLu = async (userId) => {
  return await prisma.notification.updateMany({
    where: { destinataireId: userId, lu: false },
    data: { lu: true },
  });
};

// Compteur de notifications non lues — alimente le badge de la cloche
const compterNonLues = async (userId) => {
  return await prisma.notification.count({ where: { destinataireId: userId, lu: false } });
};

// ── Alertes métier (calculées à la volée, pas stockées) ──────────────────────
//
// Distinctes des notifications : une alerte métier est un état courant
// (« il y a 3 EPI sous le seuil ») recalculé à chaque appel, alors qu'une
// notification est un événement daté et persisté (« incident X déclaré »).
// Scopées par entreprise pour l'isolation multi-tenant.
const getAlertesMetier = async (entrepriseId) => {
  const maintenant = new Date();
  const finSemaine = new Date(); finSemaine.setDate(maintenant.getDate() + 7);
  const dans30Jours = new Date(); dans30Jours.setDate(maintenant.getDate() + 30);

  const [epis, actionsEnRetard, incidentsCritiques, auditsSemaine, attestationsAvecExpiration, risquesSansAction] = await Promise.all([
    prisma.epi.findMany({
      where: { site: { entrepriseId } },
      select: {
        designation: true, quantite: true, seuilAlerte: true, datePeremption: true, frequenceInspectionJours: true,
        inspections: { orderBy: { dateInspection: "desc" }, take: 1, select: { dateInspection: true } },
        site: { select: { nom: true } },
      },
    }),
    prisma.actionCorrective.findMany({
      where: {
        dateLimite: { lt: maintenant },
        statut: { notIn: ["TERMINE", "ANNULE"] },
        OR: [
          { incident: { declarePar: { entrepriseId } } },
          { audit: { auditeur: { entrepriseId } } },
        ],
      },
      include: { responsable: { select: { nom: true, prenom: true } } },
      orderBy: { dateLimite: "asc" },
    }),
    prisma.incident.findMany({
      where: { gravite: "CRITIQUE", statut: "OUVERT", declarePar: { entrepriseId } },
      include: { site: { select: { nom: true } } },
    }),
    prisma.audit.findMany({
      where: { statut: "PLANIFIE", datePrevue: { gte: maintenant, lte: finSemaine }, auditeur: { entrepriseId } },
      include: { site: { select: { nom: true } } },
      orderBy: { datePrevue: "asc" },
    }),
    prisma.attestation.findMany({
      where: { beneficiaire: { entrepriseId }, dateExpiration: { not: null } },
      select: {
        id: true, titreFormation: true, dateExpiration: true,
        beneficiaire: { select: { nom: true, prenom: true } },
      },
    }),
    // Risques élevés/critiques (niveauRisque ≥ 8, mêmes seuils que
    // risqueService.calculerNiveauQualitatif) sans action de prévention générée
    prisma.risque.findMany({
      where: { site: { entrepriseId }, niveauRisque: { gte: 8 }, actions: { none: {} } },
      select: { id: true, danger: true, niveauRisque: true, site: { select: { nom: true } } },
    }),
  ]);

  const alertes = [];

  // Niveau ALERTE = rupture de stock, péremption dépassée, ou inspection en
  // retard (même calcul que la page EPI, via epiService.calculerNiveauAlerte)
  // — le niveau BIENTOT reste un avertissement, pas une alerte "à traiter"
  // immédiatement.
  epis
    .filter((e) => calculerNiveauAlerte(e) === "ALERTE")
    .forEach((e) => {
      const perime = e.datePeremption && new Date(e.datePeremption) < maintenant;
      const enRupture = e.quantite <= e.seuilAlerte;
      let alerte;
      if (perime) {
        alerte = {
          type: "EPI_PERIME",
          niveau: "URGENT",
          libelle: `${e.designation} — périmé depuis le ${new Date(e.datePeremption).toLocaleDateString("fr-FR")}`,
        };
      } else if (enRupture) {
        alerte = {
          type: "EPI_STOCK_BAS",
          niveau: "ATTENTION",
          libelle: `${e.designation} — ${e.quantite} restant(s) (seuil ${e.seuilAlerte})`,
        };
      } else {
        alerte = {
          type: "EPI_INSPECTION",
          niveau: "URGENT",
          libelle: `${e.designation} — inspection en retard`,
        };
      }
      alertes.push({ ...alerte, detail: e.site?.nom ?? null, lien: "/epis" });
    });

  actionsEnRetard.forEach((a) => alertes.push({
    type: "ACTION_EN_RETARD",
    niveau: "URGENT",
    libelle: a.description,
    detail: `En retard depuis le ${new Date(a.dateLimite).toLocaleDateString("fr-FR")} — ${a.responsable?.prenom} ${a.responsable?.nom}`,
    lien: "/actions",
  }));

  incidentsCritiques.forEach((i) => alertes.push({
    type: "INCIDENT_CRITIQUE",
    niveau: "URGENT",
    libelle: `${i.numeroReference} — incident critique non traité`,
    detail: i.site?.nom ?? null,
    lien: `/incidents/${i.id}`,
  }));

  auditsSemaine.forEach((a) => alertes.push({
    type: "AUDIT_PLANIFIE",
    niveau: "INFO",
    libelle: `Audit prévu — ${a.titre}`,
    detail: `${new Date(a.datePrevue).toLocaleDateString("fr-FR")} · ${a.site?.nom ?? "—"}`,
    lien: `/audits/${a.id}`,
  }));

  // Attestations de formation déjà expirées ou expirant dans < 30 jours
  attestationsAvecExpiration.forEach((a) => {
    const dateExp = new Date(a.dateExpiration);
    if (dateExp < maintenant) {
      alertes.push({
        type: "ATTESTATION_EXPIREE",
        niveau: "URGENT",
        libelle: `${a.titreFormation} — ${a.beneficiaire.prenom} ${a.beneficiaire.nom}`,
        detail: `Expirée depuis le ${dateExp.toLocaleDateString("fr-FR")}`,
        lien: "/attestations",
      });
    } else if (dateExp <= dans30Jours) {
      alertes.push({
        type: "ATTESTATION_RECYCLAGE",
        niveau: "ATTENTION",
        libelle: `${a.titreFormation} — ${a.beneficiaire.prenom} ${a.beneficiaire.nom}`,
        detail: `À recycler avant le ${dateExp.toLocaleDateString("fr-FR")}`,
        lien: "/attestations",
      });
    }
  });

  // Risques élevés/critiques sans action de prévention générée
  risquesSansAction.forEach((r) => alertes.push({
    type: "RISQUE_SANS_ACTION",
    niveau: "URGENT",
    libelle: `${r.danger} — aucune action de prévention`,
    detail: r.site?.nom ?? null,
    lien: "/duerp",
  }));

  return alertes;
};

module.exports = {
  creer,
  creerPourPlusieurs,
  getByUser,
  marquerLu,
  marquerToutLu,
  compterNonLues,
  getAlertesMetier,
};
