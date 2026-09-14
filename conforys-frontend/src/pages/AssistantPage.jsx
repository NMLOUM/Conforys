import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { BarChart3, RotateCcw, Send, ShieldCheck, Sparkles } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";

// Avatar rond à initiales/icône — même convention que AvatarInitiales
// (composants/ui), simplifié ici pour les deux seuls rôles de la conversation.
function Avatar({ role }) {
  const estAssistant = role === "assistant";
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: estAssistant ? "#0D2B4E" : "#E2E8F0" }}
    >
      {estAssistant
        ? <Sparkles size={15} color="white" strokeWidth={2} />
        : <span className="text-xs font-bold text-[#475569]">Moi</span>}
    </div>
  );
}

function Bulle({ role, contenu }) {
  const estAssistant = role === "assistant";
  return (
    <div className={`flex items-start gap-3 ${estAssistant ? "" : "flex-row-reverse"}`}>
      <Avatar role={role} />
      <div
        className={`max-w-[88%] sm:max-w-[70%] px-4 py-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
          estAssistant ? "bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B]" : "bg-navy text-white"
        }`}
      >
        {contenu}
      </div>
    </div>
  );
}

// Trois points animés — indicateur de chargement pendant l'appel à l'assistant
function IndicateurFrappe() {
  return (
    <div className="flex items-start gap-3">
      <Avatar role="assistant" />
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function AssistantPage() {
  const [messages, setMessages]     = useState([]);
  const [question, setQuestion]     = useState("");
  const [chargement, setChargement] = useState(false);
  const [analyseTendances, setAnalyseTendances] = useState("");
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const finDesMessages = useRef(null);
  const suggestions = [
    "Quels sont les incidents critiques à traiter ?",
    "Quels risques DUERP sont les plus élevés ?",
    "Quelles actions correctives sont en retard ?",
  ];

  useEffect(() => {
    document.title = "Assistant IA";
    return () => { document.title = "CONFORYS"; };
  }, []);

  useEffect(() => {
    finDesMessages.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chargement]);

  const envoyer = async (e) => {
    e.preventDefault();
    const texte = question.trim();
    if (!texte || chargement) return;

    setMessages((m) => [...m, { role: "user", contenu: texte }]);
    setQuestion("");
    setChargement(true);

    try {
      const res = await api.post("/assistant/chat", { question: texte });
      setMessages((m) => [...m, { role: "assistant", contenu: res.data.reponse }]);
    } catch (err) {
      const msg = err.response?.data?.message || "L'assistant est momentanément indisponible. Réessayez plus tard.";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", contenu: `⚠️ ${msg}` }]);
    } finally {
      setChargement(false);
    }
  };

  const choisirSuggestion = (texte) => {
    setQuestion(texte);
  };

  const gererTouche = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      envoyer(e);
    }
  };

  const nouvelleConversation = () => {
    if (chargement) return;
    setMessages([]);
    setQuestion("");
  };

  const analyserTendances = async () => {
    setAnalyseEnCours(true);
    try {
      const res = await api.post("/assistant/chat", {
        question: "Analyse les tendances QHSE de mon entreprise. Compare l'évolution des incidents sur les 12 derniers mois, les scores des audits terminés, les risques DUERP, les actions correctives en retard et la conformité des EPI. Donne une conclusion claire et trois priorités. N'invente aucune donnée.",
      });
      setAnalyseTendances(res.data.reponse || "");
    } catch (err) {
      toast.error(err.response?.data?.message || "Impossible d'analyser les tendances.");
    } finally {
      setAnalyseEnCours(false);
    }
  };

  return (
    <AppLayout titre="Assistant IA">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-navy">Assistant IA</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Posez vos questions sur la situation QHSE de votre entreprise, incidents, audits, DUERP, actions correctives.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
      <div className="flex flex-col bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden" style={{ height: "min(68vh, 720px)", minHeight: "480px" }}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E2E8F0] bg-[#FCFDFE]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-navy shrink-0">
              <Sparkles size={17} color="white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1E293B] truncate">Assistant QHSE</p>
              <p className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <ShieldCheck size={13} className="text-[#2E7D32]" />
                Données de votre entreprise
              </p>
            </div>
          </div>
          <button type="button" onClick={nouvelleConversation} disabled={!messages.length || chargement}
            title="Nouvelle conversation"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#64748B] rounded-md hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <RotateCcw size={14} />
            Nouvelle conversation
          </button>
        </div>

        {/* ── Zone de messages ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-navy shadow-lg shadow-[#0D2B4E]/15">
                <Sparkles size={23} color="white" strokeWidth={2} />
              </div>
              <p className="text-base font-semibold text-[#1E293B] mb-1">Que souhaitez-vous savoir ?</p>
              <p className="text-xs text-[#94A3B8] max-w-sm mb-5">Interrogez vos données QHSE pour obtenir une réponse rapide et contextualisée.</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => choisirSuggestion(suggestion)}
                    className="px-3 py-2 text-xs text-left text-[#475569] bg-white border border-[#E2E8F0] rounded-lg hover:border-[#94A3B8] hover:bg-[#F8FAFC] transition-colors">
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <Bulle key={i} role={m.role} contenu={m.contenu} />)
          )}
          {chargement && <IndicateurFrappe />}
          <div ref={finDesMessages} />
        </div>

        {/* ── Champ de saisie ── */}
        <form onSubmit={envoyer} className="p-3 sm:p-4 border-t border-[#E2E8F0] bg-[#FCFDFE]">
          <div className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={gererTouche}
            disabled={chargement}
            rows={1}
            placeholder="Posez votre question…"
            aria-label="Question à poser à l'assistant QHSE"
            className="flex-1 min-h-11 max-h-32 resize-none px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={chargement || !question.trim()}
            title="Envoyer la question"
            aria-label="Envoyer la question"
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-white bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors"
          >
            <Send size={17} strokeWidth={2.2} />
          </button>
          </div>
          <p className="hidden sm:block mt-2 text-[11px] text-[#94A3B8]">Entrée pour envoyer · Maj + Entrée pour écrire sur plusieurs lignes</p>
        </form>
      </div>

      <aside className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden xl:max-h-[720px]">
        <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-[#E2E8F0] bg-[#FCFDFE]">
          <div className="flex items-center gap-2">
          <BarChart3 size={17} className="text-navy" />
          <div>
            <h2 className="text-sm font-semibold text-[#1E293B]">Analyse des tendances</h2>
            <p className="text-[11px] text-[#94A3B8]">Synthèse QHSE en temps réel</p>
          </div>
          </div>
          <button type="button" onClick={analyserTendances} disabled={analyseEnCours}
            className="px-2.5 py-1.5 text-[11px] font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50">
            {analyseEnCours ? "Analyse…" : analyseTendances ? "Actualiser" : "Analyser"}
          </button>
        </div>
        <div className="max-h-[620px] overflow-y-auto p-4">
          {!analyseTendances && !analyseEnCours ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <BarChart3 size={28} className="text-[#94A3B8] mb-3" />
              <p className="text-xs text-[#64748B]">Lancez une analyse pour voir les tendances de votre entreprise.</p>
            </div>
          ) : analyseEnCours ? (
            <div className="flex items-center gap-2 py-12 justify-center text-xs text-[#64748B]">
              <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
              Analyse des données en cours…
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#1E293B]">{analyseTendances}</p>
          )}
        </div>
      </aside>
      </div>
    </AppLayout>
  );
}

export default AssistantPage;
