import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import api from "../../api/axios";

// Carte aperçu affichée sur la page détail de l'incident — renvoie vers la
// page pleine page /incidents/:id/analyse pour le détail de l'analyse.
function AnalyseCausesApercu({ incident, peutGerer }) {
  const navigate = useNavigate();
  const [analyse, setAnalyse] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    api.get(`/incidents/${incident.id}/analyse`)
      .then((res) => setAnalyse(res.data.data))
      .catch(() => setAnalyse(null))
      .finally(() => setChargement(false));
  }, [incident.id]);

  const ouvrir = () => navigate(`/incidents/${incident.id}/analyse`);

  // Couleur du panneau selon l'état réel de l'analyse — neutre tant qu'aucune
  // analyse n'existe, orange pendant qu'elle est en cours, vert seulement une
  // fois validée (au lieu d'un vert fixe qui ne reflétait pas l'état).
  const etat = !analyse ? "absente" : analyse.valideLe ? "validee" : "encours";
  const STYLES = {
    absente:  { bg: "#F8FAFC", border: "#E2E8F0", accent: "#64748B", accentBg: "#F1F5F9" },
    encours:  { bg: "#FFF7ED", border: "#EA580C", accent: "#9A3412", accentBg: "#FED7AA" },
    validee:  { bg: "#EAF3EC", border: "#2E7D32", accent: "#166534", accentBg: "#BBF7D0" },
  }[etat];

  return (
    <div className="rounded-lg overflow-hidden h-full flex flex-col"
      style={{ backgroundColor: STYLES.bg, border: `1px solid ${STYLES.border}` }}>
      <div className="flex items-center gap-2.5 px-5 pt-4">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${STYLES.accent}1A` }}>
          <Search size={15} color={STYLES.accent} strokeWidth={2} />
        </span>
        <h2 className="text-lg font-semibold text-navy">Analyse des causes</h2>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {chargement ? (
          <p className="text-xs text-[#64748B]">Chargement…</p>
        ) : !analyse ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-2">
            <p className="text-xs text-[#64748B]">
              Aucune analyse des causes racines n'a encore été réalisée pour cet incident.
            </p>
            {peutGerer && (
              <button type="button" onClick={ouvrir}
                className="px-4 py-2 text-sm font-semibold text-white rounded-md transition-colors"
                style={{ backgroundColor: "#0D2B4E" }}>
                Lancer l'analyse des causes
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: STYLES.accent }}>
              Cause racine
            </p>
            <p className="text-sm text-[#1E293B] flex-1">
              {analyse.causeRacine || "Cause racine non encore renseignée."}
            </p>
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${STYLES.accentBg}` }}>
              <span className="text-xs font-medium" style={{ color: STYLES.accent }}>
                {analyse.valideLe ? "Analyse validée" : "Analyse en cours"}
              </span>
              <button type="button" onClick={ouvrir}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors"
                style={{ backgroundColor: "#0D2B4E" }}>
                Ouvrir l'analyse des causes <ArrowRight size={13} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyseCausesApercu;
