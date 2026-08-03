import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Search, ArrowRight,
  Filter, MoreVertical, ChevronLeft, ChevronRight, PartyPopper,
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
const PRIORITE_POIDS = { CRITIQUE: 4, ELEVE: 3, MOYEN: 2, FAIBLE: 1 };

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

  const kpis = useMemo(() => ({
    total:    actions.length,
    aFaire:   actions.filter((a) => a.statut === "A_FAIRE").length,
    enCours:  actions.filter((a) => a.statut === "EN_COURS").length,
    enRetard: actions.filter(estEnRetard).length,
    termine:  actions.filter((a) => a.statut === "TERMINE").length,
  }), [actions]);

  // Action prioritaire mise en avant : en retard d'abord, puis la plus critique, puis la plus proche de l'échéance
  const actionPrioritaire = useMemo(() => {
    const actives = actions.filter((a) => a.statut !== "TERMINE" && a.statut !== "ANNULE");
    if (actives.length === 0) return null;
    return [...actives].sort((a, b) => {
      const retardA = estEnRetard(a), retardB = estEnRetard(b);
      if (retardA !== retardB) return retardA ? -1 : 1;
      const poidsA = PRIORITE_POIDS[a.priorite] ?? 0, poidsB = PRIORITE_POIDS[b.priorite] ?? 0;
      if (poidsA !== poidsB) return poidsB - poidsA;
      if (!a.dateLimite) return 1;
      if (!b.dateLimite) return -1;
      return new Date(a.dateLimite) - new Date(b.dateLimite);
    })[0];
  }, [actions]);

  const titre = isEmploye ? "Mes actions correctives" : "Actions correctives";

  return (
    <AppLayout titre={titre}>
      <div>

        {/* ── En-tête de page ── */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-navy">{titre}</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Suivi des actions correctives et préventives (CAPA){isEmploye ? " qui vous sont assignées" : ""}
          </p>
        </div>

        {!chargement && !erreur && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* Carte "Action prioritaire" */}
            {actionPrioritaire ? (
              <div className="lg:col-span-2 text-white rounded-xl p-5 flex flex-col justify-between"
                style={{ backgroundColor: "#0D2B4E" }}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: "#DC2626", color: "white" }}>
                      Action prioritaire
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {referenceOrigine(actionPrioritaire) || `#${actionPrioritaire.id.slice(0, 8).toUpperCase()}`}
                  </h2>
                  <p className="text-sm max-w-xl" style={{ color: "#b6c6ef" }}>{actionPrioritaire.description}</p>
                </div>
                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#8293b8" }}>Échéance</span>
                    <span className="text-sm font-semibold">
                      {actionPrioritaire.dateLimite
                        ? new Date(actionPrioritaire.dateLimite).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                        : "Non renseignée"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#8293b8" }}>Priorité</span>
                    <span className="text-sm font-semibold">{LABELS_PRIORITE[actionPrioritaire.priorite]}</span>
                  </div>
                  <button onClick={() => navigate(`/actions/${actionPrioritaire.id}`)}
                    className="ml-auto flex items-center gap-2 bg-white px-5 py-2.5 text-sm rounded-lg font-semibold hover:bg-[#d8e2ff] transition-all active:scale-95"
                    style={{ color: "#0D2B4E" }}>
                    Voir les détails <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2"
                style={{ backgroundColor: C.surfaceContainerLow }}>
                <PartyPopper size={32} color={C.secondaryContainer} />
                <p className="font-semibold" style={{ color: C.primary }}>Aucune action urgente en attente</p>
                <p className="text-sm" style={{ color: C.onSurfaceVariant }}>Toutes les actions en cours sont sous contrôle.</p>
              </div>
            )}

            {/* Résumé CAPA */}
            <div className="rounded-lg border border-[#E2E8F0] p-6 flex flex-col justify-between" style={{ backgroundColor: "#F8FAFC" }}>
              <div>
                <h2 className="text-lg font-semibold text-navy mb-4">Résumé CAPA</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold" style={{ color: "#DC2626" }}>{kpis.enRetard}</span>
                    <span className="text-sm" style={{ color: C.onSurfaceVariant }}>En retard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold" style={{ color: "#EA580C" }}>{kpis.enCours}</span>
                    <span className="text-sm" style={{ color: C.onSurfaceVariant }}>En cours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold" style={{ color: "#2E7D32" }}>{kpis.termine}</span>
                    <span className="text-sm" style={{ color: C.onSurfaceVariant }}>Clôturées</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tableau de suivi CAPA ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="p-6 border-b flex flex-wrap gap-4 justify-between items-center" style={{ borderColor: C.outlineVariant }}>
            <div>
              <h2 className="text-lg font-semibold text-navy">Plan d'Actions Correctives et Préventives (CAPA)</h2>
              <p className="text-sm" style={{ color: C.onSurfaceVariant }}>
                Suivi en temps réel des actions de mise en conformité{isEmploye ? " qui vous sont assignées" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setFiltresOuverts((o) => !o)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ backgroundColor: filtresOuverts ? C.surfaceContainerLow : "transparent", color: C.onSurfaceVariant, border: `1px solid ${C.outlineVariant}` }}>
                <Filter size={15} /> Filtrer
              </button>
            </div>
          </div>

          {filtresOuverts && (
            <div className="px-6 py-4 flex flex-wrap items-center gap-2 border-b" style={{ borderColor: C.outlineVariant, backgroundColor: C.surface }}>
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.onSurfaceVariant }} />
                <input type="text" placeholder="Rechercher une action…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
                  className={`pl-9 ${inputClsFull}`} style={{ borderColor: C.outlineVariant }} />
              </div>
              <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}
                className="py-2 pl-3 pr-7 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 transition"
                style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
                <option value="">Tous les statuts</option>
                {Object.entries(LABELS_STATUT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={filtrePriorite} onChange={(e) => setFiltrePriorite(e.target.value)}
                className="py-2 pl-3 pr-7 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 transition"
                style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
                <option value="">Toutes priorités</option>
                {Object.entries(LABELS_PRIORITE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {(filtreStatut || filtrePriorite || recherche) && (
                <button onClick={() => { setFiltreStatut(""); setFiltrePriorite(""); setRecherche(""); }}
                  className="text-xs font-semibold hover:underline shrink-0" style={{ color: C.onSurfaceVariant }}>
                  Réinitialiser
                </button>
              )}
              <span className="text-sm shrink-0 ml-auto" style={{ color: C.onSurfaceVariant }}>{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide min-w-[140px]">Origine</th>
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

                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {reference
                              ? <span className="font-semibold text-[#0D2B4E] group-hover:underline">{reference}</span>
                              : <span className="text-[#94A3B8]">Sans origine</span>}
                          </td>

                          <td className="px-4 py-3">
                            <div className="max-w-xs">
                              <p className="text-sm text-[#1E293B] truncate">{action.description}</p>
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
            {filtres.length > 0 && (
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: `1px solid ${C.outlineVariant}` }}>
                <p className="text-sm" style={{ color: C.onSurfaceVariant }}>
                  Affichage de {(page - 1) * 10 + 1} à {Math.min(page * 10, filtres.length)} sur {filtres.length} action{filtres.length !== 1 ? "s" : ""} au total
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-2 rounded-lg transition-colors disabled:opacity-30 hover:bg-[#eff4ff]">
                    <ChevronLeft size={18} color={C.onSurfaceVariant} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button key={n} onClick={() => setPage(n)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors"
                      style={n === page
                        ? { backgroundColor: C.primary, color: "white" }
                        : { color: "#1E293B" }}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-2 rounded-lg transition-colors disabled:opacity-30 hover:bg-[#eff4ff]">
                    <ChevronRight size={18} color={C.onSurfaceVariant} />
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
