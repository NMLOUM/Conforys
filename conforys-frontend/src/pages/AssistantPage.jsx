import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { Sparkles, Send } from "lucide-react";
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
        className={`max-w-[70%] px-4 py-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
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
  const finDesMessages = useRef(null);

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

  return (
    <AppLayout titre="Assistant IA">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-navy">Assistant IA</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Posez vos questions sur la situation QHSE de votre entreprise — incidents, audits, DUERP, actions correctives.
        </p>
      </div>

      <div className="flex flex-col bg-white border border-[#E2E8F0] rounded-lg" style={{ height: "65vh" }}>
        {/* ── Zone de messages ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: "#0D2B4E" }}>
                <Sparkles size={20} color="white" strokeWidth={2} />
              </div>
              <p className="text-sm font-medium text-[#1E293B] mb-1">Bonjour, je suis votre assistant QHSE</p>
              <p className="text-xs text-[#94A3B8] max-w-sm">
                Exemple : « Combien d'incidents graves ce mois-ci ? » ou « Quel est le taux de conformité des audits ? »
              </p>
            </div>
          ) : (
            messages.map((m, i) => <Bulle key={i} role={m.role} contenu={m.contenu} />)
          )}
          {chargement && <IndicateurFrappe />}
          <div ref={finDesMessages} />
        </div>

        {/* ── Champ de saisie ── */}
        <form onSubmit={envoyer} className="flex items-center gap-2 p-3 border-t border-[#E2E8F0]">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={chargement}
            placeholder="Posez votre question…"
            className="flex-1 px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={chargement || !question.trim()}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-md text-white bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors"
          >
            <Send size={16} strokeWidth={2.2} />
          </button>
        </form>
      </div>
    </AppLayout>
  );
}

export default AssistantPage;
