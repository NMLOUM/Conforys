import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Users, Wrench, ClipboardList, Building2, Package, Plus, X, CheckCircle2 } from "lucide-react";
import api from "../../api/axios";

const LABELS_TYPE = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presqu'accident",
  SITUATION_DANGEREUSE:     "Situation dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Incident environnemental",
};

// Référentiel des 5 branches du diagramme d'Ishikawa
const CATEGORIES_5M = {
  MAIN_OEUVRE: { label: "Main-d'œuvre", icon: Users },
  MATERIEL:    { label: "Matériel",     icon: Wrench },
  METHODE:     { label: "Méthode",      icon: ClipboardList },
  MILIEU:      { label: "Milieu",       icon: Building2 },
  MATIERE:     { label: "Matière",      icon: Package },
};

const QUESTIONS_DEFAUT = [
  "Pourquoi ce problème est-il survenu ?",
  "Pourquoi cela ?",
  "Pourquoi cela ?",
  "Pourquoi cela ?",
  "Pourquoi cela ?",
];

// ── Une carte Ishikawa (une des 5 branches) ──────────────────────────────────
function CarteIshikawa({ categorie, causes, peutGerer, onToggle, onAjouter, onSupprimer }) {
  const [nouveau, setNouveau] = useState("");
  const config = CATEGORIES_5M[categorie];
  const Icon = config.icon;

  const ajouter = () => {
    if (!nouveau.trim()) return;
    onAjouter(categorie, nouveau.trim());
    setNouveau("");
  };

  return (
    <div className="p-4 bg-white border border-[#E2E8F0] rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} color="#0D2B4E" strokeWidth={2} className="shrink-0" />
        <p className="text-sm font-semibold text-[#0D2B4E]">{config.label}</p>
      </div>
      <div className="space-y-1.5 mb-3 min-h-[32px]">
        {causes.length === 0 ? (
          <p className="text-xs text-[#94A3B8] italic">Aucune cause identifiée.</p>
        ) : (
          causes.map((c, i) => (
            <label key={c.id ?? `nouvelle-${i}`}
              className={`flex items-start gap-2 p-2 rounded-md transition-colors ${c.retenue ? "bg-[#F0FDF4]" : "hover:bg-[#F8FAFC]"} ${peutGerer ? "cursor-pointer" : ""}`}>
              <input type="checkbox" checked={Boolean(c.retenue)} disabled={!peutGerer}
                onChange={() => onToggle(c)}
                className="mt-0.5 accent-[#2E7D32]" />
              <span className={`text-xs flex-1 ${c.retenue ? "text-[#166534] font-medium" : "text-[#475569]"}`}>{c.libelle}</span>
              {peutGerer && (
                <button type="button" onClick={() => onSupprimer(c)}
                  className="shrink-0 text-[#CBD5E1] hover:text-[#DC2626] transition-colors">
                  <X size={12} />
                </button>
              )}
            </label>
          ))
        )}
      </div>
      {peutGerer && (
        <div className="flex items-center gap-1.5">
          <input value={nouveau} onChange={(e) => setNouveau(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouter()}
            placeholder="Ajouter une cause…"
            className="flex-1 px-2 py-1.5 text-xs border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition" />
          <button type="button" onClick={ajouter}
            className="shrink-0 p-1.5 rounded-md text-[#0D2B4E] hover:bg-[#F1F5F9] transition-colors">
            <Plus size={14} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Composant principal — contenu complet de l'analyse (pleine page) ────────
// Utilisé exclusivement par AnalyseCausesPage (route /incidents/:id/analyse).
// N'affiche ni accordéon ni titre propre : la page hôte fournit l'en-tête,
// le fil d'ariane et le "retour". Les deux actions de conclusion (valider,
// générer l'action corrective) vivent dans l'encart Conclusion, pas ailleurs.
function AnalyseCausesRacines({ incident, peutGerer, onActionCreee }) {
  const [analyse,     setAnalyse]     = useState(null);
  const [chargement,  setChargement]  = useState(true);
  const [causes,      setCauses]      = useState([]);
  const [etapesLocal, setEtapesLocal] = useState([]);
  const [causeRacine, setCauseRacine] = useState("");

  const [initEnCours,       setInitEnCours]       = useState(false);
  const [sauvegarde,        setSauvegarde]        = useState(false);
  const [validationEnCours, setValidationEnCours] = useState(false);
  const [genererEnCours,    setGenererEnCours]    = useState(false);

  const appliquer = (data) => {
    setAnalyse(data);
    setCauses(data?.causesIshikawa || []);
    setEtapesLocal(data?.etapesPourquoi || []);
    setCauseRacine(data?.causeRacine || "");
  };

  const charger = async () => {
    try {
      const res = await api.get(`/incidents/${incident.id}/analyse`);
      appliquer(res.data.data);
    } catch (e) {
      console.error("Erreur chargement analyse des causes:", e);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, [incident.id]);

  const initialiser = async () => {
    setInitEnCours(true);
    try {
      const res = await api.post(`/incidents/${incident.id}/analyse`);
      appliquer(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'initialisation de l'analyse.");
    } finally {
      setInitEnCours(false);
    }
  };

  // Enregistre l'ensemble des causes Ishikawa (remplacement complet, cohérent
  // avec la sémantique PUT du backend) — appelé après chaque interaction
  // (cocher, ajouter, supprimer) pour une sauvegarde immédiate.
  const sauvegarderCauses = async (nouvelles) => {
    setCauses(nouvelles);
    setSauvegarde(true);
    try {
      const res = await api.put(`/incidents/${incident.id}/analyse`, {
        causesIshikawa: nouvelles.map(({ categorie, libelle, retenue }) => ({ categorie, libelle, retenue: Boolean(retenue) })),
      });
      appliquer(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de la cause.");
      charger();
    } finally {
      setSauvegarde(false);
    }
  };

  const toggleCause    = (item) => sauvegarderCauses(causes.map((c) => (c === item ? { ...c, retenue: !c.retenue } : c)));
  const supprimerCause = (item) => sauvegarderCauses(causes.filter((c) => c !== item));
  const ajouterCause   = (categorie, libelle) => sauvegarderCauses([...causes, { categorie, libelle, retenue: false }]);

  // Les 5 Pourquoi : seules les étapes déjà répondues sont persistées — une
  // étape ajoutée mais pas encore répondue reste locale tant qu'elle est vide.
  const sauvegarderEtapes = async (nouvellesLocal) => {
    setEtapesLocal(nouvellesLocal);
    const aEnregistrer = nouvellesLocal
      .filter((e) => e.reponse.trim() !== "")
      .map((e, i) => ({ ordre: i + 1, question: e.question, reponse: e.reponse }));
    setSauvegarde(true);
    try {
      const res = await api.put(`/incidents/${incident.id}/analyse`, { etapesPourquoi: aEnregistrer });
      setAnalyse(res.data.data);
      // On garde l'état local tel quel (y compris l'étape en cours de saisie,
      // pas encore répondue) plutôt que d'écraser avec la réponse serveur qui
      // ne contient que les étapes déjà validées.
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de l'étape.");
    } finally {
      setSauvegarde(false);
    }
  };

  const ajouterEtape = () => {
    if (etapesLocal.length >= 5) return;
    setEtapesLocal([...etapesLocal, {
      ordre: etapesLocal.length + 1,
      question: QUESTIONS_DEFAUT[etapesLocal.length] || "Pourquoi ?",
      reponse: "",
    }]);
  };

  const modifierEtape = (index, champ, valeur) => {
    setEtapesLocal((prev) => prev.map((e, i) => (i === index ? { ...e, [champ]: valeur } : e)));
  };

  const supprimerDerniereEtape = () => sauvegarderEtapes(etapesLocal.slice(0, -1));

  const sauvegarderCauseRacine = async () => {
    setSauvegarde(true);
    try {
      const res = await api.put(`/incidents/${incident.id}/analyse`, { causeRacine: causeRacine || null });
      setAnalyse(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de la cause racine.");
    } finally {
      setSauvegarde(false);
    }
  };

  const validerAnalyse = async () => {
    setValidationEnCours(true);
    try {
      const res = await api.put(`/incidents/${incident.id}/analyse`, { valider: true });
      appliquer(res.data.data);
      toast.success("Analyse validée");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la validation.");
    } finally {
      setValidationEnCours(false);
    }
  };

  const genererAction = async () => {
    setGenererEnCours(true);
    try {
      await api.post(`/incidents/${incident.id}/analyse/action`);
      toast.success("Action corrective créée depuis la cause racine");
      await charger();
      onActionCreee?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la création de l'action corrective.");
    } finally {
      setGenererEnCours(false);
    }
  };

  if (chargement) {
    return <p className="text-sm text-[#64748B]">Chargement de l'analyse…</p>;
  }

  // ── Analyse non encore lancée ──
  if (!analyse) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-8 text-center">
        <p className="text-sm text-[#64748B] mb-3">
          Aucune analyse des causes racines n'a encore été réalisée pour cet incident.
        </p>
        {peutGerer && (
          <button type="button" onClick={initialiser} disabled={initEnCours}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#0D2B4E" }}>
            {initEnCours ? "Initialisation…" : "Lancer l'analyse des causes racines"}
          </button>
        )}
      </div>
    );
  }

  const dateIncident = incident.dateIncident
    ? new Date(incident.dateIncident).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : "—";
  const derniereEtapeIndex = etapesLocal.length - 1;

  return (
    <div>
      {/* ── Bandeau effet ── */}
      <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-red-50 border border-red-200"
        style={{ borderLeft: "4px solid #DC2626" }}>
        <AlertTriangle size={18} color="#DC2626" strokeWidth={2} className="shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#DC2626" }}>L'effet / problème</p>
          <p className="text-sm font-medium text-[#1E293B] mt-0.5">
            {LABELS_TYPE[incident.type] ?? incident.type} — {incident.description}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {dateIncident}{incident.site?.nom ? ` · ${incident.site.nom}` : ""}{incident.adresseLisible ? ` · ${incident.adresseLisible}` : ""}
          </p>
        </div>
      </div>

      {/* ── Diagramme d'Ishikawa (5M) ── */}
      <p className="text-sm font-semibold text-[#1E293B] mb-3">Diagramme d'Ishikawa (5M)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-7">
        {Object.keys(CATEGORIES_5M).map((cle) => (
          <CarteIshikawa
            key={cle}
            categorie={cle}
            causes={causes.filter((c) => c.categorie === cle)}
            peutGerer={peutGerer}
            onToggle={toggleCause}
            onAjouter={ajouterCause}
            onSupprimer={supprimerCause}
          />
        ))}
      </div>

      {/* ── 5 Pourquoi ── */}
      <p className="text-sm font-semibold text-[#1E293B] mb-3">Analyse des 5 Pourquoi</p>
      <div className="space-y-0 mb-7 max-w-2xl">
        {etapesLocal.length === 0 && (
          <p className="text-xs text-[#94A3B8] italic mb-3">Aucune étape renseignée pour le moment.</p>
        )}
        {etapesLocal.map((etape, i) => {
          const estDerniere = i === derniereEtapeIndex && etape.reponse.trim() !== "";
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: estDerniere ? "#2E7D32" : "#0D2B4E" }}>
                  {i + 1}
                </div>
                {i < etapesLocal.length - 1 && <div className="w-px flex-1 bg-[#E2E8F0] my-1" style={{ minHeight: 16 }} />}
              </div>
              <div className={`flex-1 p-3.5 mb-3 rounded-lg border ${estDerniere ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-white border-[#E2E8F0]"}`}>
                {peutGerer ? (
                  <input value={etape.question} onChange={(e) => modifierEtape(i, "question", e.target.value)}
                    onBlur={() => sauvegarderEtapes(etapesLocal)}
                    className="w-full text-sm font-semibold text-[#1E293B] bg-transparent border-none p-0 mb-1.5 focus:outline-none focus:ring-0" />
                ) : (
                  <p className="text-sm font-semibold text-[#1E293B] mb-1.5">{etape.question}</p>
                )}
                {peutGerer ? (
                  <textarea value={etape.reponse} onChange={(e) => modifierEtape(i, "reponse", e.target.value)}
                    onBlur={() => sauvegarderEtapes(etapesLocal)}
                    rows={2} placeholder="Réponse…"
                    className="w-full text-sm text-[#475569] bg-transparent border-none p-0 resize-none focus:outline-none focus:ring-0" />
                ) : (
                  <p className="text-sm text-[#475569]">{etape.reponse || "—"}</p>
                )}
                {estDerniere && (
                  <p className="text-[10px] font-semibold uppercase tracking-wide mt-1.5" style={{ color: "#2E7D32" }}>
                    Cause profonde
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {peutGerer && (
        <div className="flex items-center gap-3 mb-8 -mt-4">
          {etapesLocal.length < 5 && (
            <button type="button" onClick={ajouterEtape}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors"
              style={{ borderColor: "#0D2B4E", color: "#0D2B4E" }}>
              <Plus size={13} strokeWidth={2.2} /> Ajouter une étape
            </button>
          )}
          {etapesLocal.length > 0 && (
            <button type="button" onClick={supprimerDerniereEtape}
              className="text-xs text-[#94A3B8] hover:text-[#DC2626] transition-colors">
              Retirer la dernière étape
            </button>
          )}
        </div>
      )}

      {/* ── Conclusion ── */}
      <p className="text-sm font-semibold text-[#1E293B] mb-3">Conclusion de l'analyse</p>
      <div className="p-5 rounded-lg max-w-2xl" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <label className="block mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#166534" }}>
          Cause racine retenue
        </label>
        {peutGerer ? (
          <textarea value={causeRacine} onChange={(e) => setCauseRacine(e.target.value)}
            onBlur={sauvegarderCauseRacine} rows={3}
            placeholder="Formulez la cause racine identifiée à l'issue de l'analyse…"
            className="w-full px-3 py-2 text-sm border rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 transition resize-none"
            style={{ borderColor: "#BBF7D0" }} />
        ) : (
          <p className="text-sm text-[#1E293B]">{causeRacine || "Non renseignée."}</p>
        )}
        <div className="mt-3 pt-3 flex items-center justify-between text-xs" style={{ borderTop: "1px solid #BBF7D0" }}>
          <span style={{ color: "#166534" }}>
            Analyste : <span className="font-medium">{analyse.auteur ? `${analyse.auteur.prenom} ${analyse.auteur.nom}` : "—"}</span>
          </span>
          <span style={{ color: "#166534" }}>
            {analyse.valideLe
              ? `Validée le ${new Date(analyse.valideLe).toLocaleDateString("fr-FR")}`
              : "Non validée"}
          </span>
        </div>

        {peutGerer && (
          <div className="mt-4 pt-4 flex items-center gap-2" style={{ borderTop: "1px solid #BBF7D0" }}>
            <button type="button" onClick={genererAction} disabled={genererEnCours || !causeRacine.trim() || Boolean(analyse.actionGenereeLe)}
              title={!causeRacine.trim() ? "Renseignez la cause racine avant de créer une action" : ""}
              className="px-4 py-2 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
              style={{ backgroundColor: "#0D2B4E" }}>
              {analyse.actionGenereeLe ? "Action déjà créée" : genererEnCours ? "…" : "Créer une action corrective"}
            </button>
            <button type="button" onClick={validerAnalyse} disabled={validationEnCours || Boolean(analyse.valideLe)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md border disabled:opacity-50 transition-colors"
              style={{ borderColor: "#2E7D32", color: "#2E7D32" }}>
              <CheckCircle2 size={15} strokeWidth={2} />
              {analyse.valideLe ? "Analyse validée" : validationEnCours ? "…" : "Valider l'analyse"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyseCausesRacines;
