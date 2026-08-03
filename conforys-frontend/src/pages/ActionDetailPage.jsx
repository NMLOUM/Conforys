import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft, ListChecks, Calendar, History, Pencil, Check, MessageSquare,
  Plus, Send, FileText, Image as ImageIcon, Download, UploadCloud, MapPin,
} from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import AvatarInitiales from "../components/ui/AvatarInitiales";
import { useRole } from "../hooks/useRole";
import { useAuthStore } from "../store/authStore";

// ── Charte du mockup CAPA (appliquée au contenu de cette page uniquement) ────
const C = {
  primary:          "#0D2B4E",
  primaryContainer: "rgba(3, 22, 53, 0.06)",
  secondary:        "#974900",
  secondaryContainer: "#fc7d00",
  secondaryFixed:   "#ffdbc7",
  onSecondaryContainer: "#5b2900",
  outlineVariant:   "#c5c6cf",
  surface:          "#f8f9ff",
  onSurfaceVariant: "#64748B",
  error:            "#DC2626",
  success:          "#2E7D32",
};

const TYPES_ACCEPTES   = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_OCTET = 5 * 1024 * 1024;

const validerFichier = (fichier) => {
  if (!TYPES_ACCEPTES.includes(fichier.type)) return "Type non supporté. Formats acceptés : JPG, PNG, WebP.";
  if (fichier.size > TAILLE_MAX_OCTET) return `Fichier trop volumineux (${(fichier.size / 1024 / 1024).toFixed(1)} Mo). Limite : 5 Mo.`;
  return null;
};

const estEnRetard = (a) =>
  a?.dateLimite && new Date(a.dateLimite) < new Date() && a.statut !== "TERMINE" && a.statut !== "ANNULE";

function Spinner({ size = 4 }) {
  return <div className={`w-${size} h-${size} border-2 border-white/60 border-t-transparent rounded-full animate-spin shrink-0`} />;
}

const inputCls =
  "w-full px-3 py-2.5 text-sm border rounded-lg bg-white text-[#1E293B] placeholder-[#94A3B8]" +
  " focus:outline-none focus:ring-2 transition";

// ── Étape de la checklist (bordure gauche colorée façon mockup) ──────────────
function EtapeItem({ etape, peutGerer, onToggle, onSupprimer }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border-l-4"
      style={{
        backgroundColor: etape.complete ? "rgba(3,22,53,0.03)" : C.surface,
        borderLeftColor: etape.complete ? C.secondaryContainer : C.outlineVariant,
      }}>
      <input type="checkbox" checked={etape.complete} disabled={!peutGerer} onChange={() => onToggle(etape)}
        className="mt-1 w-5 h-5 rounded shrink-0" style={{ accentColor: C.primary }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <p className="text-sm text-[#1E293B]">{etape.libelle}</p>
          {etape.complete ? (
            <span className="text-[11px] text-[#94A3B8] shrink-0">
              Complété le {new Date(etape.updatedAt).toLocaleDateString("fr-FR")}
            </span>
          ) : (
            <span className="text-xs font-semibold shrink-0" style={{ color: "#EA580C" }}>À faire</span>
          )}
        </div>
      </div>
      {peutGerer && (
        <button type="button" onClick={() => onSupprimer(etape)} className="shrink-0 text-xs" style={{ color: C.outlineVariant }}>
          ✕
        </button>
      )}
    </div>
  );
}

// ── Une entrée du journal d'audit unifié (historique + commentaires) ────────
function EntreeJournal({ entree, isLast }) {
  const estCommentaire = entree.nature === "commentaire";
  const Icone = estCommentaire ? MessageSquare
    : entree.action?.startsWith("Étape complétée") ? Check
    : entree.action?.startsWith("Étape") ? ListChecks
    : entree.action?.startsWith("Statut") ? Pencil
    : entree.action === "Action créée" ? Plus
    : Pencil;
  const bg = estCommentaire ? "#eceef4" : entree.action === "Action créée" ? C.outlineVariant : C.primary;
  const fg = estCommentaire ? C.primary : "white";

  return (
    <div className="relative pl-8">
      {!isLast && <div className="absolute left-3 top-0 bottom-0 w-px" style={{ backgroundColor: C.outlineVariant }} />}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: bg, color: fg }}>
        <Icone size={12} />
      </div>
      <div className="pb-5">
        <p className="text-sm font-medium text-[#1E293B]">
          {estCommentaire ? `${entree.auteur.prenom} ${entree.auteur.nom}` : entree.action}
        </p>
        <p className="text-sm text-[#475569]">
          {estCommentaire ? entree.contenu : entree.details || null}
        </p>
        <span className="text-[11px] font-normal mt-1 block" style={{ color: "#94A3B8" }}>
          {new Date(entree.date).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ── Pièce jointe (documents joints) ──────────────────────────────────────────
function DocumentRow({ piece, peutSupprimer, enSuppression, onSupprimer }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#c5c6cf]"
      style={{ backgroundColor: C.surface }}>
      <a href={piece.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 min-w-0 flex-1">
        {piece.type === "DOCUMENT"
          ? <FileText size={18} color={C.error} />
          : <ImageIcon size={18} color={C.primary} />}
        <span className="text-sm truncate" style={{ color: "#1E293B" }}>{piece.nom || "Fichier"}</span>
      </a>
      <div className="flex items-center gap-2 shrink-0">
        <a href={piece.url} target="_blank" rel="noopener noreferrer" title="Télécharger">
          <Download size={16} color={C.onSurfaceVariant} />
        </a>
        {peutSupprimer && (
          <button type="button" onClick={onSupprimer} disabled={enSuppression} title="Supprimer"
            className="text-xs disabled:opacity-40" style={{ color: C.error }}>
            {enSuppression ? <Spinner size={3} /> : "✕"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Modale de clôture ─────────────────────────────────────────────────────────
function ModalCloturerAction({ onSuccess, onClose }) {
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async () => {
    if (commentaire.trim().length < 5) { setErreur("Le commentaire doit faire au moins 5 caractères."); return; }
    setErreur(""); setEnvoi(true);
    try { await onSuccess(commentaire); }
    catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la clôture.";
      setErreur(msg);
      toast.error(msg);
    }
    finally { setEnvoi(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: C.outlineVariant }}>
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Clôturer l'action</h3>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f8f9ff]">&#x2715;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {erreur && <p className="text-xs p-3 rounded-lg" style={{ color: C.error, backgroundColor: "#ffdad6" }}>{erreur}</p>}
          <div>
            <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Commentaire de clôture *</label>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={4}
              placeholder="Décrivez comment l'action a été réalisée…" className={`${inputCls} resize-none`}
              style={{ borderColor: C.outlineVariant }} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: C.outlineVariant }}>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-lg border" style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>Annuler</button>
          <button type="button" onClick={soumettre} disabled={envoi} className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: C.success }}>
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
    description: action.description, priorite: action.priorite, statut: action.statut,
    dateLimite: action.dateLimite ? new Date(action.dateLimite).toISOString().split("T")[0] : "",
    responsableId: action.responsableId,
  });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const soumettre = async () => {
    if (form.description.trim().length < 5) { setErreur("La description doit faire au moins 5 caractères."); return; }
    setErreur(""); setEnvoi(true);
    try { await onSuccess(form); }
    catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la modification.";
      setErreur(msg);
      toast.error(msg);
    }
    finally { setEnvoi(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: C.outlineVariant }}>
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Modifier l'action</h3>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f8f9ff]">&#x2715;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {erreur && <p className="text-xs p-3 rounded-lg" style={{ color: C.error, backgroundColor: "#ffdad6" }}>{erreur}</p>}
          <div>
            <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Description *</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3}
              className={`${inputCls} resize-none`} style={{ borderColor: C.outlineVariant }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Priorité</label>
              <select value={form.priorite} onChange={(e) => set("priorite", e.target.value)} className={inputCls} style={{ borderColor: C.outlineVariant }}>
                <option value="FAIBLE">Faible</option><option value="MOYEN">Moyen</option><option value="ELEVE">Élevé</option><option value="CRITIQUE">Critique</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Statut</label>
              <select value={form.statut} onChange={(e) => set("statut", e.target.value)} className={inputCls} style={{ borderColor: C.outlineVariant }}>
                <option value="A_FAIRE">À faire</option><option value="EN_COURS">En cours</option><option value="ANNULE">Annulé</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Date limite</label>
              <input type="date" value={form.dateLimite} onChange={(e) => set("dateLimite", e.target.value)} className={inputCls} style={{ borderColor: C.outlineVariant }} />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: C.onSurfaceVariant }}>Responsable</label>
              <select value={form.responsableId} onChange={(e) => set("responsableId", e.target.value)} className={inputCls} style={{ borderColor: C.outlineVariant }}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: C.outlineVariant }}>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-lg border" style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>Annuler</button>
          <button type="button" onClick={soumettre} disabled={envoi} className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: C.primary }}>
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function ActionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isQhse, isEmploye } = useRole();
  const user = useAuthStore((s) => s.user);

  const [action, setAction] = useState(null);
  const [etapes, setEtapes] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [commentaires, setCommentaires] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [users, setUsers] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurPage, setErreurPage] = useState("");

  const [nouvelleEtape, setNouvelleEtape] = useState("");
  const [nouvelleNote, setNouvelleNote] = useState("");
  const [envoiNote, setEnvoiNote] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [suppressionIds, setSuppIds] = useState(new Set());
  const [progressEnCours, setProgressEnCours] = useState(false);
  const [showCloture, setShowCloture] = useState(false);
  const [showModif, setShowModif] = useState(false);

  useEffect(() => {
    document.title = "Détail action corrective";
    charger();
    if (isQhse) api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
    return () => { document.title = "CONFORYS"; };
  }, [id]);

  const charger = async () => {
    setChargement(true); setErreurPage("");
    try {
      const resAction = await api.get(`/actions/${id}`);
      setAction(resAction.data.data);
      const [resEtapes, resHist, resComm, resPieces] = await Promise.allSettled([
        api.get(`/actions/${id}/etapes`),
        api.get(`/actions/${id}/historique`),
        api.get(`/actions/${id}/commentaires`),
        api.get(`/actions/${id}/pieces-jointes`),
      ]);
      if (resEtapes.status === "fulfilled") setEtapes(resEtapes.value.data.data || []);
      if (resHist.status   === "fulfilled") setHistorique(resHist.value.data.data || []);
      if (resComm.status   === "fulfilled") setCommentaires(resComm.value.data.data || []);
      if (resPieces.status === "fulfilled") setPieces(resPieces.value.data.data || []);
    } catch (err) {
      setErreurPage(err.response?.data?.message || "Impossible de charger cette action.");
    } finally { setChargement(false); }
  };

  // ── Checklist ──────────────────────────────────────────────────────────────
  const ajouterEtape = async () => {
    if (!nouvelleEtape.trim()) return;
    try {
      const res = await api.post(`/actions/${id}/etapes`, { libelle: nouvelleEtape.trim() });
      setEtapes((prev) => [...prev, res.data.data]);
      setNouvelleEtape("");
    } catch (err) { toast.error(err.response?.data?.message || "Erreur lors de l'ajout de l'étape."); }
  };

  const toggleEtape = async (etape) => {
    setEtapes((prev) => prev.map((e) => e.id === etape.id ? { ...e, complete: !e.complete } : e));
    try {
      const res = await api.put(`/actions/${id}/etapes/${etape.id}`, { complete: !etape.complete });
      setEtapes((prev) => prev.map((e) => e.id === etape.id ? res.data.data : e));
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la mise à jour de l'étape.");
      setEtapes((prev) => prev.map((e) => e.id === etape.id ? etape : e));
    }
  };

  const supprimerEtape = async (etape) => {
    setEtapes((prev) => prev.filter((e) => e.id !== etape.id));
    try { await api.delete(`/actions/${id}/etapes/${etape.id}`); }
    catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression de l'étape.");
      setEtapes((prev) => [...prev, etape].sort((a, b) => a.ordre - b.ordre));
    }
  };

  // ── Workflow ───────────────────────────────────────────────────────────────
  const commencer = async () => {
    setProgressEnCours(true);
    try {
      const res = await api.put(`/actions/${id}/progresser`);
      setAction(res.data.data);
      toast.success("Action marquée EN COURS");
      charger();
    } catch (err) { toast.error(err.response?.data?.message || "Impossible de démarrer cette action."); }
    finally { setProgressEnCours(false); }
  };

  const cloturer = async (commentaireCloture) => {
    const res = await api.put(`/actions/${id}/cloturer`, { commentaireCloture });
    setAction(res.data.data);
    toast.success("Action clôturée avec succès");
    setShowCloture(false);
    charger();
  };

  const modifier = async (form) => {
    const res = await api.put(`/actions/${id}`, {
      description: form.description, priorite: form.priorite, statut: form.statut,
      dateLimite: form.dateLimite || null, responsableId: form.responsableId,
    });
    setAction(res.data.data);
    toast.success("Action modifiée avec succès");
    setShowModif(false);
    charger();
  };

  const supprimer = async () => {
    if (!window.confirm("Supprimer définitivement cette action corrective ?")) return;
    try { await api.delete(`/actions/${id}`); toast.success("Action supprimée"); navigate("/actions"); }
    catch (err) { toast.error(err.response?.data?.message || "Erreur lors de la suppression."); }
  };

  // ── Pièces jointes ─────────────────────────────────────────────────────────
  const chargerPieces = async () => {
    const res = await api.get(`/actions/${id}/pieces-jointes`);
    setPieces(res.data.data || []);
  };

  const handleFichiers = async (e) => {
    const fichiers = Array.from(e.target.files || []);
    e.target.value = "";
    if (!fichiers.length) return;
    for (const fichier of fichiers) {
      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const erreurValidation = validerFichier(fichier);
      if (erreurValidation) { setUploads((prev) => [...prev, { id: tempId, nom: fichier.name, statut: "erreur", erreur: erreurValidation }]); continue; }
      setUploads((prev) => [...prev, { id: tempId, nom: fichier.name, statut: "envoi" }]);
      try {
        const fd = new FormData(); fd.append("image", fichier);
        const resImgBB = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, { method: "POST", body: fd });
        const jsonImgBB = await resImgBB.json();
        if (!jsonImgBB.success) throw new Error(jsonImgBB.error?.message || "Échec de l'upload ImgBB.");
        await api.post(`/actions/${id}/pieces-jointes`, { url: jsonImgBB.data.url, nom: fichier.name, type: "IMAGE", taille: fichier.size });
        setUploads((prev) => prev.filter((u) => u.id !== tempId));
        toast.success("Document ajouté");
        await chargerPieces();
      } catch (err) {
        const msg = err.message?.includes("Failed to fetch") ? "Impossible de joindre ImgBB. Vérifiez votre connexion." : err.response?.data?.message || err.message || "Erreur d'upload.";
        setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, statut: "erreur", erreur: msg } : u));
      }
    }
  };

  const supprimerPiece = async (pieceId) => {
    setSuppIds((prev) => new Set([...prev, pieceId]));
    try { await api.delete(`/pieces-jointes-action/${pieceId}`); setPieces((prev) => prev.filter((p) => p.id !== pieceId)); }
    catch (err) { toast.error(err.response?.data?.message || "Erreur lors de la suppression."); }
    finally { setSuppIds((prev) => { const s = new Set(prev); s.delete(pieceId); return s; }); }
  };

  // ── Journal (note = commentaire) ──────────────────────────────────────────
  const ajouterNote = async () => {
    if (!nouvelleNote.trim()) return;
    setEnvoiNote(true);
    try {
      await api.post(`/actions/${id}/commentaires`, { contenu: nouvelleNote.trim() });
      setNouvelleNote("");
      const res = await api.get(`/actions/${id}/commentaires`);
      setCommentaires(res.data.data || []);
    } catch (err) { toast.error(err.response?.data?.message || "Erreur lors de l'envoi de la note."); }
    finally { setEnvoiNote(false); }
  };

  if (chargement) {
    return <AppLayout titre="Chargement…"><div className="flex items-center gap-2 text-sm" style={{ color: C.onSurfaceVariant }}><Spinner /> Chargement…</div></AppLayout>;
  }
  if (erreurPage || !action) {
    return (
      <AppLayout titre="Action introuvable">
        <p className="text-sm" style={{ color: C.error }}>{erreurPage || "Action introuvable."}</p>
        <button onClick={() => navigate("/actions")} className="mt-4 text-sm underline" style={{ color: C.primary }}>Retour aux actions</button>
      </AppLayout>
    );
  }

  const peutGerer     = isQhse;
  const peutCommencer = isEmploye && action.responsableId === user?.id && action.statut === "A_FAIRE";
  const totalEtapes   = etapes.length;
  const etapesFaites  = etapes.filter((e) => e.complete).length;
  const progression   = totalEtapes === 0 ? 0 : Math.round((etapesFaites / totalEtapes) * 100);
  const site = action.incident?.site || action.audit?.site || action.risque?.site || null;
  const origine = action.incident
    ? { label: action.incident.numeroReference, href: `/incidents/${action.incident.id}` }
    : action.audit ? { label: action.audit.reference, href: `/audits/${action.audit.id}` }
    : action.risque ? { label: action.risque.danger, href: `/duerp/${action.risque.id}` }
    : null;

  // Journal unifié : historique (immuable) + commentaires (notes), triés du plus récent au plus ancien
  const journal = [
    ...historique.map((h) => ({ nature: "historique", ...h, date: h.dateAction })),
    ...commentaires.map((c) => ({ nature: "commentaire", ...c, date: c.createdAt })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <AppLayout titre="Action corrective">
      <div>

        {/* ── En-tête ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <button onClick={() => navigate("/actions")} className="flex items-center gap-1.5 mb-1" style={{ color: C.onSurfaceVariant }}>
              <ArrowLeft size={16} />
              <span className="text-xs font-semibold uppercase tracking-wide">Retour aux actions</span>
            </button>
            <h1 className="text-2xl font-bold text-navy">CAPA #{action.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-[#1E293B] mt-1 max-w-2xl leading-relaxed">{action.description}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {peutGerer && (
              <button onClick={supprimer}
                className="flex items-center gap-2 border px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                style={{ borderColor: C.outlineVariant, color: C.error }}>
                Supprimer
              </button>
            )}
            {peutCommencer && (
              <button onClick={commencer} disabled={progressEnCours}
                className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: C.primary }}>
                {progressEnCours ? "…" : "Commencer"}
              </button>
            )}
            {peutGerer && action.statut !== "TERMINE" && action.statut !== "ANNULE" && (
              <>
                <button onClick={() => setShowModif(true)}
                  className="flex items-center gap-2 border px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                  style={{ borderColor: C.outlineVariant, color: C.primary }}>
                  <Pencil size={15} /> Modifier
                </button>
                <button onClick={() => setShowCloture(true)}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-opacity hover:opacity-90"
                  style={{ backgroundColor: C.success }}>
                  <Check size={15} /> Clôturer
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Grille bento 12 colonnes ── */}
        <div className="grid grid-cols-12 gap-6">

          {/* Summary card */}
          <section className="col-span-12 lg:col-span-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Responsable</span>
                <AvatarInitiales prenom={action.responsable?.prenom} nom={action.responsable?.nom} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Échéance</span>
                <div className="flex items-center gap-2">
                  <Calendar size={16} color={C.secondary} />
                  <span className="text-sm text-[#1E293B]">
                    {action.dateLimite ? new Date(action.dateLimite).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "Non renseignée"}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Statut / Priorité</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={action.statut} />
                  <Badge variant={action.priorite} />
                  {estEnRetard(action) && <Badge variant="EN_RETARD" />}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Progression</span>
                <span className="text-xl font-bold" style={{ color: C.primary }}>{progression}%</span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#e5eeff" }}>
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progression}%`, backgroundColor: C.primary }} />
              </div>
              {action.commentaireCloture && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: "#dcf5e3" }}>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "#2E7D32" }}>Commentaire de clôture</p>
                  <p className="text-sm" style={{ color: "#1E293B" }}>{action.commentaireCloture}</p>
                </div>
              )}
            </div>
          </section>

          {/* Journal d'audit unifié (historique + notes) — self-start pour ne
              pas s'étirer à la hauteur du Summary+Checklist quand le journal
              a peu d'entrées (sinon grand vide avant le champ de note). */}
          <aside className="col-span-12 lg:col-span-4 lg:row-span-2 lg:self-start bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg overflow-hidden flex flex-col"
            style={{ maxHeight: 720 }}>
            <div className="p-5 border-b" style={{ borderColor: C.outlineVariant }}>
              <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
                <History size={18} color="#0D2B4E" /> Journal d'audit
              </h2>
            </div>
            <div className="flex-1 p-5 overflow-y-auto" style={{ backgroundColor: "rgba(248,249,255,0.3)" }}>
              {journal.length === 0 ? (
                <p className="text-sm" style={{ color: C.onSurfaceVariant }}>Aucune entrée pour le moment.</p>
              ) : (
                journal.map((entree, i) => (
                  <EntreeJournal key={`${entree.nature}-${entree.id}`} entree={entree} isLast={i === journal.length - 1} />
                ))
              )}
            </div>
            <div className="p-4 border-t" style={{ borderColor: C.outlineVariant, backgroundColor: C.surface }}>
              <div className="relative">
                <input value={nouvelleNote} onChange={(e) => setNouvelleNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ajouterNote()}
                  placeholder="Ajouter une note…" disabled={envoiNote}
                  className="w-full bg-white border rounded-lg pl-3 pr-11 py-2 text-sm focus:outline-none focus:ring-2 transition"
                  style={{ borderColor: C.outlineVariant, color: "#1E293B" }} />
                <button type="button" onClick={ajouterNote} disabled={envoiNote || !nouvelleNote.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 disabled:opacity-40" style={{ color: C.primary }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </aside>

          {/* Checklist */}
          <section className="col-span-12 lg:col-span-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
                <ListChecks size={18} color="#0D2B4E" /> Workflow de résolution
              </h2>
              <span className="text-xs text-[#64748B]">
                {etapesFaites}/{totalEtapes} étape(s)
              </span>
            </div>
            <div className="space-y-3 mb-4">
              {etapes.length === 0 ? (
                <p className="text-sm py-3" style={{ color: C.onSurfaceVariant }}>Aucune étape définie pour cette action.</p>
              ) : (
                etapes.map((etape) => (
                  <EtapeItem key={etape.id} etape={etape} peutGerer={peutGerer || peutCommencer}
                    onToggle={toggleEtape} onSupprimer={supprimerEtape} />
                ))
              )}
            </div>
            {(peutGerer || peutCommencer) && (
              <div className="flex items-center gap-2">
                <input value={nouvelleEtape} onChange={(e) => setNouvelleEtape(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ajouterEtape()}
                  placeholder="Ajouter une étape…" className={inputCls} style={{ borderColor: C.outlineVariant }} />
                <button type="button" onClick={ajouterEtape}
                  className="shrink-0 flex items-center gap-1.5 font-medium text-xs hover:underline" style={{ color: C.primary }}>
                  <Plus size={15} /> Ajouter
                </button>
              </div>
            )}
          </section>

          {/* Localisation (site réel de l'origine, sans carte décorative) */}
          <section className="col-span-12 lg:col-span-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-6 flex flex-col items-center justify-center text-center">
            <MapPin size={32} color={C.secondaryContainer} className="mb-2" />
            <h2 className="text-lg font-semibold text-navy">Localisation</h2>
            <p className="text-sm mt-1" style={{ color: C.onSurfaceVariant }}>
              {site?.nom || "Site non renseigné"}
            </p>
            {origine && (
              <Link to={origine.href} className="mt-3 text-xs font-medium hover:underline" style={{ color: C.secondary }}>
                Voir l'origine : {origine.label}
              </Link>
            )}
          </section>

          {/* Documents joints */}
          <section className="col-span-12 lg:col-span-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
              <FileText size={18} color="#0D2B4E" /> Documents joints
            </h2>

            {uploads.filter((u) => u.statut === "envoi").length > 0 && (
              <div className="mb-3 space-y-2">
                {uploads.filter((u) => u.statut === "envoi").map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-xs" style={{ color: C.onSurfaceVariant }}>
                    <Spinner size={3} /> <span className="truncate">{u.nom}</span> Envoi…
                  </div>
                ))}
              </div>
            )}
            {uploads.filter((u) => u.statut === "erreur").length > 0 && (
              <div className="mb-3 space-y-2">
                {uploads.filter((u) => u.statut === "erreur").map((u) => (
                  <p key={u.id} className="text-xs px-2 py-1.5 rounded" style={{ color: C.error, backgroundColor: "#ffdad6" }}>
                    {u.nom} : {u.erreur}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-2 mb-3">
              {pieces.length === 0 ? (
                <p className="text-sm" style={{ color: C.onSurfaceVariant }}>Aucun document joint.</p>
              ) : (
                pieces.map((piece) => (
                  <DocumentRow key={piece.id} piece={piece}
                    peutSupprimer={isQhse || piece.ajouteParId === user?.id}
                    enSuppression={suppressionIds.has(piece.id)}
                    onSupprimer={() => supprimerPiece(piece.id)} />
                ))
              )}
            </div>

            <label className="w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center cursor-pointer transition-colors"
              style={{ borderColor: C.outlineVariant, color: C.onSurfaceVariant }}>
              <UploadCloud size={22} />
              <span className="text-xs font-medium mt-2">Déposer un nouveau fichier</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFichiers} className="sr-only" />
            </label>
          </section>
        </div>
      </div>

      {showCloture && <ModalCloturerAction onSuccess={cloturer} onClose={() => setShowCloture(false)} />}
      {showModif && <ModalModifierAction action={action} users={users} onSuccess={modifier} onClose={() => setShowModif(false)} />}
    </AppLayout>
  );
}

export default ActionDetailPage;
