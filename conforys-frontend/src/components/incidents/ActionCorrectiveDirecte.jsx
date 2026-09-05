import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ClipboardPlus, AlertTriangle } from "lucide-react";
import api from "../../api/axios";
import ModalGenererAction from "../actions/ModalGenererAction";

// Gravités pour lesquelles une analyse des causes doit au moins avoir été
// initialisée avant de pouvoir créer une action corrective — même règle que
// GRAVITES_ANALYSE_REQUISE côté backend (actionService.createAction).
const GRAVITES_ANALYSE_REQUISE = ["GRAVE", "CRITIQUE"];

// Carte "Action corrective" affichée sur la page détail de l'incident, à côté
// de l'analyse des causes. Pour un incident faible/moyen, la création directe
// est immédiate. Pour un incident grave/critique, elle reste bloquée tant
// qu'aucune analyse des causes n'a été initialisée pour cet incident.
function ActionCorrectiveDirecte({ incident, peutGerer }) {
  const navigate = useNavigate();
  const [analyse,    setAnalyse]    = useState(null);
  const [chargement, setChargement] = useState(true);
  const [users,      setUsers]      = useState([]);
  const [showModal,  setShowModal]  = useState(false);

  useEffect(() => {
    api.get(`/incidents/${incident.id}/analyse`)
      .then((res) => setAnalyse(res.data.data))
      .catch(() => setAnalyse(null))
      .finally(() => setChargement(false));
  }, [incident.id]);

  useEffect(() => {
    if (peutGerer) api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
  }, [peutGerer]);

  if (!peutGerer) return null;

  const analyseRequise   = GRAVITES_ANALYSE_REQUISE.includes(incident.gravite);
  const analyseManquante = analyseRequise && !analyse;

  const confirmer = async (payload) => {
    const res = await api.post(`/incidents/${incident.id}/actions`, payload);
    toast.success("Action corrective créée");
    setShowModal(false);
    navigate(`/actions/${res.data.data.id}`);
  };

  return (
    <div>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy mb-3">
        <ClipboardPlus size={15} color="#0D2B4E" strokeWidth={2} />
        Action corrective
      </h2>

      {chargement ? (
        <p className="text-xs text-[#64748B]">Chargement…</p>
      ) : analyseManquante ? (
        <p className="flex items-start gap-2 text-xs" style={{ color: "#9A3412" }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          Incident {incident.gravite === "CRITIQUE" ? "critique" : "grave"} : une analyse des causes est requise avant
          de créer une action corrective.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-[#64748B]">
            {analyseRequise
              ? "L'analyse des causes a été initialisée : vous pouvez créer une action corrective directement, ou depuis la cause racine identifiée."
              : "Cause évidente pour un incident de cette gravité : vous pouvez créer une action corrective directement."}
          </p>
          <button type="button" onClick={() => setShowModal(true)}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors"
            style={{ backgroundColor: "#0D2B4E" }}>
            Ajouter une action corrective
          </button>
        </div>
      )}

      {showModal && (
        <ModalGenererAction
          titre="Nouvelle action corrective"
          contexte={`Incident : ${incident.numeroReference}`}
          users={users}
          onClose={() => setShowModal(false)}
          onConfirm={confirmer}
        />
      )}
    </div>
  );
}

export default ActionCorrectiveDirecte;
