// Styles par variant — couvre gravité, statut incident, statut action, rôle, stock EPI
const VARIANTS = {
  // Gravité incidents
  FAIBLE:   { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500"   },
  MOYEN:    { bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-500"  },
  MODEREE:  { bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-500"  },
  GRAVE:    { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500"  },
  CRITIQUE: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  // Statut incidents
  BROUILLON: { bg: "bg-gray-100",  text: "text-gray-500",    dot: "bg-gray-400"    },
  OUVERT:    { bg: "bg-blue-50",   text: "text-blue-700",    dot: "bg-blue-500"    },
  EN_COURS:  { bg: "bg-amber-50",  text: "text-amber-700",   dot: "bg-amber-500"   },
  CLOS:      { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  REJETE:    { bg: "bg-red-50",    text: "text-red-600",     dot: "bg-red-400"     },
  // Statut & priorité actions correctives (CAPA)
  A_FAIRE:   { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  TERMINE:   { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500"   },
  ANNULE:    { bg: "bg-gray-100",   text: "text-gray-500",    dot: "bg-gray-400"    },
  ELEVE:     { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500"  },
  EN_RETARD: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  // Statut audits / formations
  PLANIFIE:  { bg: "bg-blue-50",   text: "text-blue-700",    dot: "bg-blue-500"    },
  PLANIFIEE: { bg: "bg-blue-50",   text: "text-blue-700",    dot: "bg-blue-500"    },
  TERMINEE:  { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  ANNULEE:   { bg: "bg-gray-100",  text: "text-gray-500",    dot: "bg-gray-400"    },
  // EPI / stock
  ACTIF:     { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  PERIME:    { bg: "bg-red-50",    text: "text-red-700",     dot: "bg-red-500"     },
  ALERTE:    { bg: "bg-red-50",    text: "text-red-700",     dot: "bg-red-500"     },
  STOCK_OK:  { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  // Niveau d'alerte EPI calculé (OK / BIENTOT / ALERTE)
  OK:        { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  BIENTOT:   { bg: "bg-orange-50", text: "text-orange-700",  dot: "bg-orange-500"  },
  // Statut d'affectation EPI
  ACTIVE:    { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  RENDUE:    { bg: "bg-gray-100",  text: "text-gray-500",    dot: "bg-gray-400"    },
  // Résultat d'inspection EPI
  CONFORME:     { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  NON_CONFORME: { bg: "bg-red-50",   text: "text-red-700",   dot: "bg-red-500"   },
  // Habilitations
  VALIDE:          { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500"   },
  BIENTOT_EXPIREE: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  EXPIREE:         { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  // Rôles utilisateurs
  ADMIN:            { bg: "bg-red-50",    text: "text-red-700",     dot: "bg-red-500"     },
  RESPONSABLE_QHSE: { bg: "bg-blue-50",  text: "text-blue-800",    dot: "bg-blue-600"    },
  MANAGER:          { bg: "bg-slate-100", text: "text-slate-600",   dot: "bg-slate-400"   },
  EMPLOYE:          { bg: "bg-gray-100",  text: "text-gray-600",    dot: "bg-gray-400"    },
  // Générique
  ACTIF_USER:   { bg: "bg-green-50",  text: "text-green-700", dot: "bg-green-500" },
  INACTIF_USER: { bg: "bg-gray-100",  text: "text-gray-500",  dot: "bg-gray-400"  },
  // Catégories du journal d'activité (piste d'audit des incidents)
  DECLARATION:       { bg: "bg-blue-50",  text: "text-blue-700",  dot: "bg-blue-500"  },
  CHANGEMENT_STATUT: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  ACTION_CORRECTIVE: { bg: "bg-slate-100",text: "text-slate-600", dot: "bg-slate-400" },
  PIECE_JOINTE:      { bg: "bg-gray-100", text: "text-gray-600",  dot: "bg-gray-400"  },
  AUTRE:             { bg: "bg-gray-100", text: "text-gray-500",  dot: "bg-gray-400"  },
  // Catégories du journal d'activité EPI (piste d'audit complète)
  CREATION:      { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
  MODIFICATION:  { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500"  },
  SUPPRESSION:   { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
  AFFECTATION:   { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  RETOUR:        { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  INSPECTION:    { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
};

// Labels lisibles par défaut
const LABELS = {
  BROUILLON:        "Brouillon",
  OUVERT:           "Ouvert",
  EN_COURS:         "En cours",
  CLOS:             "Clôturé",
  REJETE:           "Rejeté",
  // Actions correctives
  A_FAIRE:          "À faire",
  TERMINE:          "Terminé",
  ANNULE:           "Annulé",
  ELEVE:            "Élevé",
  EN_RETARD:        "En retard",
  // Audits / formations
  PLANIFIE:         "Planifié",
  PLANIFIEE:        "Planifiée",
  TERMINEE:         "Terminée",
  ANNULEE:          "Annulée",
  // Gravité
  FAIBLE:           "Faible",
  MOYEN:            "Moyen",
  MODEREE:          "Modérée",
  GRAVE:            "Grave",
  CRITIQUE:         "Critique",
  // EPI
  ACTIF:            "Actif",
  PERIME:           "Périmé",
  ALERTE:           "Alerte stock",
  STOCK_OK:         "Stock OK",
  OK:               "OK",
  BIENTOT:          "Bientôt",
  ACTIVE:           "Active",
  RENDUE:           "Rendue",
  CONFORME:         "Conforme",
  NON_CONFORME:     "Non conforme",
  // Habilitations
  VALIDE:           "Valide",
  BIENTOT_EXPIREE:  "Expire bientôt",
  EXPIREE:          "Expirée",
  // Rôles
  ADMIN:            "Admin",
  RESPONSABLE_QHSE: "Resp. QHSE",
  MANAGER:          "Manager",
  EMPLOYE:          "Employé",
  // Journal d'activité
  DECLARATION:       "Déclaration",
  CHANGEMENT_STATUT: "Changement de statut",
  ACTION_CORRECTIVE: "Action corrective",
  PIECE_JOINTE:      "Pièce jointe",
  AUTRE:             "Autre",
  // Journal d'activité EPI
  CREATION:          "Création",
  MODIFICATION:      "Modification",
  SUPPRESSION:       "Suppression",
  AFFECTATION:       "Affectation",
  RETOUR:            "Retour",
  INSPECTION:        "Inspection",
};

function Badge({ variant = "EMPLOYE", label, className = "" }) {
  const c = VARIANTS[variant] || { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  const texte = label ?? LABELS[variant] ?? variant;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${c.bg} ${c.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {texte}
    </span>
  );
}

export default Badge;
