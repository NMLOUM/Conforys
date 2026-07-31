import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";

// Couleur d'accent gauche par priorité (sans retard)
const ACCENT_PRIORITE = {
  CRITIQUE: "#DC2626",
  ELEVE:    "#F97316",
  MOYEN:    "#F59E0B",
  FAIBLE:   "#E2E8F0",
};

const estEnRetard = (a) =>
  a.dateLimite &&
  new Date(a.dateLimite) < new Date() &&
  a.statut !== "TERMINE" &&
  a.statut !== "ANNULE";

// Calcule un label de délai relatif + couleur pour la date limite
const delaiRelatif = (dateStr) => {
  if (!dateStr) return null;
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const lim = new Date(dateStr); lim.setHours(0, 0, 0, 0);
  const jours = Math.round((lim - auj) / 86400000);
  if (jours < 0)  return { texte: `Il y a ${Math.abs(jours)}j`, couleur: "#DC2626" };
  if (jours === 0) return { texte: "Aujourd'hui",               couleur: "#F59E0B" };
  if (jours === 1) return { texte: "Demain",                    couleur: "#F59E0B" };
  if (jours <= 7)  return { texte: `Dans ${jours}j`,            couleur: "#F59E0B" };
  return               { texte: `Dans ${jours}j`,               couleur: "#64748B" };
};


const inputClsFull =
  "w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] " +
  "placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition";

// ── Composants utilitaires ────────────────────────────────────────────────────

function Spinner({ size = 4 }) {
  return (
    <div className={`w-${size} h-${size} border-2 border-[#0D2B4E] border-t-transparent rounded-full animate-spin shrink-0`} />
  );
}

// Carte KPI — même style que les dashboards existants
function CarteKpi({ label, valeur, accent }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex flex-col gap-1"
      style={{ borderLeft: `3px solid ${accent}` }}>
      <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-[#0D2B4E]">{valeur}</p>
    </div>
  );
}

// Avatar à initiales pour le responsable
function AvatarInitiales({ prenom, nom }) {
  const init = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 select-none"
      style={{ backgroundColor: "#0D2B4E" }}>
      {init}
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
      <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-base font-semibold text-[#1E293B]">Clôturer une action</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#475569] line-clamp-2">
            {action.description}
          </div>
          {erreur && <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
              Commentaire de clôture *
            </label>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              rows={4} placeholder="Décrivez comment l'action a été réalisée…"
              className={`${inputClsFull} resize-none`} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button type="button" onClick={soumettre} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#2E7D32" }}>
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
      <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-base font-semibold text-[#1E293B]">Modifier l'action</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {erreur && <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Description *</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} className={`${inputClsFull} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Priorité</label>
              <select value={form.priorite} onChange={(e) => set("priorite", e.target.value)} className={inputClsFull}>
                <option value="FAIBLE">Faible</option>
                <option value="MOYEN">Moyen</option>
                <option value="ELEVE">Élevé</option>
                <option value="CRITIQUE">Critique</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Statut</label>
              <select value={form.statut} onChange={(e) => set("statut", e.target.value)} className={inputClsFull}>
                <option value="A_FAIRE">À faire</option>
                <option value="EN_COURS">En cours</option>
                <option value="ANNULE">Annulé</option>
              </select>
              <p className="mt-1 text-[10px] text-[#94A3B8]">Pour clôturer, utilisez « Clôturer ».</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Date limite</label>
              <input type="date" value={form.dateLimite} onChange={(e) => set("dateLimite", e.target.value)} className={inputClsFull} />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Responsable</label>
              <select value={form.responsableId} onChange={(e) => set("responsableId", e.target.value)} className={inputClsFull}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button type="button" onClick={soumettre} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#0D2B4E" }}>
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

const LABELS_STATUT = {
  A_FAIRE:  "À faire",
  EN_COURS: "En cours",
  TERMINE:  "Terminé",
  ANNULE:   "Annulé",
};
const LABELS_PRIORITE = {
  FAIBLE:   "Faible",
  MOYEN:    "Moyen",
  ELEVE:    "Élevé",
  CRITIQUE: "Critique",
};

function ActionsPage() {
  const { isEmploye, isQhse } = useRole();

  const [actions,    setActions]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur,     setErreur]     = useState("");

  const [actionCloture, setActionCloture] = useState(null);
  const [actionModif,   setActionModif]   = useState(null);
  const [suppressionIds, setSuppIds]      = useState(new Set());
  const [progressIds,    setProgressIds]  = useState(new Set());

  // Filtres locaux statut + priorité (appliqués avant useTable)
  const [filtreStatut,   setFiltreStatut]   = useState("");
  const [filtrePriorite, setFiltrePriorite] = useState("");

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

  // ── KPIs calculés depuis la liste brute (avant filtres) ──────────────────
  const kpis = useMemo(() => ({
    total:    actions.length,
    aFaire:   actions.filter((a) => a.statut === "A_FAIRE").length,
    enCours:  actions.filter((a) => a.statut === "EN_COURS").length,
    enRetard: actions.filter(estEnRetard).length,
    termine:  actions.filter((a) => a.statut === "TERMINE").length,
  }), [actions]);

  const titre = isEmploye ? "Mes actions correctives" : "Actions correctives";

  return (
    <AppLayout titre={titre}>

      {/* ── En-tête ── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D2B4E]">{titre}</h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          Suivi des plans d'action correctifs{isEmploye ? " qui vous sont assignés" : " de votre entreprise"}
        </p>
      </div>

      {/* ── KPI Cards ── */}
      {!chargement && !erreur && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <CarteKpi label="Total"      valeur={kpis.total}               accent="#0D2B4E" />
          <CarteKpi label="En retard"  valeur={kpis.enRetard}            accent="#DC2626" />
          <CarteKpi label="À traiter"  valeur={kpis.aFaire + kpis.enCours} accent="#F59E0B" />
          <CarteKpi label="Terminées"  valeur={kpis.termine}             accent="#2E7D32" />
        </div>
      )}

      {!chargement && !erreur && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Rechercher une action…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition" />
          </div>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}
            className="py-2 pl-3 pr-7 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#475569] focus:outline-none focus:ring-2 focus:ring-navy/30 transition">
            <option value="">Tous les statuts</option>
            {Object.entries(LABELS_STATUT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filtrePriorite} onChange={(e) => setFiltrePriorite(e.target.value)}
            className="py-2 pl-3 pr-7 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#475569] focus:outline-none focus:ring-2 focus:ring-navy/30 transition">
            <option value="">Toutes priorités</option>
            {Object.entries(LABELS_PRIORITE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {(filtreStatut || filtrePriorite || recherche) && (
            <button onClick={() => { setFiltreStatut(""); setFiltrePriorite(""); setRecherche(""); }}
              className="text-xs text-[#64748B] hover:text-[#0D2B4E] underline shrink-0">
              Réinitialiser
            </button>
          )}
          <span className="text-sm text-[#64748B] shrink-0 ml-auto">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* ── Tableau ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        {chargement ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#64748B]">
            <Spinner /> Chargement…
          </div>
        ) : erreur ? (
          <p className="p-6 text-sm text-[#DC2626]">{erreur}</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  {/* 5 colonnes : Priorité visible via la bordure gauche colorée */}
                  {["Action", "Priorité", "Statut", "Responsable", "Échéance", ""].map((h) => (
                    <th key={h}
                      className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {affiches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">✓</span>
                        <p className="text-sm text-[#94A3B8]">
                          {recherche
                            ? "Aucune action ne correspond à la recherche."
                            : isEmploye
                            ? "Aucune action corrective ne vous est assignée."
                            : "Aucune action corrective enregistrée."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  affiches.map((action) => {
                    const enRetard        = estEnRetard(action);
                    const peutAgir        = isQhse && action.statut !== "TERMINE" && action.statut !== "ANNULE";
                    const peutCommencer   = isEmploye && action.statut === "A_FAIRE";
                    const enSuppression   = suppressionIds.has(action.id);
                    const enProgression   = progressIds.has(action.id);
                    const delai           = delaiRelatif(action.dateLimite);

                    const accentBord = enRetard
                      ? "#DC2626"
                      : ACCENT_PRIORITE[action.priorite] ?? "#E2E8F0";

                    return (
                      <tr key={action.id}
                        style={{ borderLeft: `3px solid ${accentBord}` }}
                        className="hover:bg-[#F8FAFC] transition-colors">

                        {/* Action — description + commentaire clôture + lien incident */}
                        <td className="px-5 py-4 max-w-sm">
                          <p className="text-sm font-medium text-[#1E293B] line-clamp-2 leading-snug">
                            {action.description}
                          </p>
                          {action.commentaireCloture && (
                            <p className="mt-1 text-xs text-[#64748B] italic line-clamp-1">
                              Clôture : {action.commentaireCloture}
                            </p>
                          )}
                          {action.incident && (
                            <Link to={`/incidents/${action.incident.id}`}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-[#0D2B4E] hover:underline opacity-70">
                              {action.incident.numeroReference}
                            </Link>
                          )}
                          {action.audit && (
                            <Link to={`/audits/${action.audit.id}`}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-[#0D2B4E] hover:underline opacity-70">
                              {action.audit.reference}
                            </Link>
                          )}
                        </td>

                        {/* Priorité — badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <Badge variant={action.priorite} />
                        </td>

                        {/* Statut — badge + EN_RETARD si applicable */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            <Badge variant={action.statut} />
                            {enRetard && <Badge variant="EN_RETARD" />}
                          </div>
                        </td>

                        {/* Responsable — avatar + nom seulement */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {action.responsable ? (
                            <div className="flex items-center gap-2.5">
                              <AvatarInitiales
                                prenom={action.responsable.prenom}
                                nom={action.responsable.nom}
                              />
                              <span className="text-sm text-[#1E293B]">
                                {action.responsable.prenom} {action.responsable.nom}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-[#94A3B8]">Non assigné</span>
                          )}
                        </td>

                        {/* Échéance — date lisible + délai relatif coloré */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {action.dateLimite ? (
                            <div>
                              <p className="text-sm text-[#475569]">
                                {new Date(action.dateLimite).toLocaleDateString("fr-FR")}
                              </p>
                              {delai && action.statut !== "TERMINE" && action.statut !== "ANNULE" && (
                                <p className="text-xs font-semibold mt-0.5" style={{ color: delai.couleur }}>
                                  {delai.texte}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-[#94A3B8]">—</span>
                          )}
                        </td>

                        {/* Boutons — QHSE : clôturer/modifier/supprimer | EMPLOYÉ : commencer */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {peutAgir && (
                              <>
                                <button onClick={() => setActionCloture(action)}
                                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors"
                                  style={{ backgroundColor: "#2E7D32" }}>
                                  Clôturer
                                </button>
                                <button onClick={() => setActionModif(action)}
                                  className="px-3 py-1.5 text-xs font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F1F5F9] transition-colors">
                                  Modifier
                                </button>
                              </>
                            )}
                            {peutCommencer && (
                              <button onClick={() => progresser(action.id)} disabled={enProgression}
                                className="px-3 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
                                style={{ backgroundColor: "#0D2B4E" }}>
                                {enProgression ? "…" : "Commencer"}
                              </button>
                            )}
                            {isQhse && (
                              <button onClick={() => supprimer(action.id)} disabled={enSuppression}
                                title="Supprimer"
                                className="w-7 h-7 flex items-center justify-center rounded text-[#DC2626] hover:bg-red-50 transition-colors disabled:opacity-40">
                                {enSuppression ? <Spinner size={3} /> : "✕"}
                              </button>
                            )}
                          </div>
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
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                ← Précédent
              </button>
              <span className="text-xs text-[#64748B]">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                Suivant →
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* ── Modales ── */}
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
    </AppLayout>
  );
}

export default ActionsPage;
