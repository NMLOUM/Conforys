// Styles par variant — couvre gravité, statut, rôle, stock EPI
const VARIANTS = {
  // Gravité
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
  // Statut audits / formations
  PLANIFIE:  { bg: "bg-blue-50",   text: "text-blue-700",    dot: "bg-blue-500"    },
  PLANIFIEE: { bg: "bg-blue-50",   text: "text-blue-700",    dot: "bg-blue-500"    },
  TERMINE:   { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  TERMINEE:  { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  ANNULE:    { bg: "bg-gray-100",  text: "text-gray-500",    dot: "bg-gray-400"    },
  ANNULEE:   { bg: "bg-gray-100",  text: "text-gray-500",    dot: "bg-gray-400"    },
  // EPI / stock
  ACTIF:     { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  PERIME:    { bg: "bg-red-50",    text: "text-red-700",     dot: "bg-red-500"     },
  ALERTE:    { bg: "bg-red-50",    text: "text-red-700",     dot: "bg-red-500"     },
  STOCK_OK:  { bg: "bg-green-50",  text: "text-green-700",   dot: "bg-green-500"   },
  // Habilitations
  VALIDE:          { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500"   },
  BIENTOT_EXPIREE: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  EXPIREE:         { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  // Rôles utilisateurs
  ADMIN:            { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  RESPONSABLE_QHSE: { bg: "bg-blue-50",   text: "text-blue-800",    dot: "bg-blue-600"    },
  MANAGER:          { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500"  },
  EMPLOYE:          { bg: "bg-gray-100",   text: "text-gray-600",    dot: "bg-gray-400"    },
  // Générique
  ACTIF_USER:  { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  INACTIF_USER: { bg: "bg-gray-100", text: "text-gray-500",   dot: "bg-gray-400"   },
};

// Labels lisibles par défaut
const LABELS = {
  BROUILLON:        "Brouillon",
  OUVERT:           "Ouvert",
  EN_COURS:         "En cours",
  CLOS:             "Clôturé",
  REJETE:           "Rejeté",
  PLANIFIE:         "Planifié",
  PLANIFIEE:        "Planifiée",
  TERMINE:          "Terminé",
  TERMINEE:         "Terminée",
  ANNULE:           "Annulé",
  ANNULEE:          "Annulée",
  FAIBLE:           "Faible",
  MOYEN:            "Moyen",
  MODEREE:          "Modérée",
  GRAVE:            "Grave",
  CRITIQUE:         "Critique",
  ACTIF:            "Actif",
  PERIME:           "Périmé",
  ALERTE:           "Alerte stock",
  STOCK_OK:         "Stock OK",
  VALIDE:           "Valide",
  BIENTOT_EXPIREE:  "Expire bientôt",
  EXPIREE:          "Expirée",
  ADMIN:            "Admin",
  RESPONSABLE_QHSE: "Resp. QHSE",
  MANAGER:          "Manager",
  EMPLOYE:          "Employé",
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
