import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";
import { useAuthStore } from "../store/authStore";

// ── Constantes ────────────────────────────────────────────────────────────────

const LABELS_TYPE = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presqu'accident",
  SITUATION_DANGEREUSE:     "Situation dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Incident environnemental",
};

const OPTIONS_PRIORITE = [
  { value: "FAIBLE",   label: "Faible" },
  { value: "MOYEN",    label: "Moyen" },
  { value: "ELEVE",    label: "Élevé" },
  { value: "CRITIQUE", label: "Critique" },
];

// Validation des fichiers avant upload ImgBB
const TYPES_ACCEPTES   = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_OCTET = 5 * 1024 * 1024; // 5 Mo

const validerFichier = (fichier) => {
  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    return "Type non supporté. Formats acceptés : JPG, PNG, WebP.";
  }
  if (fichier.size > TAILLE_MAX_OCTET) {
    return `Fichier trop volumineux (${(fichier.size / 1024 / 1024).toFixed(1)} Mo). Limite : 5 Mo.`;
  }
  return null; // pas d'erreur
};

// Une action est en retard si sa date limite est dépassée et qu'elle n'est pas terminée/annulée
const estEnRetard = (a) =>
  a.dateLimite &&
  new Date(a.dateLimite) < new Date() &&
  a.statut !== "TERMINE" &&
  a.statut !== "ANNULE";

// ── Composants utilitaires ────────────────────────────────────────────────────

function LigneInfo({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-[#1E293B]">{children || "—"}</p>
    </div>
  );
}

function Spinner({ size = 4 }) {
  return (
    <div
      className={`w-${size} h-${size} border-2 border-[#0D2B4E] border-t-transparent rounded-full animate-spin shrink-0`}
    />
  );
}

const inputCls =
  "w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B]" +
  " placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition";

// ── Modale "Ajouter une action corrective" ────────────────────────────────────

function ModalAjoutAction({ incidentId, users, onSuccess, onClose }) {
  const [form,   setForm]   = useState({ description: "", priorite: "MOYEN", dateLimite: "", responsableId: "" });
  const [erreur, setErreur] = useState("");
  const [envoi,  setEnvoi]  = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const soumettre = async () => {
    if (!form.description.trim()) { setErreur("La description est obligatoire."); return; }
    if (!form.responsableId)       { setErreur("Sélectionnez un responsable."); return; }
    setErreur("");
    setEnvoi(true);
    try {
      await api.post(`/incidents/${incidentId}/actions`, {
        description:   form.description,
        priorite:      form.priorite,
        dateLimite:    form.dateLimite || null,
        responsableId: form.responsableId,
      });
      toast.success("Action corrective ajoutée");
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'ajout.";
      setErreur(msg);
      toast.error(msg);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-base font-semibold text-[#1E293B]">Ajouter une action corrective</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
            &#x2715;
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
              Description *
            </label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} placeholder="Décrivez l'action à mener…" className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                Priorité
              </label>
              <select value={form.priorite} onChange={(e) => set("priorite", e.target.value)} className={inputCls}>
                {OPTIONS_PRIORITE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                Date limite
              </label>
              <input type="date" value={form.dateLimite} onChange={(e) => set("dateLimite", e.target.value)}
                className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
              Responsable *
            </label>
            <select value={form.responsableId} onChange={(e) => set("responsableId", e.target.value)} className={inputCls}>
              <option value="">— Sélectionner un responsable —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
            </select>
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
            {envoi ? "Enregistrement…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modale "Clôturer une action" ──────────────────────────────────────────────

function ModalCloturerAction({ action, onSuccess, onClose }) {
  const [commentaire, setCommentaire] = useState("");
  const [erreur,      setErreur]      = useState("");
  const [envoi,       setEnvoi]       = useState(false);

  const soumettre = async () => {
    if (!commentaire.trim() || commentaire.trim().length < 5) {
      setErreur("Le commentaire doit faire au moins 5 caractères."); return;
    }
    setErreur("");
    setEnvoi(true);
    try {
      await api.put(`/actions/${action.id}/cloturer`, { commentaireCloture: commentaire });
      toast.success("Action clôturée avec succès");
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la clôture.";
      setErreur(msg);
      toast.error(msg);
    } finally {
      setEnvoi(false);
    }
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
          <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#475569]">
            {action.description}
          </div>
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
              Commentaire de clôture *
            </label>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              rows={4} placeholder="Décrivez comment l'action a été réalisée…"
              className={`${inputCls} resize-none`} />
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

// ── Modale de modification d'une action (QHSE/ADMIN) ─────────────────────────

function ModalModifierAction({ action, users, onSuccess, onClose }) {
  const [form, setForm] = useState({
    description:   action.description,
    priorite:      action.priorite,
    statut:        action.statut,
    dateLimite:    action.dateLimite
      ? new Date(action.dateLimite).toISOString().split("T")[0]
      : "",
    responsableId: action.responsableId,
  });
  const [erreur, setErreur] = useState("");
  const [envoi,  setEnvoi]  = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const soumettre = async () => {
    if (form.description.trim().length < 5) {
      setErreur("La description doit faire au moins 5 caractères."); return;
    }
    setErreur("");
    setEnvoi(true);
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
    } finally {
      setEnvoi(false);
    }
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
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
              Description *
            </label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                Priorité
              </label>
              <select value={form.priorite} onChange={(e) => set("priorite", e.target.value)} className={inputCls}>
                <option value="FAIBLE">Faible</option>
                <option value="MOYEN">Moyen</option>
                <option value="ELEVE">Élevé</option>
                <option value="CRITIQUE">Critique</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                Statut
              </label>
              <select value={form.statut} onChange={(e) => set("statut", e.target.value)} className={inputCls}>
                <option value="A_FAIRE">À faire</option>
                <option value="EN_COURS">En cours</option>
                <option value="ANNULE">Annulé</option>
              </select>
              <p className="mt-1 text-[10px] text-[#94A3B8]">
                Pour clôturer, utilisez le bouton « Clôturer ».
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                Date limite
              </label>
              <input type="date" value={form.dateLimite} onChange={(e) => set("dateLimite", e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                Responsable
              </label>
              <select value={form.responsableId} onChange={(e) => set("responsableId", e.target.value)} className={inputCls}>
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

// ── Modale de rejet (page de détail) ─────────────────────────────────────────

function ModalRejeter({ onConfirm, onClose }) {
  const [motif,  setMotif]  = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi,  setEnvoi]  = useState(false);

  const confirmer = async () => {
    if (!motif.trim() || motif.trim().length < 5) {
      setErreur("Le motif doit faire au moins 5 caractères.");
      return;
    }
    setErreur("");
    setEnvoi(true);
    try {
      await onConfirm(motif.trim());
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-base font-semibold text-[#1E293B]">Rejeter l'incident</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
              Motif de rejet *
            </label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={4}
              placeholder="Expliquez pourquoi cet incident est rejeté…"
              className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626] transition resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button type="button" onClick={confirmer} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#DC2626" }}>
            {envoi ? "Rejet en cours…" : "Confirmer le rejet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isQhse } = useRole();
  const user = useAuthStore((s) => s.user);

  // Données
  const [incident,   setIncident]   = useState(null);
  const [actions,    setActions]    = useState([]);
  const [pieces,     setPieces]     = useState([]);
  const [historique, setHistorique] = useState([]);
  const [users,      setUsers]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurPage, setErreurPage] = useState("");

  // Modales actions correctives
  const [showAjout,     setShowAjout]     = useState(false);
  const [actionCloture, setActionCloture] = useState(null);
  const [actionModif,   setActionModif]   = useState(null);
  // IDs des actions en cours de suppression (optimistic)
  const [suppressionActionIds, setSuppActionIds] = useState(new Set());

  // Workflow de statut
  const [actionStatutEnCours, setActionStatutEnCours] = useState(false);
  const [erreurStatut,        setErreurStatut]        = useState("");
  const [showModalRejet,      setShowModalRejet]      = useState(false);

  // État des uploads en cours — chaque entrée : { id, nom, statut, erreur? }
  const [uploads,         setUploads]         = useState([]);
  // IDs de pièces en cours de suppression
  const [suppressionIds,  setSuppIds]         = useState(new Set());

  useEffect(() => {
    document.title = "CONFORYS — Détail incident";
    charger();
    api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
    return () => { document.title = "CONFORYS"; };
  }, [id]);

  // Charge l'incident, ses actions et ses pièces jointes en parallèle.
  // Les sous-ressources (actions, pièces) n'empêchent pas l'affichage si elles échouent.
  const charger = async () => {
    setChargement(true);
    setErreurPage("");
    try {
      const resInc = await api.get(`/incidents/${id}`);
      setIncident(resInc.data.data);

      // Chargement non-bloquant des sous-ressources
      const [resAct, resPieces, resHist] = await Promise.allSettled([
        api.get(`/incidents/${id}/actions`),
        api.get(`/incidents/${id}/pieces-jointes`),
        api.get(`/incidents/${id}/historique`),
      ]);
      if (resAct.status    === "fulfilled") setActions(resAct.value.data.data      || []);
      if (resPieces.status === "fulfilled") setPieces(resPieces.value.data.data    || []);
      if (resHist.status   === "fulfilled") setHistorique(resHist.value.data.data  || []);
    } catch (e) {
      setErreurPage("Impossible de charger l'incident.");
    } finally {
      setChargement(false);
    }
  };

  const chargerActions = async () => {
    const res = await api.get(`/incidents/${id}/actions`);
    setActions(res.data.data || []);
  };

  const supprimerAction = async (actionId) => {
    if (!window.confirm("Supprimer définitivement cette action corrective ?")) return;
    setSuppActionIds((prev) => new Set([...prev, actionId]));
    try {
      await api.delete(`/actions/${actionId}`);
      toast.success("Action supprimée");
      setActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression.");
    } finally {
      setSuppActionIds((prev) => { const s = new Set(prev); s.delete(actionId); return s; });
    }
  };

  const chargerPieces = async () => {
    const res = await api.get(`/incidents/${id}/pieces-jointes`);
    setPieces(res.data.data || []);
  };

  // ── Workflow de statut ────────────────────────────────────────────────────

  const changerStatut = async (action, body = {}) => {
    setErreurStatut("");
    setActionStatutEnCours(true);
    try {
      await api.put(`/incidents/${id}/${action}`, body);
      const libelles = { soumettre: "Incident soumis", valider: "Incident validé", rejeter: "Incident rejeté", cloturer: "Incident clôturé" };
      toast.success(libelles[action] ?? "Action effectuée");
      await charger();
    } catch (err) {
      const msg = err.response?.data?.message || `Erreur lors de l'action "${action}".`;
      setErreurStatut(msg);
      toast.error(msg);
    } finally {
      setActionStatutEnCours(false);
    }
  };

  const confirmerRejet = async (motifRejet) => {
    await changerStatut("rejeter", { motifRejet });
    setShowModalRejet(false);
  };

  // ── Upload de pièces jointes ───────────────────────────────────────────────

  const handleFichiers = async (e) => {
    const fichiers = Array.from(e.target.files || []);
    // Réinitialise l'input pour permettre de re-sélectionner le même fichier
    e.target.value = "";
    if (!fichiers.length) return;

    for (const fichier of fichiers) {
      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const erreurValidation = validerFichier(fichier);

      if (erreurValidation) {
        // Validation échouée : affiche l'erreur sans tenter l'upload
        setUploads((prev) => [
          ...prev,
          { id: tempId, nom: fichier.name, statut: "erreur", erreur: erreurValidation },
        ]);
        continue;
      }

      // Ajout de l'indicateur "en cours"
      setUploads((prev) => [...prev, { id: tempId, nom: fichier.name, statut: "envoi" }]);

      try {
        // Étape 1 : upload vers ImgBB
        const fd = new FormData();
        fd.append("image", fichier);
        const resImgBB = await fetch(
          `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
          { method: "POST", body: fd }
        );
        const jsonImgBB = await resImgBB.json();
        if (!jsonImgBB.success) {
          throw new Error(jsonImgBB.error?.message || "Échec de l'upload ImgBB.");
        }

        // Étape 2 : enregistrement de l'URL en base via l'API
        await api.post(`/incidents/${id}/pieces-jointes`, {
          url:  jsonImgBB.data.url,
          nom:  fichier.name,
          type: "IMAGE",
        });

        // Suppression de l'indicateur d'envoi et rafraîchissement
        setUploads((prev) => prev.filter((u) => u.id !== tempId));
        toast.success("Pièce jointe ajoutée");
        await chargerPieces();
      } catch (err) {
        const msg =
          err.message?.includes("Failed to fetch")
            ? "Impossible de joindre ImgBB. Vérifiez votre connexion."
            : err.response?.data?.message || err.message || "Erreur d'upload.";
        setUploads((prev) =>
          prev.map((u) => u.id === tempId ? { ...u, statut: "erreur", erreur: msg } : u)
        );
      }
    }
  };

  const supprimerPiece = async (pieceId) => {
    setSuppIds((prev) => new Set([...prev, pieceId]));
    try {
      await api.delete(`/pieces-jointes/${pieceId}`);
      // Optimistic UI : retire immédiatement de la liste sans re-fetch
      setPieces((prev) => prev.filter((p) => p.id !== pieceId));
    } catch (err) {
      console.error("Erreur suppression pièce jointe:", err);
    } finally {
      setSuppIds((prev) => { const s = new Set(prev); s.delete(pieceId); return s; });
    }
  };

  const retirerErreurUpload = (tempId) =>
    setUploads((prev) => prev.filter((u) => u.id !== tempId));

  const uploadsEnCours = uploads.filter((u) => u.statut === "envoi");
  const uploadsErreur  = uploads.filter((u) => u.statut === "erreur");

  // ── Affichage ──────────────────────────────────────────────────────────────

  if (chargement) {
    return (
      <AppLayout titre="Chargement…">
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <Spinner /> Chargement…
        </div>
      </AppLayout>
    );
  }

  if (erreurPage || !incident) {
    return (
      <AppLayout titre="Incident introuvable">
        <p className="text-sm text-[#DC2626]">{erreurPage || "Incident introuvable."}</p>
        <button onClick={() => navigate("/incidents")} className="mt-4 text-sm text-[#0D2B4E] underline">
          Retour aux incidents
        </button>
      </AppLayout>
    );
  }

  const dateIncident = incident.dateIncident
    ? new Date(incident.dateIncident).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : "—";

  return (
    <AppLayout titre={`Incident ${incident.numeroReference}`}>

      {/* ── Fil d'Ariane ── */}
      <div className="mb-5">
        <button onClick={() => navigate("/incidents")}
          className="text-xs text-[#64748B] hover:text-[#0D2B4E] transition-colors flex items-center gap-1">
          ← Retour aux incidents
        </button>
      </div>

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D2B4E]">{incident.numeroReference}</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{LABELS_TYPE[incident.type] ?? incident.type}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={incident.gravite} />
          <Badge variant={incident.statut} />
        </div>
      </div>

      {/* ── Bandeau workflow ── */}
      {(() => {
        const estDeclarant = user?.id === incident.declarePar?.id;
        const peutSoumettre  = incident.statut === "BROUILLON" && estDeclarant;
        const peutValiderRejeter = incident.statut === "OUVERT"    && isQhse;
        const peutCloturer  = incident.statut === "EN_COURS"   && isQhse;

        if (!peutSoumettre && !peutValiderRejeter && !peutCloturer) return null;

        return (
          <div className="mb-5 p-4 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-4">
            <p className="text-xs text-[#64748B]">
              {peutSoumettre       && "Cet incident est en brouillon. Soumettez-le pour traitement."}
              {peutValiderRejeter  && "Cet incident attend votre décision."}
              {peutCloturer        && "L'enquête est terminée. Clôturez cet incident."}
            </p>
            {erreurStatut && (
              <p className="text-xs text-[#DC2626] shrink-0">{erreurStatut}</p>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {peutSoumettre && (
                <button onClick={() => changerStatut("soumettre")} disabled={actionStatutEnCours}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: "#0D2B4E" }}>
                  {actionStatutEnCours ? "…" : "Soumettre"}
                </button>
              )}
              {peutValiderRejeter && (
                <>
                  <button onClick={() => changerStatut("valider")} disabled={actionStatutEnCours}
                    className="px-3 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: "#2E7D32" }}>
                    {actionStatutEnCours ? "…" : "Valider"}
                  </button>
                  <button onClick={() => setShowModalRejet(true)} disabled={actionStatutEnCours}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border disabled:opacity-50 transition-colors hover:bg-red-50"
                    style={{ borderColor: "#DC2626", color: "#DC2626" }}>
                    Rejeter
                  </button>
                </>
              )}
              {peutCloturer && (
                <button onClick={() => changerStatut("cloturer")} disabled={actionStatutEnCours}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: "#475569" }}>
                  {actionStatutEnCours ? "…" : "Clôturer"}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Fiche incident ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 mb-5">
        <h2 className="text-sm font-semibold text-[#1E293B] mb-4">Informations</h2>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4">
          <LigneInfo label="Date de l'incident">{dateIncident}</LigneInfo>
          <LigneInfo label="Site">{incident.site?.nom}</LigneInfo>
          <LigneInfo label="Déclaré par">
            {incident.declarePar ? `${incident.declarePar.prenom} ${incident.declarePar.nom}` : "—"}
          </LigneInfo>
          {incident.adresseLisible && (
            <LigneInfo label="Lieu précis">{incident.adresseLisible}</LigneInfo>
          )}
          {incident.validePar && (
            <LigneInfo label="Validé par">
              {`${incident.validePar.prenom} ${incident.validePar.nom}`}
            </LigneInfo>
          )}
          {incident.dateCloture && (
            <LigneInfo label="Date de clôture">
              {new Date(incident.dateCloture).toLocaleDateString("fr-FR")}
            </LigneInfo>
          )}
        </div>
        <div className="pt-4 border-t border-[#F1F5F9] space-y-3">
          <LigneInfo label="Description">
            <span className="leading-relaxed">{incident.description}</span>
          </LigneInfo>
          {incident.motifRejet && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-[10px] font-semibold text-[#DC2626] uppercase tracking-wide mb-1">
                Motif de rejet
              </p>
              <p className="text-sm text-[#DC2626]">{incident.motifRejet}</p>
            </div>
          )}
        </div>

        {/* Photo principale + GPS */}
        {(incident.photoUrl || incident.latitude) && (
          <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex items-start gap-6">
            {incident.photoUrl && (
              <div>
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">Photo</p>
                <a href={incident.photoUrl} target="_blank" rel="noopener noreferrer">
                  <img src={incident.photoUrl} alt="Photo de l'incident"
                    className="h-24 rounded-md object-cover border border-[#E2E8F0] hover:opacity-90 transition" />
                </a>
              </div>
            )}
            {incident.latitude && incident.longitude && (
              <div>
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                  Coordonnées GPS
                </p>
                <p className="text-sm text-[#1E293B]">{incident.latitude}, {incident.longitude}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Actions correctives ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden mb-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-semibold text-[#1E293B]">Actions correctives</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{actions.length} action(s)</p>
          </div>
          {isQhse && (
            <button onClick={() => setShowAjout(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors"
              style={{ backgroundColor: "#0D2B4E" }}>
              + Ajouter une action
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              {["Description", "Priorité", "Statut", "Responsable", "Date limite", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {actions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#94A3B8] text-sm">
                  Aucune action corrective enregistrée
                </td>
              </tr>
            ) : (
              actions.map((action) => {
                const peutAgir      = isQhse && action.statut !== "TERMINE" && action.statut !== "ANNULE";
                const enRetard      = estEnRetard(action);
                const enSuppression = suppressionActionIds.has(action.id);
                return (
                  <tr key={action.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 text-[#1E293B] max-w-xs">
                      <p className="line-clamp-2">{action.description}</p>
                      {action.commentaireCloture && (
                        <p className="mt-1 text-xs text-[#64748B] italic line-clamp-1">
                          Clôture : {action.commentaireCloture}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge variant={action.priorite} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge variant={action.statut} />
                        {enRetard && <Badge variant="EN_RETARD" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#475569] whitespace-nowrap">
                      {action.responsable ? `${action.responsable.prenom} ${action.responsable.nom}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                      {action.dateLimite ? new Date(action.dateLimite).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {peutAgir && (
                          <>
                            <button onClick={() => setActionCloture(action)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md text-white transition-colors"
                              style={{ backgroundColor: "#2E7D32" }}>
                              Clôturer
                            </button>
                            <button onClick={() => setActionModif(action)}
                              className="px-2.5 py-1 text-xs font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F1F5F9] transition-colors">
                              Modifier
                            </button>
                          </>
                        )}
                        {isQhse && (
                          <button onClick={() => supprimerAction(action.id)} disabled={enSuppression}
                            title="Supprimer définitivement"
                            className="w-6 h-6 flex items-center justify-center rounded text-[#DC2626] hover:bg-red-50 transition-colors disabled:opacity-40 text-xs">
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

      {/* ── Pièces jointes ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-semibold text-[#1E293B]">Pièces jointes</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {pieces.length} fichier(s) — JPG, PNG, WebP · max 5 Mo
            </p>
          </div>
          {/* Label cliquable autour de l'input file caché */}
          <label
            className="px-3 py-1.5 text-xs font-semibold text-white rounded-md cursor-pointer transition-colors select-none"
            style={{ backgroundColor: "#0D2B4E" }}
          >
            + Ajouter
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFichiers}
              className="sr-only"
            />
          </label>
        </div>

        <div className="p-5">
          {/* Indicateurs d'uploads en cours */}
          {uploadsEnCours.length > 0 && (
            <div className="mb-4 space-y-2">
              {uploadsEnCours.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 text-xs text-[#64748B]">
                  <Spinner size={3} />
                  <span className="truncate max-w-xs">{u.nom}</span>
                  <span className="text-[#94A3B8]">Envoi en cours…</span>
                </div>
              ))}
            </div>
          )}

          {/* Erreurs d'upload — dismissibles */}
          {uploadsErreur.length > 0 && (
            <div className="mb-4 space-y-2">
              {uploadsErreur.map((u) => (
                <div key={u.id}
                  className="flex items-center justify-between text-xs px-3 py-2 rounded-md bg-red-50 border border-red-100">
                  <span className="text-[#DC2626] truncate max-w-sm">
                    <span className="font-medium">{u.nom}</span> — {u.erreur}
                  </span>
                  <button onClick={() => retirerErreurUpload(u.id)}
                    className="ml-3 text-[#94A3B8] hover:text-[#64748B] shrink-0">
                    &#x2715;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Grille d'images */}
          {pieces.length === 0 && uploadsEnCours.length === 0 ? (
            <p className="text-sm text-[#94A3B8] text-center py-8">
              Aucune pièce jointe — cliquez sur « + Ajouter » pour en ajouter une.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
              {pieces.map((piece) => {
                const enSuppression = suppressionIds.has(piece.id);
                return (
                  <div key={piece.id} className="group relative">
                    {/* Miniature cliquable */}
                    <a href={piece.url} target="_blank" rel="noopener noreferrer"
                      className="block w-full h-20 rounded-md overflow-hidden border border-[#E2E8F0]">
                      <img src={piece.url} alt={piece.nom || "Pièce jointe"}
                        className="w-full h-full object-cover hover:opacity-90 transition" />
                    </a>

                    {/* Nom du fichier */}
                    <p className="mt-1 text-[10px] text-[#64748B] truncate" title={piece.nom || ""}>
                      {piece.nom || "image"}
                    </p>

                    {/* Bouton suppression — visible au survol pour QHSE/ADMIN */}
                    {isQhse && (
                      <button
                        onClick={() => supprimerPiece(piece.id)}
                        disabled={enSuppression}
                        title="Supprimer"
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-[10px]
                          bg-[#DC2626] text-white opacity-0 group-hover:opacity-100 transition-opacity
                          disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {enSuppression ? (
                          <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "✕"
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Piste d'audit ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-semibold text-[#1E293B]">Historique</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Piste d'audit — lecture seule</p>
        </div>

        {historique.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#94A3B8] text-center">Aucune entrée d'historique.</p>
        ) : (
          <ol className="px-5 py-4 space-y-0">
            {historique.map((entree, i) => {
              const isLast = i === historique.length - 1;
              return (
                <li key={entree.id} className="flex gap-4">
                  {/* Ligne + point de timeline */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0D2B4E] border-2 border-white ring-1 ring-[#CBD5E1] mt-1 shrink-0" />
                    {!isLast && <div className="w-px flex-1 bg-[#E2E8F0] my-1" />}
                  </div>

                  {/* Contenu */}
                  <div className={`pb-4 ${isLast ? "" : ""}`}>
                    <p className="text-sm font-medium text-[#1E293B] leading-snug">{entree.action}</p>
                    {entree.details && (
                      <p className="text-xs text-[#64748B] mt-0.5 italic">{entree.details}</p>
                    )}
                    <p className="text-xs text-[#94A3B8] mt-1">
                      {entree.auteur
                        ? `${entree.auteur.prenom} ${entree.auteur.nom}`
                        : "Système"}
                      {" · "}
                      {new Date(entree.dateAction).toLocaleString("fr-FR", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* ── Modales ── */}
      {showModalRejet && (
        <ModalRejeter
          onConfirm={confirmerRejet}
          onClose={() => setShowModalRejet(false)}
        />
      )}
      {showAjout && (
        <ModalAjoutAction
          incidentId={id}
          users={users}
          onSuccess={() => { setShowAjout(false); chargerActions(); }}
          onClose={() => setShowAjout(false)}
        />
      )}
      {actionCloture && (
        <ModalCloturerAction
          action={actionCloture}
          onSuccess={() => { setActionCloture(null); chargerActions(); }}
          onClose={() => setActionCloture(null)}
        />
      )}
      {actionModif && (
        <ModalModifierAction
          action={actionModif}
          users={users}
          onSuccess={() => { setActionModif(null); chargerActions(); }}
          onClose={() => setActionModif(null)}
        />
      )}
    </AppLayout>
  );
}

export default IncidentDetailPage;
