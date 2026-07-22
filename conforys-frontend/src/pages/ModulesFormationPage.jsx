import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, ShieldCheck, Zap, Trash2, HeartPulse, Mountain, GraduationCap, BookOpen } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";

// ── Thèmes de formation — même palette que les sessions présentielles ──────
const THEMES = {
  INCENDIE:            { label: "Incendie",             Icone: Flame },
  EPI:                 { label: "EPI",                  Icone: ShieldCheck },
  RISQUES_ELECTRIQUES: { label: "Risques électriques",  Icone: Zap },
  DECHETS:             { label: "Déchets",               Icone: Trash2 },
  PREMIERS_SECOURS:    { label: "Premiers secours",     Icone: HeartPulse },
  TRAVAIL_HAUTEUR:     { label: "Travail en hauteur",   Icone: Mountain },
};

// ── Badge de progression — Non commencé (gris) / En cours (navy) / Validé (vert) ──
function BadgeProgression({ progression, nombreLecons }) {
  if (progression.valide) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
        Validé
      </span>
    );
  }
  if (progression.leconsCompletees === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
        Non commencé
      </span>
    );
  }
  const pourcentage = nombreLecons > 0 ? Math.round((progression.leconsCompletees / nombreLecons) * 100) : 0;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(13,43,78,0.06)", color: "#0D2B4E" }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#0D2B4E" }} />
      En cours {pourcentage}%
    </span>
  );
}

function CarteModule({ module, onOuvrir }) {
  const theme = THEMES[module.theme];
  const Icone = theme?.Icone ?? BookOpen;

  return (
    <button onClick={() => onOuvrir(module.id)}
      className="text-left p-5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#F8FAFC" }}>
          <Icone size={20} color="#0D2B4E" strokeWidth={1.6} />
        </div>
        <BadgeProgression progression={module.progression} nombreLecons={module.nombreLecons} />
      </div>
      <p className="text-sm font-semibold text-[#1E293B]">{module.titre}</p>
      {theme && <p className="text-xs text-[#94A3B8] mt-0.5">{theme.label}</p>}
      {module.description && <p className="text-xs text-[#64748B] mt-2 line-clamp-2">{module.description}</p>}
      <p className="text-xs text-[#94A3B8] mt-3 pt-3 border-t border-[#F1F5F9]">
        {module.nombreLecons} leçon{module.nombreLecons !== 1 ? "s" : ""} · Score requis {module.scoreMinimum}%
      </p>
    </button>
  );
}

function ModulesFormationPage() {
  const navigate = useNavigate();
  const [modules,    setModules]    = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    document.title = "CONFORYS — Formations en ligne";
    return () => { document.title = "CONFORYS"; };
  }, []);

  useEffect(() => {
    api.get("/modules")
      .then((r) => setModules(r.data.data || []))
      .catch((e) => console.error("Erreur chargement modules:", e))
      .finally(() => setChargement(false));
  }, []);

  return (
    <AppLayout titre="Formations en ligne">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-navy">Formations en ligne</h1>
        <p className="text-xs text-[#94A3B8] mt-0.5">
          Tableau de bord <span className="mx-1">›</span> Formations en ligne
        </p>
      </div>

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : modules.length === 0 ? (
        <div className="p-12 text-center text-[#94A3B8] bg-white border border-[#E2E8F0] rounded-lg">
          <GraduationCap size={28} color="#94A3B8" strokeWidth={1.4} className="mx-auto mb-2" />
          Aucun module de formation en ligne disponible.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <CarteModule key={m.id} module={m} onOuvrir={(id) => navigate(`/formations-en-ligne/${id}`)} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

export default ModulesFormationPage;
