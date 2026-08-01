import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing } from "lucide-react";
import api from "../../api/axios";

// Style de chaque carte selon le type d'alerte — bordure gauche + fond teinté,
// couleur sémantique (rouge = urgent, orange = attention, navy/slate = info).
const CONFIG_LIGNE = {
  INCIDENT_CRITIQUE: { couleur: "#DC2626", bg: "#FEF2F2", tag: "Urgent",   gras: true },
  ACTION_EN_RETARD:  { couleur: "#DC2626", bg: "#FEF2F2", tag: "Retard",   gras: true },
  EPI_STOCK_BAS:     { couleur: "#EA580C", bg: "#FFF7ED", tag: "Stock",    gras: false },
  EPI_PERIME:        { couleur: "#DC2626", bg: "#FEF2F2", tag: "Périmé",   gras: true },
  EPI_INSPECTION:    { couleur: "#DC2626", bg: "#FEF2F2", tag: "Inspection", gras: true },
  AUDIT_PLANIFIE:    { couleur: "#0D2B4E", bg: "#F8FAFC", tag: "Planning", gras: false },
  ATTESTATION_EXPIREE:    { couleur: "#DC2626", bg: "#FEF2F2", tag: "Expirée",   gras: true },
  ATTESTATION_RECYCLAGE:  { couleur: "#EA580C", bg: "#FFF7ED", tag: "Recyclage", gras: false },
  RISQUE_SANS_ACTION:     { couleur: "#DC2626", bg: "#FEF2F2", tag: "DUERP",     gras: true },
};
const CONFIG_DEFAUT = { couleur: "#94A3B8", bg: "#F8FAFC", tag: "Info", gras: false };

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
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="flex items-center gap-2 px-5 py-4">
        <BellRing size={17} color="#EA580C" />
        <p className="text-[15px] font-semibold text-[#1E293B]">Alertes à traiter</p>
        <span className="ml-auto text-xs font-semibold text-white bg-[#EA580C] rounded-full w-5 h-5 flex items-center justify-center">
          {alertes.length}
        </span>
      </div>

      {/* Liste des alertes */}
      <div className="flex-1 max-h-80 overflow-y-auto px-5 pb-5 space-y-2.5">
        {alertes.map((alerte, i) => {
          const cfg = CONFIG_LIGNE[alerte.type] ?? CONFIG_DEFAUT;
          const cliquable = Boolean(alerte.lien);
          return (
            <div
              key={i}
              onClick={() => cliquable && navigate(alerte.lien)}
              className={`p-3 rounded-r-lg border-l-4 ${cliquable ? "cursor-pointer hover:brightness-[0.98]" : ""}`}
              style={{ borderColor: cfg.couleur, backgroundColor: cfg.bg }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: cfg.couleur }}>
                  {cfg.tag}
                </span>
              </div>
              <p className={`text-xs leading-snug text-[#1E293B] ${cfg.gras ? "font-semibold" : ""}`}>
                {alerte.libelle}
              </p>
              {alerte.detail && (
                <p className="text-xs text-[#64748B] mt-0.5">{alerte.detail}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertesATraiter;
