const CONFIG = {
  CRITIQUE: {
    bg:     "bg-red-50",
    border: "border-red-200",
    dot:    "bg-red-500",
    text:   "text-red-800",
    sub:    "text-red-600",
    badge:  "bg-red-100 text-red-700",
  },
  AVERTISSEMENT: {
    bg:     "bg-orange-50",
    border: "border-orange-200",
    dot:    "bg-orange-400",
    text:   "text-orange-800",
    sub:    "text-orange-600",
    badge:  "bg-orange-100 text-orange-700",
  },
};

const LABELS_CAT = {
  EPI_STOCK:       "Stock EPI",
  EPI_PERIME:      "Péremption EPI",
  EPI_INSPECTION:  "Inspection EPI",
  HABILITATION:    "Habilitation",
  AUDIT_RETARD:    "Audit en retard",
  INCIDENT_GRAVE:  "Incident grave",
  ATTESTATION_EXPIREE:   "Attestation expirée",
  ATTESTATION_RECYCLAGE: "Recyclage attestation",
};

function AlertesCritiques({ alertes = [] }) {
  if (!alertes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm font-medium text-green-700">Aucune alerte active</p>
        <p className="text-xs text-[#94A3B8] mt-1">Tous les indicateurs sont dans les normes</p>
      </div>
    );
  }

  const critiques     = alertes.filter((a) => a.niveau === "CRITIQUE");
  const avertissements = alertes.filter((a) => a.niveau === "AVERTISSEMENT");

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {/* Résumé */}
      <div className="flex items-center gap-3 pb-2 border-b border-[#F1F5F9]">
        {critiques.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            {critiques.length} critique{critiques.length > 1 ? "s" : ""}
          </span>
        )}
        {avertissements.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
            {avertissements.length} avertissement{avertissements.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Liste */}
      {alertes.map((alerte, i) => {
        const c = CONFIG[alerte.niveau] || CONFIG.AVERTISSEMENT;
        return (
          <div key={i} className={`rounded-lg border px-3 py-2.5 ${c.bg} ${c.border}`}>
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${c.badge}`}>
                    {LABELS_CAT[alerte.categorie] || alerte.categorie}
                  </span>
                </div>
                <p className={`text-xs font-medium ${c.text} leading-snug`}>{alerte.message}</p>
                {alerte.detail && (
                  <p className={`text-xs mt-0.5 ${c.sub}`}>{alerte.detail}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AlertesCritiques;
