import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, AlertTriangle } from "lucide-react";
import api from "../../api/axios";

// Mêmes gravités que le garde-fou backend (actionService.createAction) : au
// delà, une analyse doit au moins être initialisée avant l'action corrective.
const GRAVITES_ANALYSE_REQUISE = ["GRAVE", "CRITIQUE"];

// Aperçu affiché sur la page détail de l'incident — renvoie vers la page
// pleine page /incidents/:id/analyse. Volontairement sans cadre englobant :
// seul l'état "analyse requise" (incident grave/critique sans analyse) a un
// encart rouge, pour que ce cas précis saute aux yeux.
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

  const analyseRequise   = GRAVITES_ANALYSE_REQUISE.includes(incident.gravite);
  const analyseManquante = analyseRequise && !analyse;
  const couleurEtat      = analyse?.valideLe ? "#2E7D32" : "#EA580C";

  return (
    <div>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy mb-3">
        <Search size={15} color="#0D2B4E" strokeWidth={2} />
        Analyse des causes
      </h2>

      {chargement ? (
        <p className="text-xs text-[#64748B]">Chargement…</p>
      ) : analyseManquante ? (
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-red-50 border border-red-200">
          <AlertTriangle size={15} color="#DC2626" className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-[#991B1B] mb-2">
              Incident {incident.gravite === "CRITIQUE" ? "critique" : "grave"} : une analyse des causes est requise
              avant de créer une action corrective.
            </p>
            {peutGerer && (
              <button type="button" onClick={ouvrir}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors"
                style={{ backgroundColor: "#DC2626" }}>
                Lancer l'analyse des causes
              </button>
            )}
          </div>
        </div>
      ) : !analyse ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-[#64748B]">
            Aucune analyse des causes racines n'a encore été réalisée pour cet incident.
          </p>
          {peutGerer && (
            <button type="button" onClick={ouvrir}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors"
              style={{ backgroundColor: "#0D2B4E" }}>
              Lancer l'analyse des causes
            </button>
          )}
        </div>
      ) : (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: couleurEtat }}>
            {analyse.valideLe ? "Analyse validée" : "Analyse en cours"} : cause racine
          </p>
          <p className="text-sm text-[#1E293B] mb-2 break-words">
            {analyse.causeRacine || "Cause racine non encore renseignée."}
          </p>
          <button type="button" onClick={ouvrir}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0D2B4E] hover:underline transition-colors">
            Ouvrir l'analyse des causes <ArrowRight size={13} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );
}

export default AnalyseCausesApercu;
