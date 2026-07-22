import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";

function QuizFormationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [module,     setModule]     = useState(null);
  const [chargement, setChargement] = useState(true);
  const [reponses,   setReponses]   = useState({}); // { [questionId]: reponseId }
  const [resultat,   setResultat]   = useState(null); // { scoreQuiz, valide }
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    document.title = "CONFORYS — Quiz de validation";
    return () => { document.title = "CONFORYS"; };
  }, []);

  useEffect(() => {
    api.get(`/modules/${id}`)
      .then((r) => setModule(r.data.data))
      .catch((e) => console.error("Erreur chargement module:", e))
      .finally(() => setChargement(false));
  }, [id]);

  const choisirReponse = (questionId, reponseId) => {
    setReponses((r) => ({ ...r, [questionId]: reponseId }));
  };

  const soumettre = async () => {
    setEnvoiEnCours(true);
    try {
      const payload = { reponses: Object.entries(reponses).map(([questionId, reponseId]) => ({ questionId, reponseId })) };
      const res = await api.post(`/modules/${id}/quiz/soumettre`, payload);
      setResultat(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la soumission du quiz.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const reessayer = () => {
    setReponses({});
    setResultat(null);
  };

  if (chargement) {
    return <AppLayout titre="Quiz de validation"><p className="text-sm text-[#64748B]">Chargement...</p></AppLayout>;
  }
  if (!module) {
    return <AppLayout titre="Quiz de validation"><p className="text-sm text-[#94A3B8]">Module introuvable.</p></AppLayout>;
  }

  const accesAutorise = module.progression.leconsCompletees >= module.lecons.length;
  const toutesReponses = module.questions.length > 0 && module.questions.every((q) => reponses[q.id]);

  return (
    <AppLayout titre="Quiz de validation">
      <div className="mb-5">
        <Link to={`/formations-en-ligne/${id}`} className="text-xs text-[#64748B] hover:text-navy transition-colors">
          ← Retour au module
        </Link>
        <h1 className="text-lg font-semibold text-navy mt-2">Quiz de validation — {module.titre}</h1>
        <p className="text-xs text-[#94A3B8] mt-1">Score minimum requis : {module.scoreMinimum}%</p>
      </div>

      {!accesAutorise ? (
        <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-sm text-[#475569]">Terminez d'abord toutes les leçons du module pour accéder au quiz.</p>
          <Link to={`/formations-en-ligne/${id}`} className="inline-block mt-3 text-sm font-semibold text-navy hover:underline">
            Retourner aux leçons
          </Link>
        </div>
      ) : resultat ? (
        <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          {resultat.valide ? (
            <>
              <CheckCircle2 size={40} color="#2E7D32" strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-2xl font-bold" style={{ color: "#2E7D32" }}>{resultat.scoreQuiz}%</p>
              <p className="text-sm font-semibold text-[#2E7D32] mt-1">Quiz validé — félicitations !</p>
            </>
          ) : (
            <>
              <XCircle size={40} color="#EA580C" strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-2xl font-bold" style={{ color: "#EA580C" }}>{resultat.scoreQuiz}%</p>
              <p className="text-sm font-semibold mt-1" style={{ color: "#EA580C" }}>
                Score insuffisant (minimum {module.scoreMinimum}%) — réessayez
              </p>
            </>
          )}
          <div className="flex items-center justify-center gap-3 mt-5">
            {!resultat.valide && (
              <button onClick={reessayer}
                className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors">
                Réessayer
              </button>
            )}
            <button onClick={() => navigate(`/formations-en-ligne/${id}`)}
              className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
              Retour au module
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {module.questions.map((question, i) => (
            <div key={question.id} className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
              <p className="text-sm font-semibold text-[#1E293B] mb-3">{i + 1}. {question.enonce}</p>
              <div className="space-y-2">
                {question.reponses.map((reponse) => {
                  const selectionnee = reponses[question.id] === reponse.id;
                  return (
                    <button
                      key={reponse.id}
                      onClick={() => choisirReponse(question.id, reponse.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm rounded-md border transition-colors ${
                        selectionnee ? "border-navy bg-navy/5 text-navy font-medium" : "border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selectionnee ? "border-navy" : "border-[#CBD5E1]"}`}>
                        {selectionnee && <span className="w-2 h-2 rounded-full bg-navy" />}
                      </span>
                      {reponse.texte}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={soumettre}
            disabled={!toutesReponses || envoiEnCours}
            className="w-full px-4 py-2.5 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {envoiEnCours ? "Envoi..." : "Valider mes réponses"}
          </button>
        </div>
      )}
    </AppLayout>
  );
}

export default QuizFormationPage;
