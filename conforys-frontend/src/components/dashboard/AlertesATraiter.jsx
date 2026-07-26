import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

// Style de chaque ligne selon le type d'alerte — point + tag alignés à
// droite, couleur sémantique (rouge = urgent, orange = attention, navy/slate = info).
const CONFIG_LIGNE = {
  INCIDENT_CRITIQUE: { couleur: "#DC2626", tag: "Urgent",   gras: true },
  ACTION_EN_RETARD:  { couleur: "#DC2626", tag: "Retard",   gras: true },
  EPI_STOCK_BAS:     { couleur: "#EA580C", tag: "Stock",    gras: false },
  EPI_PERIME:        { couleur: "#DC2626", tag: "Périmé",   gras: true },
  EPI_INSPECTION:    { couleur: "#DC2626", tag: "Inspection", gras: true },
  AUDIT_PLANIFIE:    { couleur: "#0D2B4E", tag: "Planning", gras: false },
  ATTESTATION_EXPIREE:    { couleur: "#DC2626", tag: "Expirée",   gras: true },
  ATTESTATION_RECYCLAGE:  { couleur: "#EA580C", tag: "Recyclage", gras: false },
  RISQUE_SANS_ACTION:     { couleur: "#DC2626", tag: "DUERP",     gras: true },
};
const CONFIG_DEFAUT = { couleur: "#94A3B8", tag: "Info", gras: false };

function AlertesATraiter() {
  const [alertes,    setAlertes]    = useState([]);
  const [chargement, setChargement] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/notifications/alertes")
      .then((res) => setAlertes(res.data.data || []))
      .catch(() => setAlertes([]))
      .finally(() => setChargement(false));
  }, []);

  if (chargement) {
    return <p className="text-sm text-[#94A3B8] py-4 px-4">Chargement des alertes…</p>;
  }

  if (alertes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm font-medium text-green-700">Rien à traiter</p>
        <p className="text-xs text-[#94A3B8] mt-1">Tous les indicateurs sont dans les normes</p>
      </div>
    );
  }

  return (
    <div>
      {/* Bandeau d'en-tête */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: "#FEF3E2" }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "#EA580C" }} />
        <p className="text-xs font-bold" style={{ color: "#9A3412" }}>
          Alertes à traiter ({alertes.length})
        </p>
      </div>

      {/* Liste des alertes */}
      <div className="max-h-72 overflow-y-auto">
        {alertes.map((alerte, i) => {
          const cfg = CONFIG_LIGNE[alerte.type] ?? CONFIG_DEFAUT;
          const cliquable = Boolean(alerte.lien);
          return (
            <div
              key={i}
              onClick={() => cliquable && navigate(alerte.lien)}
              className={`flex items-start justify-between gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-[#F1F5F9]" : ""} ${cliquable ? "cursor-pointer hover:bg-[#F8FAFC]" : ""}`}
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.couleur }} />
                <div className="min-w-0">
                  <p className={`text-xs leading-snug text-[#1E293B] ${cfg.gras ? "font-semibold" : ""}`}>
                    {alerte.libelle}
                  </p>
                  {alerte.detail && (
                    <p className="text-xs text-[#94A3B8] mt-0.5">{alerte.detail}</p>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-semibold shrink-0" style={{ color: cfg.couleur }}>
                {cfg.tag}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertesATraiter;
