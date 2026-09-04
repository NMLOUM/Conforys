import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Search, Filter, MoreVertical, History,
} from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import AvatarInitiales from "../components/ui/AvatarInitiales";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";

// ── Charte du mockup CAPA (partagée avec ActionDetailPage) ──────────────────
const C = {
  primary:          "#0D2B4E",
  primaryContainer: "#1a2b4b",
  secondary:        "#974900",
  secondaryContainer: "#fc7d00",
  secondaryFixed:   "#ffdbc7",
  onSecondaryContainer: "#5b2900",
  onSecondaryFixed: "#311300",
  outlineVariant:   "#c5c6cf",
  surface:          "#f8f9ff",
  surfaceContainer: "#e5eeff",
  surfaceContainerLow: "#eff4ff",
  surfaceContainerHighest: "#d3e4fe",
  onSurfaceVariant: "#64748B",
  error:            "#DC2626",
  errorContainer:   "#ffdad6",
  success:          "#2E7D32",
};

const LABELS_STATUT = { A_FAIRE: "À planifier", EN_COURS: "En cours", TERMINE: "Clôturé", ANNULE: "Annulé" };
const LABELS_PRIORITE = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé", CRITIQUE: "Critique" };

const ACCENT_PRIORITE = {
  CRITIQUE: C.error,
  ELEVE:    C.secondary,
  MOYEN:    C.secondaryContainer,
  FAIBLE:   C.outlineVariant,
};

const estEnRetard = (a) =>
  a.dateLimite &&
  new Date(a.dateLimite) < new Date() &&
  a.statut !== "TERMINE" &&
  a.statut !== "ANNULE";

const referenceOrigine = (action) =>
  action.incident?.numeroReference || action.audit?.reference || action.risque?.danger || null;

const inputClsFull =
  "w-full px-3 py-2.5 text-sm border rounded-lg bg-white text-[#1E293B] placeholder-[#94A3B8] " +
  "focus:outline-none focus:ring-2 transition";

// ── Composants utilitaires ────────────────────────────────────────────────────

function Spinner({ size = 4 }) {
  return (
    <div className={`w-${size} h-${size} border-2 border-white/60 border-t-transparent rounded-full animate-spin shrink-0`} />
  );
}

// Libellés spécifiques à cette page pour certains statuts (le composant Badge
// partagé utilise "À faire"/"Terminé" par défaut ; cette page affiche "À
// planifier"/"Clôturé" à la place — même couleur/forme, texte adapté au contexte CAPA).
const LIBELLE_BADGE_STATUT = { A_FAIRE: "À planifier", TERMINE: "Clôturé" };

// Menu kebab par ligne — Clôturer / Modifier / Commencer / Supprimer selon rôle et statut
function MenuActions({ action, isQhse, isEmploye, enSuppression, enProgression, onCloturer, onModifier, onCommencer, onSupprimer }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false); };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [ouvert]);

  const peutAgir      = isQhse && action.statut !== "TERMINE" && action.statut !== "ANNULE";
  const peutCommencer = isEmploye && action.statut === "A_FAIRE";
  if (!peutAgir && !peutCommencer && !isQhse) return null;

  return (
    <div className="relative inline-block" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOuvert((o) => !o)}
        className="opacity-0 group-hover:opacity-100 p-2 rounded transition-all hover:bg-[#dce9ff]"
        style={{ opacity: ouvert ? 1 : undefined }}>
        <MoreVertical size={16} color={C.onSurfaceVariant} />
      </button>
      {ouvert && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg py-1.5 z-20"
          style={{ border: `1px solid ${C.outlineVariant}` }}>
          {peutCommencer && (
            <button onClick={() => { setOuvert(false); onCommencer(); }} disabled={enProgression}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f9ff] disabled:opacity-50" style={{ color: C.primary }}>
              {enProgression ? "…" : "Commencer"}
            </button>
          )}
          {peutAgir && (
            <>
              <button onClick={() => { setOuvert(false); onCloturer(); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f9ff]" style={{ color: C.success }}>
                Clôturer
              </button>
              <button onClick={() => { setOuvert(false); onModifier(); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f9ff]" style={{ color: "#1E293B" }}>
                Modifier
              </button>
            </>
          )}
          {isQhse && (
            <button onClick={() => { setOuvert(false); onSupprimer(); }} disabled={enSuppression}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[#ffdad6] disabled:opacity-50" style={{ color: C.error }}>
              {enSuppression ? "…" : "Supprimer"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modale de clôture ─────────────────────────────────────────────────────────

function ModalCloturerAction({ action, onSuccess, onClose }) {
  const [commentaire, setCommentaire] = useState("");
  const [erreur,      setErreur]      = useState("");
  const [envoi,       setEnvoi]       = useState(false);

  const soumettre = async () => {
    if (commentaire.trim().length < 5) {
      setErreur("Le commentaire doit faire au moins 5 caractères."); return;
    }
    setErreur(""); setEnvoi(true);
    try {
      await api.put(`/actions/${action.id}/cloturer`, { commentaireCloture: commentaire });
      toast.success("Action clôturée avec succès");
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la clôture.";
      setErreur(msg);
      toast.error(msg);
    } finally { setEnvoi(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-xl mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: C.outlineVariant }}>
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Clôturer une action</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f8f9ff]">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="p-3 rounded-lg text-sm line-clamp-2" style={{ backgroundColor: C.surface, color: C.onSurfaceVariant }}>
            {action.description}
          </div>
          {erreur && <p className="text-xs p-3 rounded-lg" style={{ color: C.error, backgroundColor: C.errorContainer }}>{erreur}</p>}
          <div>
            <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>
              Commentaire de clôture *
            </label>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              rows={4} placeholder="Décrivez comment l'action a été réalisée…"
              className={`${inputClsFull} resize-none`} style={{ borderColor: C.outlineVariant }} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: C.outlineVariant }}>
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg border" style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
            Annuler
          </button>
          <button type="button" onClick={soumettre} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: C.success }}>
            {envoi ? "Clôture en cours…" : "Confirmer la clôture"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modale de modification ────────────────────────────────────────────────────

function ModalModifierAction({ action, users, onSuccess, onClose }) {
  const [form, setForm] = useState({
    description:   action.description,
    priorite:      action.priorite,
    statut:        action.statut,
    dateLimite:    action.dateLimite ? new Date(action.dateLimite).toISOString().split("T")[0] : "",
    responsableId: action.responsableId,
  });
  const [erreur, setErreur] = useState("");
  const [envoi,  setEnvoi]  = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const soumettre = async () => {
    if (form.description.trim().length < 5) {
      setErreur("La description doit faire au moins 5 caractères."); return;
    }
    setErreur(""); setEnvoi(true);
    try {
      await api.put(`/actions/${action.id}`, {
        description:   form.description,
        priorite:      form.priorite,
        statut:        form.statut,
        dateLimite:    form.dateLimite || null,
        responsableId: form.responsableId,
      });
      toast.success("Action modifiée avec succès");
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la modification.";
      setErreur(msg);
      toast.error(msg);
    } finally { setEnvoi(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-xl mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: C.outlineVariant }}>
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Modifier l'action</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f8f9ff]">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {erreur && <p className="text-xs p-3 rounded-lg" style={{ color: C.error, backgroundColor: C.errorContainer }}>{erreur}</p>}
          <div>
            <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Description *</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} className={`${inputClsFull} resize-none`} style={{ borderColor: C.outlineVariant }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Priorité</label>
              <select value={form.priorite} onChange={(e) => set("priorite", e.target.value)} className={inputClsFull} style={{ borderColor: C.outlineVariant }}>
                <option value="FAIBLE">Faible</option>
                <option value="MOYEN">Moyen</option>
                <option value="ELEVE">Élevé</option>
                <option value="CRITIQUE">Critique</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Statut</label>
              <select value={form.statut} onChange={(e) => set("statut", e.target.value)} className={inputClsFull} style={{ borderColor: C.outlineVariant }}>
                <option value="A_FAIRE">À planifier</option>
                <option value="EN_COURS">En cours</option>
                <option value="ANNULE">Annulé</option>
              </select>
              <p className="mt-1 text-[10px]" style={{ color: C.onSurfaceVariant }}>Pour clôturer, utilisez « Clôturer ».</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Date limite</label>
              <input type="date" value={form.dateLimite} onChange={(e) => set("dateLimite", e.target.value)} className={inputClsFull} style={{ borderColor: C.outlineVariant }} />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Responsable</label>
              <select value={form.responsableId} onChange={(e) => set("responsableId", e.target.value)} className={inputClsFull} style={{ borderColor: C.outlineVariant }}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: C.outlineVariant }}>
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg border" style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
            Annuler
          </button>
          <button type="button" onClick={soumettre} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: C.primary }}>
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function ActionsPage() {
  const navigate = useNavigate();
  const { isEmploye, isQhse } = useRole();

  const [actions,    setActions]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur,     setErreur]     = useState("");

  const [actionCloture, setActionCloture] = useState(null);
  const [actionModif,   setActionModif]   = useState(null);
  const [suppressionIds, setSuppIds]      = useState(new Set());
  const [progressIds,    setProgressIds]  = useState(new Set());

  const [filtreStatut,   setFiltreStatut]   = useState("");
  const [filtrePriorite, setFiltrePriorite] = useState("");
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  const actionsFiltrees = useMemo(() => {
    return actions
      .filter((a) => !filtreStatut   || a.statut   === filtreStatut)
      .filter((a) => !filtrePriorite || a.priorite === filtrePriorite);
  }, [actions, filtreStatut, filtrePriorite]);

  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(actionsFiltrees, ["description"]);

  useEffect(() => {
    document.title = isEmploye ? "Mes actions" : "Actions correctives";
    charger();
    if (isQhse) {
      api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
    }
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    setChargement(true); setErreur("");
    try {
      const res = await api.get(isEmploye ? "/actions/mes-actions" : "/actions");
      setActions(res.data.data || []);
    } catch { setErreur("Impossible de charger les actions correctives."); }
    finally { setChargement(false); }
  };

  const supprimer = async (actionId) => {
    if (!window.confirm("Supprimer définitivement cette action corrective ?")) return;
    setSuppIds((prev) => new Set([...prev, actionId]));
    try {
      await api.delete(`/actions/${actionId}`);
      toast.success("Action supprimée");
      setActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression.");
    } finally {
      setSuppIds((prev) => { const s = new Set(prev); s.delete(actionId); return s; });
    }
  };

  const progresser = async (actionId) => {
    setProgressIds((prev) => new Set([...prev, actionId]));
    try {
      await api.put(`/actions/${actionId}/progresser`);
      toast.success("Action marquée EN COURS");
      setActions((prev) => prev.map((a) => a.id === actionId ? { ...a, statut: "EN_COURS" } : a));
    } catch (err) {
      toast.error(err.response?.data?.message || "Impossible de démarrer cette action.");
    } finally {
      setProgressIds((prev) => { const s = new Set(prev); s.delete(actionId); return s; });
    }
  };

  // Répartition mutuellement exclusive (contrairement à un simple comptage par
  // statut, "en retard" prime sur "à planifier"/"en cours" pour qu'une action
  // ne soit jamais comptée deux fois — indispensable pour que les segments de
  // la barre de répartition somment bien à 100 %.
  const repartition = useMemo(() => {
    let aFaire = 0, enCours = 0, enRetard = 0, termine = 0, annule = 0;
    for (const a of actions) {
      if (estEnRetard(a))            enRetard++;
      else if (a.statut === "A_FAIRE")  aFaire++;
      else if (a.statut === "EN_COURS") enCours++;
      else if (a.statut === "TERMINE")  termine++;
      else if (a.statut === "ANNULE")   annule++;
    }
    return { aFaire, enCours, enRetard, termine, annule, total: actions.length };
  }, [actions]);

  const SEGMENTS_REPARTITION = [
    { cle: "aFaire",   label: "À planifier", valeur: repartition.aFaire,   couleur: "#94A3B8" },
    { cle: "enCours",  label: "En cours",    valeur: repartition.enCours,  couleur: "#EA580C" },
    { cle: "enRetard", label: "En retard",   valeur: repartition.enRetard, couleur: "#DC2626" },
    { cle: "termine",  label: "Clôturées",   valeur: repartition.termine,  couleur: "#2E7D32" },
    ...(repartition.annule > 0
      ? [{ cle: "annule", label: "Annulées", valeur: repartition.annule, couleur: "#CBD5E1" }]
      : []),
  ];

  const titre = isEmploye ? "Mes actions correctives" : "Actions correctives";

  return (
    <AppLayout titre={titre}>
      <div>

        {/* ── En-tête de page ── */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy">{titre}</h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              Suivi des actions correctives et préventives (CAPA){isEmploye ? " qui vous sont assignées" : ""}
            </p>
          </div>
          {isQhse && (
            <Link to="/actions/historique"
              className="shrink-0 flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] transition-colors">
              <History size={14} strokeWidth={2.2} />
              Historique
            </Link>
          )}
        </div>

        {!chargement && !erreur && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-navy">Répartition des actions</h2>
              <p className="text-xs text-[#94A3B8]">
                {repartition.total} action{repartition.total !== 1 ? "s" : ""} au total
              </p>
            </div>

            {repartition.total === 0 ? (
              <div className="h-3 w-full rounded-full bg-[#F1F5F9]" />
            ) : (
              <>
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-[#F1F5F9]">
                  {SEGMENTS_REPARTITION.filter((s) => s.valeur > 0).map((s) => (
                    <div key={s.cle}
                      style={{ width: `${(s.valeur / repartition.total) * 100}%`, backgroundColor: s.couleur }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                  {SEGMENTS_REPARTITION.map((s) => (
                    <div key={s.cle} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.couleur }} />
                      <span className="text-xs text-[#64748B]">
                        {s.label} <span className="font-semibold text-[#1E293B]">{s.valeur}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tableau de suivi CAPA ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] flex flex-wrap gap-4 justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-navy">Plan d'Actions Correctives et Préventives (CAPA)</h2>
              <p className="text-sm text-[#64748B]">
                Suivi en temps réel des actions de mise en conformité{isEmploye ? " qui vous sont assignées" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setFiltresOuverts((o) => !o)}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border border-[#E2E8F0] text-[#475569] transition-colors"
                style={{ backgroundColor: filtresOuverts ? "#F8FAFC" : "transparent" }}>
                <Filter size={15} /> Filtrer
              </button>
            </div>
          </div>

          {filtresOuverts && (
            <div className="px-6 py-4 flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]" />
                <input type="text" placeholder="Rechercher une action…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
                  className={`pl-9 ${inputClsFull} border-[#E2E8F0] focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E]`} />
              </div>
              <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}
                className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition">
                <option value="">Tous les statuts</option>
                {Object.entries(LABELS_STATUT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={filtrePriorite} onChange={(e) => setFiltrePriorite(e.target.value)}
                className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition">
                <option value="">Toutes priorités</option>
                {Object.entries(LABELS_PRIORITE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {(filtreStatut || filtrePriorite || recherche) && (
                <button onClick={() => { setFiltreStatut(""); setFiltrePriorite(""); setRecherche(""); }}
                  className="text-xs text-[#64748B] hover:text-[#1E293B] underline transition-colors shrink-0">
                  Réinitialiser
                </button>
              )}
              <p className="text-xs text-[#94A3B8] shrink-0 ml-auto">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</p>
            </div>
          )}

          {chargement ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm" style={{ color: C.onSurfaceVariant }}>
              <Spinner /> Chargement…
            </div>
          ) : erreur ? (
            <p className="p-6 text-sm" style={{ color: C.error }}>{erreur}</p>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">Origine</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">Responsable</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">Date limite</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {affiches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[#94A3B8]">
                        {recherche
                          ? "Aucune action ne correspond à la recherche."
                          : isEmploye
                          ? "Aucune action corrective ne vous est assignée."
                          : "Aucune action corrective enregistrée."}
                      </td>
                    </tr>
                  ) : (
                    affiches.map((action) => {
                      const enRetard      = estEnRetard(action);
                      const enSuppression = suppressionIds.has(action.id);
                      const enProgression = progressIds.has(action.id);
                      const reference     = referenceOrigine(action);

                      return (
                        <tr key={action.id} onClick={() => navigate(`/actions/${action.id}`)}
                          className="group hover:bg-[#F8FAFC] transition-colors cursor-pointer">

                          <td className="px-4 py-3 text-xs">
                            {reference
                              ? <span className="font-semibold text-[#0D2B4E] group-hover:underline block max-w-[140px] truncate">{reference}</span>
                              : <span className="text-[#94A3B8]">Sans origine</span>}
                          </td>

                          <td className="px-4 py-3">
                            <div className="max-w-xs">
                              <p className="text-sm text-[#475569] truncate">{action.description}</p>
                              {action.commentaireCloture && (
                                <p className="text-xs italic truncate text-[#94A3B8]">
                                  Clôture : {action.commentaireCloture}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {action.responsable ? (
                              <AvatarInitiales prenom={action.responsable.prenom} nom={action.responsable.nom} />
                            ) : (
                              <span className="text-sm text-[#94A3B8]">Non assigné</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: enRetard ? "#DC2626" : "#64748B" }}>
                            {action.dateLimite ? new Date(action.dateLimite).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "Non renseignée"}
                          </td>

                          <td className="px-4 py-3">
                            <Badge
                              variant={enRetard ? "EN_RETARD" : action.statut}
                              label={enRetard ? undefined : LIBELLE_BADGE_STATUT[action.statut]}
                            />
                          </td>

                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <MenuActions
                              action={action} isQhse={isQhse} isEmploye={isEmploye}
                              enSuppression={enSuppression} enProgression={enProgression}
                              onCloturer={() => setActionCloture(action)}
                              onModifier={() => setActionModif(action)}
                              onCommencer={() => progresser(action.id)}
                              onSupprimer={() => supprimer(action.id)}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                <p className="text-xs text-[#64748B]">
                  {Math.min((page - 1) * 10 + 1, filtres.length)}–{Math.min(page * 10, filtres.length)} sur {filtres.length} action{filtres.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ← Précédent
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipse-${i}`} className="px-1.5 text-xs text-[#94A3B8]">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className="w-7 h-7 flex items-center justify-center text-xs font-medium rounded-md transition-colors"
                          style={p === page
                            ? { backgroundColor: "#0D2B4E", color: "white" }
                            : { color: "#475569" }}>
                          {p}
                        </button>
                      )
                    )}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Suivant →
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {actionCloture && (
          <ModalCloturerAction
            action={actionCloture}
            onSuccess={() => { setActionCloture(null); charger(); }}
            onClose={() => setActionCloture(null)}
          />
        )}
        {actionModif && (
          <ModalModifierAction
            action={actionModif}
            users={users}
            onSuccess={() => { setActionModif(null); charger(); }}
            onClose={() => setActionModif(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}

export default ActionsPage;
