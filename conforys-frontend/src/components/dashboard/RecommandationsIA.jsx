import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import api from "../../api/axios";

// Panneau proactif : demande à l'assistant IA (même endpoint que la page
// Assistant) ses 3 recommandations prioritaires du moment, basées sur les
// données actuelles de l'entreprise (résumé chiffré, sans donnée nominative —
// voir assistantService.js). Chargé une fois à l'affichage du dashboard ;
// le bouton "Régénérer" permet de relancer l'analyse à la demande plutôt que
// de refaire un appel payant à chaque rafraîchissement de page.
const QUESTION_RECOMMANDATIONS =
  "Donne-moi tes 3 recommandations prioritaires du moment pour améliorer la sécurité, en te basant sur les données actuelles. Réponds uniquement sous forme de 3 puces courtes (une phrase chacune), sans introduction ni conclusion.";

function RecommandationsIA() {
  const [contenu,    setContenu]    = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur,     setErreur]     = useState("");

  const charger = async () => {
    setChargement(true);
    setErreur("");
    try {
      const res = await api.post("/assistant/chat", { question: QUESTION_RECOMMANDATIONS });
      setContenu(res.data.reponse);
    } catch (err) {
      setErreur(err.response?.data?.message || "Impossible de générer les recommandations pour le moment.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0D2B4E" }}>
            <Sparkles size={14} color="white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#1E293B]">Recommandations IA</p>
            <p className="text-xs text-[#94A3B8]">Généré à partir de vos données actuelles</p>
          </div>
        </div>
        <button
          onClick={charger}
          disabled={chargement}
          title="Régénérer"
          className="shrink-0 p-1.5 rounded-md text-[#94A3B8] hover:text-navy hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={chargement ? "animate-spin" : ""} />
        </button>
      </div>

      {chargement ? (
        <p className="text-sm text-[#94A3B8]">Analyse en cours…</p>
      ) : erreur ? (
        <p className="text-sm text-[#DC2626]">{erreur}</p>
      ) : (
        <div className="text-sm text-[#1E293B] whitespace-pre-wrap leading-relaxed">{contenu}</div>
      )}
    </div>
  );
}

export default RecommandationsIA;
