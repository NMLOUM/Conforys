import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, CheckCircle2, Circle } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";

function LigneLecon({ lecon, statut, selectionnee, onSelectionner }) {
  const config = {
    complete: { Icone: CheckCircle2, couleur: "#2E7D32" },
    active:   { Icone: Circle,       couleur: "#0D2B4E" },
    verrouillee: { Icone: Lock,      couleur: "#94A3B8" },
  }[statut];

  const cliquable = statut !== "verrouillee";

  return (
    <button
      onClick={() => cliquable && onSelectionner(lecon)}
      disabled={!cliquable}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-md transition-colors ${
        selectionnee ? "bg-navy/5 border border-navy/20" : "border border-transparent"
      } ${cliquable ? "hover:bg-[#F8FAFC] cursor-pointer" : "cursor-not-allowed opacity-60"}`}
    >
      <config.Icone size={17} color={config.couleur} strokeWidth={1.8} className="shrink-0" />
      <span className={`text-sm ${selectionnee ? "font-semibold text-navy" : "text-[#1E293B]"}`}>
        {lecon.ordre}. {lecon.titre}
      </span>
    </button>
  );
}

function ModuleFormationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [module,      setModule]      = useState(null);
  const [chargement,  setChargement]  = useState(true);
  const [leconSelectionneeId, setLeconSelectionneeId] = useState(null);
  const [completionEnCours, setCompletionEnCours] = useState(false);

  useEffect(() => {
    document.title = "CONFORYS — Module de formation";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get(`/modules/${id}`);
      const data = res.data.data;
      setModule(data);
      setLeconSelectionneeId((actuelle) => {
        if (actuelle && data.lecons.some((l) => l.id === actuelle)) return actuelle;
        // Sélectionne par défaut la prochaine leçon à faire (ou la dernière si tout est fini)
        const prochaine = data.lecons.find((l) => l.ordre === data.progression.leconsCompletees + 1);
        return (prochaine ?? data.lecons[data.lecons.length - 1])?.id ?? null;
      });
    } catch (e) {
      console.error("Erreur chargement module:", e);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, [id]);

  const statutLecon = (lecon) => {
    if (!module) return "verrouillee";
    if (lecon.ordre <= module.progression.leconsCompletees) return "complete";
    if (lecon.ordre === module.progression.leconsCompletees + 1) return "active";
    return "verrouillee";
  };

  const marquerTerminee = async (leconId) => {
    setCompletionEnCours(true);
    try {
      const res = await api.put(`/modules/${id}/lecons/${leconId}/completer`);
      setModule((m) => ({ ...m, progression: { ...m.progression, leconsCompletees: res.data.data.leconsCompletees } }));
      toast.success("Leçon marquée comme terminée");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setCompletionEnCours(false);
    }
  };

  if (chargement) {
    return <AppLayout titre="Module de formation"><p className="text-sm text-[#64748B]">Chargement...</p></AppLayout>;
  }
  if (!module) {
    return <AppLayout titre="Module de formation"><p className="text-sm text-[#94A3B8]">Module introuvable.</p></AppLayout>;
  }

  const leconSelectionnee = module.lecons.find((l) => l.id === leconSelectionneeId);
  const statutSelectionnee = leconSelectionnee ? statutLecon(leconSelectionnee) : null;
  const toutesLeconsCompletees = module.progression.leconsCompletees >= module.lecons.length;

  return (
    <AppLayout titre="Module de formation">
      <div className="mb-5">
        <Link to="/formations-en-ligne" className="text-xs text-[#64748B] hover:text-navy transition-colors">
          ← Retour aux formations en ligne
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <h1 className="text-lg font-semibold text-navy">{module.titre}</h1>
          {module.progression.valide && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              Validé · {module.progression.scoreQuiz}%
            </span>
          )}
        </div>
        {module.description && <p className="text-sm text-[#475569] mt-1">{module.description}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Colonne gauche — leçons ── */}
        <div className="space-y-3">
          <div className="p-3 border border-[#E2E8F0] rounded-lg bg-white space-y-1">
            {module.lecons.map((lecon) => (
              <LigneLecon
                key={lecon.id}
                lecon={lecon}
                statut={statutLecon(lecon)}
                selectionnee={lecon.id === leconSelectionneeId}
                onSelectionner={(l) => setLeconSelectionneeId(l.id)}
              />
            ))}
          </div>

          {toutesLeconsCompletees && (
            <button
              onClick={() => navigate(`/formations-en-ligne/${id}/quiz`)}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors"
            >
              {module.progression.valide ? "Repasser le quiz de validation" : "Passer le quiz de validation"}
            </button>
          )}
        </div>

        {/* ── Colonne droite — contenu de la leçon ── */}
        <div className="lg:col-span-2 p-6 border border-[#E2E8F0] rounded-lg bg-white">
          {!leconSelectionnee ? (
            <p className="text-sm text-[#94A3B8]">Sélectionnez une leçon.</p>
          ) : (
            <>
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">
                Leçon {leconSelectionnee.ordre}/{module.lecons.length}
              </p>
              <h2 className="text-base font-semibold text-[#1E293B] mb-4">{leconSelectionnee.titre}</h2>
              <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-line">{leconSelectionnee.contenu}</p>

              <div className="mt-6 pt-4 border-t border-[#F1F5F9]">
                {statutSelectionnee === "complete" ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2E7D32]">
                    <CheckCircle2 size={16} strokeWidth={1.8} /> Leçon terminée
                  </span>
                ) : statutSelectionnee === "active" ? (
                  <button
                    onClick={() => marquerTerminee(leconSelectionnee.id)}
                    disabled={completionEnCours}
                    className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-[#2E7D32] hover:bg-[#2E7D32]/90 disabled:opacity-50 transition-colors"
                  >
                    {completionEnCours ? "Enregistrement..." : "Marquer comme terminée"}
                  </button>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic">Terminez d'abord les leçons précédentes.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default ModuleFormationDetailPage;
