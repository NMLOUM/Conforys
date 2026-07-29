import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, FileText, Send, Download } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";
import { useAuthStore } from "../store/authStore";
import AnalyseCausesApercu from "../components/incidents/AnalyseCausesApercu";

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

const formatTaille = (octets) => {
  if (!octets) return null;
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
};

const COULEUR_PRIORITE = { FAIBLE: "#94A3B8", MOYEN: "#EA580C", ELEVE: "#DC2626", CRITIQUE: "#DC2626" };

// ── Action corrective — présentation compacte (encart Actions correctives) ───

function ActionCorrectiveItem({ action, isQhse, enSuppression, onCloturer, onModifier, onSupprimer }) {
  const enRetard = estEnRetard(action);
  const peutAgir = isQhse && action.statut !== "TERMINE" && action.statut !== "ANNULE";
  return (
    <div className="p-3 rounded-md hover:bg-white transition-colors">
      <div className="flex items-start gap-2.5">
        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: COULEUR_PRIORITE[action.priorite] || "#94A3B8" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#1E293B] line-clamp-2">{action.description}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant={action.statut} />
            {enRetard && <Badge variant="EN_RETARD" />}
            <span className="text-xs text-[#64748B]">
              {action.responsable ? `${action.responsable.prenom} ${action.responsable.nom}` : "—"}
              {action.dateLimite && ` · éch. ${new Date(action.dateLimite).toLocaleDateString("fr-FR")}`}
            </span>
          </div>
          {peutAgir && (
            <div className="flex items-center gap-3 mt-2">
              <button type="button" onClick={onCloturer} className="text-xs font-semibold" style={{ color: "#2E7D32" }}>
                Clôturer
              </button>
              <button type="button" onClick={onModifier} className="text-xs font-medium text-[#475569] hover:text-[#0D2B4E] transition-colors">
                Modifier
              </button>
            </div>
          )}
        </div>
        {isQhse && (
          <button type="button" onClick={onSupprimer} disabled={enSuppression} title="Supprimer définitivement"
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#DC2626] hover:bg-red-50 transition-colors disabled:opacity-40 text-xs">
            {enSuppression ? <Spinner size={3} /> : "✕"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Pièce jointe — ligne bandeau (nom / taille / date) ────────────────────────

function PieceJointeRow({ piece, peutSupprimer, enSuppression, onSupprimer }) {
  const taille = formatTaille(piece.taille);
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-md border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] transition-colors">
      <a href={piece.url} target="_blank" rel="noopener noreferrer"
        className="w-9 h-9 rounded-md overflow-hidden border border-[#E2E8F0] shrink-0 bg-[#F8FAFC] flex items-center justify-center">
        {piece.type === "DOCUMENT"
          ? <FileText size={15} color="#64748B" />
          : <img src={piece.url} alt="" className="w-full h-full object-cover" />}
      </a>
      <div className="flex-1 min-w-0">
        <a href={piece.url} target="_blank" rel="noopener noreferrer"
          className="text-sm text-[#1E293B] hover:text-[#0D2B4E] transition-colors truncate block">
          {piece.nom || "Fichier"}
        </a>
        <p className="text-xs text-[#94A3B8]">
          {taille && `${taille} · `}
          {new Date(piece.dateAjout).toLocaleDateString("fr-FR")}
          {piece.ajoutePar && ` · ${piece.ajoutePar.prenom} ${piece.ajoutePar.nom}`}
        </p>
      </div>
      {peutSupprimer && (
        <button type="button" onClick={onSupprimer} disabled={enSuppression} title="Supprimer"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#DC2626] hover:bg-red-50 transition-colors disabled:opacity-40 text-xs">
          {enSuppression ? <Spinner size={3} /> : "✕"}
        </button>
      )}
    </div>
  );
}

// ── Commentaire — ligne du fil de discussion ──────────────────────────────────

function CommentaireItem({ commentaire }) {
  const initiales = `${commentaire.auteur?.prenom?.[0] || ""}${commentaire.auteur?.nom?.[0] || ""}`.toUpperCase();
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: "#0D2B4E" }}>
        {initiales || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-[#1E293B]">
            {commentaire.auteur ? `${commentaire.auteur.prenom} ${commentaire.auteur.nom}` : "Utilisateur"}
          </p>
          <p className="text-[10px] text-[#94A3B8]">
            {new Date(commentaire.createdAt).toLocaleString("fr-FR", {
              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <p className="text-sm text-[#475569] mt-0.5 whitespace-pre-wrap">{commentaire.contenu}</p>
      </div>
    </div>
  );
}

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
  const { isQhse, isAdmin } = useRole();
  const user = useAuthStore((s) => s.user);

  // Données
  const [incident,     setIncident]     = useState(null);
  const [actions,      setActions]      = useState([]);
  const [pieces,       setPieces]       = useState([]);
  const [historique,   setHistorique]   = useState([]);
  const [commentaires, setCommentaires] = useState([]);
  const [users,        setUsers]        = useState([]);
  const [chargement, setChargement] = useState(true);
  const [telechargementPdf, setTelechargementPdf] = useState(false);
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
  // Espace collaboratif — commentaires
  const [nouveauCommentaire, setNouveauCommentaire] = useState("");
  const [envoiCommentaire,   setEnvoiCommentaire]   = useState(false);

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
      const [resAct, resPieces, resHist, resComm] = await Promise.allSettled([
        api.get(`/incidents/${id}/actions`),
        api.get(`/incidents/${id}/pieces-jointes`),
        api.get(`/incidents/${id}/historique`),
        api.get(`/incidents/${id}/commentaires`),
      ]);
      if (resAct.status    === "fulfilled") setActions(resAct.value.data.data      || []);
      if (resPieces.status === "fulfilled") setPieces(resPieces.value.data.data    || []);
      if (resHist.status   === "fulfilled") setHistorique(resHist.value.data.data  || []);
      if (resComm.status   === "fulfilled") setCommentaires(resComm.value.data.data || []);
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

  // ── Téléchargement du rapport PDF ──────────────────────────────────────────

  const telechargerRapportPdf = async () => {
    setTelechargementPdf(true);
    try {
      const res = await api.get(`/incidents/${id}/rapport-pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `rapport-${incident.numeroReference}.pdf`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Erreur lors du téléchargement du rapport PDF.");
    } finally {
      setTelechargementPdf(false);
    }
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
          url:    jsonImgBB.data.url,
          nom:    fichier.name,
          type:   "IMAGE",
          taille: fichier.size,
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

  // ── Commentaires (espace collaboratif) ─────────────────────────────────────

  const chargerCommentaires = async () => {
    const res = await api.get(`/incidents/${id}/commentaires`);
    setCommentaires(res.data.data || []);
  };

  const envoyerCommentaire = async () => {
    if (!nouveauCommentaire.trim()) return;
    setEnvoiCommentaire(true);
    try {
      await api.post(`/incidents/${id}/commentaires`, { contenu: nouveauCommentaire.trim() });
      setNouveauCommentaire("");
      await chargerCommentaires();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'envoi du commentaire.");
    } finally {
      setEnvoiCommentaire(false);
    }
  };

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
      <div className="flex items-center gap-1.5 mb-4 text-xs text-[#64748B]">
        <Link to="/incidents" className="hover:text-[#0D2B4E] transition-colors">Incidents</Link>
        <span>/</span>
        <span className="text-[#1E293B] font-medium">{incident.numeroReference}</span>
      </div>

      {/* ── En-tête (sans cadre) ── */}
      <div className="flex items-start justify-between mb-6 pb-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-[#0D2B4E]">{incident.numeroReference}</h1>
          <Badge variant={incident.gravite} />
          <Badge variant={incident.statut} />
        </div>
        {(isQhse || isAdmin) && (
          <button onClick={telechargerRapportPdf} disabled={telechargementPdf}
            className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-[#0D2B4E] hover:underline disabled:opacity-50 transition-colors">
            <Download size={14} strokeWidth={2.2} />
            {telechargementPdf ? "Génération…" : "Télécharger le PDF"}
          </button>
        )}
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

      {/* ── Informations (sans cadre, fond léger pour regrouper) ── */}
      <div className="mb-6 p-5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-stretch gap-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-[#1E293B] mb-4">Informations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 mb-5">
            <LigneInfo label="Type">{LABELS_TYPE[incident.type] ?? incident.type}</LigneInfo>
            <LigneInfo label="Site">{incident.site?.nom}</LigneInfo>
            <LigneInfo label="Déclarant">
              {incident.declarePar ? `${incident.declarePar.prenom} ${incident.declarePar.nom}` : "—"}
            </LigneInfo>
            <LigneInfo label="Date">{dateIncident}</LigneInfo>
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
            {incident.latitude && incident.longitude && (
              <LigneInfo label="Coordonnées GPS">{incident.latitude}, {incident.longitude}</LigneInfo>
            )}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-[#1E293B] leading-relaxed">{incident.description}</p>
          </div>

          {incident.motifRejet && (
            <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-[10px] font-semibold text-[#DC2626] uppercase tracking-wide mb-1">
                Motif de rejet
              </p>
              <p className="text-sm text-[#DC2626]">{incident.motifRejet}</p>
            </div>
          )}
        </div>

        {/* Photo principale — encadrée, proportions d'origine conservées (pas de recadrage) */}
        {incident.photoUrl && (
          <div className="shrink-0 w-96 rounded-lg overflow-hidden border border-[#E2E8F0] bg-[#F1F5F9]">
            <a href={incident.photoUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img src={incident.photoUrl} alt="Photo de l'incident"
                className="w-full h-auto hover:opacity-90 transition" />
            </a>
            <p className="px-3 py-2 text-[11px] text-[#64748B] text-center border-t border-[#E2E8F0]">
              Photo jointe à la déclaration
            </p>
          </div>
        )}
      </div>

      {/* ── Actions correctives + Analyse des causes (côte à côte) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6 items-start">
        <div className="p-5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-[#1E293B]">Actions correctives</h2>
              <p className="text-xs text-[#64748B] mt-0.5">{actions.length} action(s)</p>
            </div>
            {isQhse && (
              <button onClick={() => setShowAjout(true)}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors"
                style={{ backgroundColor: "#0D2B4E" }}>
                + Ajouter
              </button>
            )}
          </div>
          <div className="divide-y divide-[#E2E8F0] overflow-y-auto" style={{ maxHeight: 420 }}>
            {actions.length === 0 ? (
              <p className="py-10 text-center text-[#94A3B8] text-sm">
                Aucune action corrective enregistrée
              </p>
            ) : (
              actions.map((action) => (
                <ActionCorrectiveItem
                  key={action.id}
                  action={action}
                  isQhse={isQhse}
                  enSuppression={suppressionActionIds.has(action.id)}
                  onCloturer={() => setActionCloture(action)}
                  onModifier={() => setActionModif(action)}
                  onSupprimer={() => supprimerAction(action.id)}
                />
              ))
            )}
          </div>
        </div>

        <AnalyseCausesApercu incident={incident} peutGerer={isQhse} />
      </div>

      {/* ── Zone basse : Historique + Espace collaboratif ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">

        {/* Historique — lecture seule, immuable */}
        <div className="p-5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
          <h2 className="text-base font-semibold text-[#1E293B]">
            Historique
            {historique.length > 0 && (
              <span className="ml-2 text-[11px] font-normal text-[#94A3B8]">
                {historique.length} entrée{historique.length > 1 ? "s" : ""}
              </span>
            )}
          </h2>
          <p className="flex items-center gap-1 text-[11px] text-[#94A3B8] mt-0.5 mb-4">
            <Lock size={10} /> Immuable — preuve de traçabilité
          </p>
          <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
            {historique.length === 0 ? (
              <p className="text-sm text-[#94A3B8] py-8">Aucune entrée d'historique.</p>
            ) : (
              <ol>
                {historique.map((entree, i) => {
                  const isLast = i === historique.length - 1;
                  return (
                    <li key={entree.id} className="flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0D2B4E] border-2 border-white ring-1 ring-[#CBD5E1] mt-1 shrink-0" />
                        {!isLast && <div className="w-px flex-1 bg-[#E2E8F0] my-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-[#1E293B] leading-snug">{entree.action}</p>
                        {entree.details && (
                          <p className="text-xs text-[#64748B] mt-0.5 italic">{entree.details}</p>
                        )}
                        <p className="text-xs text-[#94A3B8] mt-1">
                          {entree.auteur ? `${entree.auteur.prenom} ${entree.auteur.nom}` : "Système"}
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
        </div>

        {/* Espace collaboratif — pièces jointes + commentaires */}
        <div className="p-5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
          <h2 className="text-base font-semibold text-[#1E293B] mb-4">Espace collaboratif</h2>

          {/* Pièces jointes */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide">
              Pièces jointes ({pieces.length})
            </p>
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

          {uploadsEnCours.length > 0 && (
            <div className="mb-3 space-y-2">
              {uploadsEnCours.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 text-xs text-[#64748B]">
                  <Spinner size={3} />
                  <span className="truncate max-w-xs">{u.nom}</span>
                  <span className="text-[#94A3B8]">Envoi en cours…</span>
                </div>
              ))}
            </div>
          )}

          {uploadsErreur.length > 0 && (
            <div className="mb-3 space-y-2">
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

          {pieces.length === 0 && uploadsEnCours.length === 0 ? (
            <p className="text-sm text-[#94A3B8] py-3">
              Aucune pièce jointe — cliquez sur « + Ajouter » pour en ajouter une.
            </p>
          ) : (
            <div className="space-y-2">
              {pieces.map((piece) => (
                <PieceJointeRow
                  key={piece.id}
                  piece={piece}
                  peutSupprimer={isQhse || piece.ajouteParId === user?.id}
                  enSuppression={suppressionIds.has(piece.id)}
                  onSupprimer={() => supprimerPiece(piece.id)}
                />
              ))}
            </div>
          )}

          {/* Commentaires */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">
              Commentaires ({commentaires.length})
            </p>

            {commentaires.length === 0 ? (
              <p className="text-sm text-[#94A3B8] mb-4">Aucun commentaire pour le moment.</p>
            ) : (
              <div className="space-y-4 mb-4 overflow-y-auto" style={{ maxHeight: 340 }}>
                {commentaires.map((c) => <CommentaireItem key={c.id} commentaire={c} />)}
              </div>
            )}

            <div className="flex items-start gap-2">
              <textarea value={nouveauCommentaire} onChange={(e) => setNouveauCommentaire(e.target.value)}
                rows={2} placeholder="Ajouter un commentaire…"
                className={`${inputCls} resize-none flex-1`} />
              <button type="button" onClick={envoyerCommentaire} disabled={envoiCommentaire || !nouveauCommentaire.trim()}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "#0D2B4E" }}>
                <Send size={13} strokeWidth={2.2} /> Envoyer
              </button>
            </div>
          </div>
        </div>
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
