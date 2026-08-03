import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, FileText, Send, Download, Info, History, MessageSquare, AlertCircle, Paperclip, MessageCircle, AlertTriangle, Plus, Pencil, ListChecks, Image as ImageIcon } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";
import { useAuthStore } from "../store/authStore";
import AnalyseCausesApercu from "../components/incidents/AnalyseCausesApercu";
import ActionCorrectiveDirecte from "../components/incidents/ActionCorrectiveDirecte";
import ModalRejeterIncident from "../components/incidents/ModalRejeterIncident";
import ModalValiderIncident from "../components/incidents/ModalValiderIncident";

// ── Constantes ────────────────────────────────────────────────────────────────

const LABELS_TYPE = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presqu'accident",
  SITUATION_DANGEREUSE:     "Situation dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Incident environnemental",
};

// Couleur d'accent selon la gravité — même palette que la page liste (CONFIGS_GRAVITE)
const COULEUR_GRAVITE = { FAIBLE: "#2E7D32", MOYEN: "#CA8A04", GRAVE: "#EA580C", CRITIQUE: "#DC2626" };

// ── Stepper visuel du workflow (Brouillon → Ouvert → En cours → Clôturé) ─────
// REJETE est un embranchement depuis OUVERT, pas une étape de la suite
// linéaire : affiché à part plutôt que forcé dans la même frise.
const ETAPES_WORKFLOW = ["BROUILLON", "OUVERT", "EN_COURS", "CLOS"];
const LABELS_ETAPE_WORKFLOW = { BROUILLON: "Brouillon", OUVERT: "Ouvert", EN_COURS: "En cours", CLOS: "Clôturé" };

function EtapesWorkflow({ statut }) {
  if (statut === "REJETE") {
    return (
      <div className="flex items-center gap-2 mb-5 text-xs font-semibold" style={{ color: "#DC2626" }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "#DC2626" }} />
        Incident rejeté : le suivi normal (validation, traitement, clôture) s'arrête ici.
      </div>
    );
  }

  const indexActuel = ETAPES_WORKFLOW.indexOf(statut);

  return (
    <div className="flex items-center mb-5">
      {ETAPES_WORKFLOW.map((etape, i) => {
        const estFait   = i < indexActuel;
        const estActuel = i === indexActuel;
        const couleurPastille = estActuel && etape === "CLOS" ? "#2E7D32" : estFait || estActuel ? "#0D2B4E" : "#CBD5E1";
        return (
          <div key={etape} className={`flex items-center ${i < ETAPES_WORKFLOW.length - 1 ? "flex-1" : ""}`}>
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: couleurPastille }}>
                {estFait ? "✓" : i + 1}
              </span>
              <span className="text-xs font-medium whitespace-nowrap"
                style={{ color: estFait || estActuel ? "#1E293B" : "#94A3B8" }}>
                {LABELS_ETAPE_WORKFLOW[etape]}
              </span>
            </div>
            {i < ETAPES_WORKFLOW.length - 1 && (
              <div className="flex-1 h-px mx-3" style={{ backgroundColor: estFait ? "#0D2B4E" : "#E2E8F0" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Couleur des points de la frise d'historique, selon le type d'événement —
// donne un vrai repère visuel (bleu = déclaration, orange = changement de
// statut, vert = clôture, rouge = rejet) au lieu d'un point navy uniforme.
const couleurHistorique = (action) => {
  if (action.startsWith("Incident déclaré"))   return "#2563EB";
  if (action.includes("CLOS"))                  return "#2E7D32";
  if (action.includes("REJETE"))                return "#DC2626";
  if (action.startsWith("Statut changé"))        return "#EA580C";
  if (action.startsWith("Action corrective"))    return "#0D2B4E";
  if (action.startsWith("Photo"))                return "#64748B";
  return "#94A3B8";
};

// Icône de la pastille de la frise, selon le type d'événement — même principe
// que le journal d'audit CAPA (pastille pleine + icône blanche).
const iconeHistorique = (action) => {
  if (action.startsWith("Incident déclaré"))   return Plus;
  if (action.startsWith("Statut changé"))       return Pencil;
  if (action.startsWith("Action corrective"))   return ListChecks;
  if (action.startsWith("Photo"))               return ImageIcon;
  return History;
};

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

// ── Composants utilitaires ────────────────────────────────────────────────────

function LigneInfo({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-[#1E293B] break-words">{children || "—"}</p>
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
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
        style={{ backgroundColor: "#0D2B4E" }}>
        {initiales || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-[#1E293B]">
            {commentaire.auteur ? `${commentaire.auteur.prenom} ${commentaire.auteur.nom}` : "Utilisateur"}
          </p>
          <p className="text-[11px] text-[#94A3B8]">
            {new Date(commentaire.createdAt).toLocaleString("fr-FR", {
              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <p className="text-sm text-[#475569] mt-0.5 whitespace-pre-wrap break-words">{commentaire.contenu}</p>
      </div>
    </div>
  );
}

// ── Modale de modification des informations de l'incident ───────────────────
// Champs volontairement restreints aux données factuelles (le workflow —
// statut, déclarant, validation, assignation — ne se modifie que via ses
// actions dédiées, jamais ici, cf. updateIncidentSchema côté backend).

const dateVersInputLocal = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function ModalModifierIncident({ incident, onConfirm, onClose }) {
  const [form, setForm] = useState({
    type:           incident.type,
    gravite:        incident.gravite,
    description:    incident.description,
    dateIncident:   dateVersInputLocal(incident.dateIncident),
    adresseLisible: incident.adresseLisible || "",
  });
  const [erreur, setErreur] = useState("");
  const [envoi,  setEnvoi]  = useState(false);

  const majChamp = (champ, valeur) => setForm((f) => ({ ...f, [champ]: valeur }));

  const confirmer = async () => {
    if (!form.description.trim() || form.description.trim().length < 10) {
      setErreur("La description doit faire au moins 10 caractères.");
      return;
    }
    setErreur("");
    setEnvoi(true);
    try {
      await onConfirm({ ...form, description: form.description.trim() });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Modifier l'incident</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Type</label>
              <select value={form.type} onChange={(e) => majChamp("type", e.target.value)} className={inputCls}>
                {Object.entries(LABELS_TYPE).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Gravité</label>
              <select value={form.gravite} onChange={(e) => majChamp("gravite", e.target.value)} className={inputCls}>
                <option value="FAIBLE">Faible</option>
                <option value="MOYEN">Moyen</option>
                <option value="GRAVE">Grave</option>
                <option value="CRITIQUE">Critique</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Date et heure</label>
            <input type="datetime-local" value={form.dateIncident}
              onChange={(e) => majChamp("dateIncident", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">
              Lieu précis <span className="font-normal normal-case">(optionnel)</span>
            </label>
            <input type="text" value={form.adresseLisible}
              onChange={(e) => majChamp("adresseLisible", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={(e) => majChamp("description", e.target.value)}
              rows={4} className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button type="button" onClick={confirmer} disabled={envoi}
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

function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isQhse, isAdmin } = useRole();
  const user = useAuthStore((s) => s.user);

  // Données
  const [incident,     setIncident]     = useState(null);
  const [pieces,       setPieces]       = useState([]);
  const [historique,   setHistorique]   = useState([]);
  const [commentaires, setCommentaires] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [telechargementPdf, setTelechargementPdf] = useState(false);
  const [erreurPage, setErreurPage] = useState("");

  // Workflow de statut
  const [actionStatutEnCours, setActionStatutEnCours] = useState(false);
  const [erreurStatut,        setErreurStatut]        = useState("");
  const [showModalRejet,      setShowModalRejet]      = useState(false);
  const [showModalValider,    setShowModalValider]    = useState(false);
  const [showModalModifier,   setShowModalModifier]   = useState(false);
  const [users,               setUsers]               = useState([]);

  // État des uploads en cours — chaque entrée : { id, nom, statut, erreur? }
  const [uploads,         setUploads]         = useState([]);
  // IDs de pièces en cours de suppression
  const [suppressionIds,  setSuppIds]         = useState(new Set());
  // Espace collaboratif — commentaires
  const [nouveauCommentaire, setNouveauCommentaire] = useState("");
  const [envoiCommentaire,   setEnvoiCommentaire]   = useState(false);

  // Synchronise la hauteur de la colonne droite (Historique + Espace
  // collaboratif) sur celle, mesurée, de la colonne gauche (Informations +
  // Analyse + Action corrective) — les deux colonnes se terminent ainsi
  // toujours ensemble, sans espace vide quel que soit le contenu de chacune.
  const colGaucheRef = useRef(null);
  const [hauteurColGauche, setHauteurColGauche] = useState(null);

  useEffect(() => {
    // `incident` peut devenir vrai avant que `chargement` ne repasse à false
    // (chargement des sous-ressources encore en cours) : à ce moment-là, la
    // colonne n'est pas encore montée et la ref est nulle. On dépend aussi de
    // `chargement` pour relancer l'effet une fois le rendu principal affiché.
    if (chargement || !incident || !colGaucheRef.current) return;
    const el = colGaucheRef.current;
    const observer = new ResizeObserver(([entry]) => {
      setHauteurColGauche(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [incident, chargement]);

  useEffect(() => {
    document.title = "Détail incident";
    charger();
    if (isQhse) api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
    return () => { document.title = "CONFORYS"; };
  }, [id]);

  // Charge l'incident et ses pièces jointes en parallèle.
  // Les sous-ressources (pièces, historique, commentaires) n'empêchent pas
  // l'affichage si elles échouent.
  const charger = async () => {
    setChargement(true);
    setErreurPage("");
    try {
      const resInc = await api.get(`/incidents/${id}`);
      setIncident(resInc.data.data);

      // Chargement non-bloquant des sous-ressources
      const [resPieces, resHist, resComm] = await Promise.allSettled([
        api.get(`/incidents/${id}/pieces-jointes`),
        api.get(`/incidents/${id}/historique`),
        api.get(`/incidents/${id}/commentaires`),
      ]);
      if (resPieces.status === "fulfilled") setPieces(resPieces.value.data.data    || []);
      if (resHist.status   === "fulfilled") setHistorique(resHist.value.data.data  || []);
      if (resComm.status   === "fulfilled") setCommentaires(resComm.value.data.data || []);
    } catch (e) {
      setErreurPage("Impossible de charger l'incident.");
    } finally {
      setChargement(false);
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

  const confirmerValider = async (employeId) => {
    await changerStatut("valider", { employeId });
    setShowModalValider(false);
  };

  const confirmerModification = async (form) => {
    try {
      await api.put(`/incidents/${id}`, form);
      toast.success("Incident modifié");
      setShowModalModifier(false);
      await charger();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la modification de l'incident.");
    }
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
      toast.error(err.response?.data?.message || "Erreur lors de la suppression de la pièce jointe.");
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

  // Conditions du workflow — remontées ici (au lieu d'une IIFE dans le JSX)
  // car elles servent à la fois pour les boutons de l'en-tête et le message
  // d'aide juste en dessous.
  const estDeclarant       = user?.id === incident.declarePar?.id;
  const peutSoumettre      = incident.statut === "BROUILLON" && estDeclarant;
  const peutValiderRejeter = incident.statut === "OUVERT"    && isQhse;
  const peutCloturer       = incident.statut === "EN_COURS"  && isQhse;
  const aDesActionsWorkflow = peutSoumettre || peutValiderRejeter || peutCloturer;

  return (
    <AppLayout titre={`Incident ${incident.numeroReference}`}>

      {/* ── Fil d'Ariane ── */}
      <div className="flex items-center gap-1.5 mb-4 text-xs text-[#64748B]">
        <Link to="/incidents" className="hover:text-[#0D2B4E] transition-colors">Incidents</Link>
        <span>/</span>
        <span className="text-[#1E293B] font-medium">{incident.numeroReference}</span>
      </div>

      {/* ── En-tête pleine largeur : référence, badges, actions ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap pl-4 border-l-4"
        style={{ borderLeftColor: COULEUR_GRAVITE[incident.gravite] || "#94A3B8" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-navy">{incident.numeroReference}</h1>
          <Badge variant={incident.gravite} />
          <Badge variant={incident.statut} />
        </div>
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {peutSoumettre && (
            <button onClick={() => changerStatut("soumettre")} disabled={actionStatutEnCours}
              className="px-3 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
              style={{ backgroundColor: "#0D2B4E" }}>
              {actionStatutEnCours ? "…" : "Soumettre"}
            </button>
          )}
          {peutValiderRejeter && (
            <>
              <button onClick={() => setShowModalValider(true)} disabled={actionStatutEnCours}
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
          {aDesActionsWorkflow && <span className="w-px h-5 bg-[#E2E8F0]" />}
          {isQhse && (
            <button onClick={() => setShowModalModifier(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#0D2B4E] hover:underline transition-colors">
              <Pencil size={14} strokeWidth={2.2} />
              Modifier
            </button>
          )}
          {(isQhse || isAdmin) && (
            <button onClick={telechargerRapportPdf} disabled={telechargementPdf}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#0D2B4E] hover:underline disabled:opacity-50 transition-colors">
              <Download size={14} strokeWidth={2.2} />
              {telechargementPdf ? "Génération…" : "PDF"}
            </button>
          )}
        </div>
      </div>

      {(aDesActionsWorkflow || erreurStatut) && (
        <p className="flex items-center gap-2 text-xs text-[#64748B] pl-4 mt-2">
          {erreurStatut ? (
            <span className="text-[#DC2626]">{erreurStatut}</span>
          ) : (
            <>
              <AlertCircle size={13} color="#0D2B4E" className="shrink-0" />
              {peutSoumettre       && "Cet incident est en brouillon. Soumettez-le pour traitement."}
              {peutValiderRejeter  && "Cet incident attend votre décision."}
              {peutCloturer        && "L'enquête est terminée. Clôturez cet incident."}
            </>
          )}
        </p>
      )}

      <div className="mt-4 mb-6 pb-5 border-b border-[#E2E8F0]">
        <EtapesWorkflow statut={incident.statut} />
      </div>

      {/* ── Corps en 2 colonnes : contenu principal (~60%) / suivi (~40%) ── */}
      <div className="flex flex-col lg:flex-row mb-6">

        {/* ── Colonne gauche : Informations, Analyse des causes, Action corrective ── */}
        <div ref={colGaucheRef} className="lg:flex-[3] lg:self-start lg:pr-8 min-w-0 space-y-8">

          {/* Informations — sans cadre englobant, juste de l'espacement */}
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy mb-4">
              <Info size={15} color="#0D2B4E" />
              Informations
            </h2>
            <div className="flex flex-col sm:flex-row gap-6">
              {incident.photoUrl && (
                <a href={incident.photoUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 w-full sm:w-44 h-44 rounded-lg overflow-hidden border border-[#E2E8F0] bg-[#F1F5F9] block">
                  <img src={incident.photoUrl} alt="Photo de l'incident"
                    className="w-full h-full object-cover hover:opacity-90 transition" />
                </a>
              )}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
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
                  {incident.assigneA && (
                    <LigneInfo label="Assigné à">
                      {`${incident.assigneA.prenom} ${incident.assigneA.nom}`}
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
                  <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-[#1E293B] leading-relaxed break-words">{incident.description}</p>
                </div>
              </div>
            </div>

            {incident.motifRejet && (
              <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#DC2626] uppercase tracking-wide mb-1">
                  <AlertTriangle size={12} /> Motif de rejet
                </p>
                <p className="text-sm text-[#DC2626] break-words">{incident.motifRejet}</p>
              </div>
            )}
          </div>

          {/* Analyse des causes */}
          <div className="pt-8 border-t border-[#E2E8F0]">
            <AnalyseCausesApercu incident={incident} peutGerer={isQhse} />
          </div>

          {/* Action corrective — le composant ne rend rien pour un non-QHSE ;
              on n'affiche donc pas non plus son conteneur/séparateur, pour
              éviter un bloc vide en bas de la colonne. */}
          {isQhse && (
            <div className="pt-8 border-t border-[#E2E8F0]">
              <ActionCorrectiveDirecte incident={incident} peutGerer={isQhse} />
            </div>
          )}
        </div>

        {/* ── Colonne droite : Historique + Espace collaboratif, séparateur vertical fin ── */}
        <div className="flex flex-col mt-8 lg:mt-0 lg:flex-[2] lg:pl-8 lg:border-l lg:border-[#E2E8F0] min-w-0 lg:max-h-[var(--hauteur-col-gauche)]"
          style={hauteurColGauche ? { "--hauteur-col-gauche": `${hauteurColGauche}px` } : undefined}>

          {/* Historique — cadré dans un bloc à hauteur fixe avec défilement
              interne : un historique long ne doit plus allonger toute la page
              ni déséquilibrer la colonne de gauche. L'en-tête (titre, compteur,
              mention "Immuable") reste fixe au-dessus de la zone qui défile. */}
          <div className="shrink-0 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden flex flex-col" style={{ maxHeight: "22rem" }}>
            <div className="shrink-0 px-5 pt-4 pb-3 border-b border-[#F1F5F9]">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy">
                <History size={15} color="#0D2B4E" />
                Historique
                {historique.length > 0 && (
                  <span className="text-[11px] font-normal text-[#94A3B8]">
                    {historique.length} entrée{historique.length > 1 ? "s" : ""}
                  </span>
                )}
              </h2>
              <p className="flex items-center gap-1 text-[11px] text-[#94A3B8] mt-0.5">
                <Lock size={10} /> Immuable, preuve de traçabilité
              </p>
            </div>
            <div className="flex-1 min-h-[110px] overflow-y-auto px-5 pt-4 pb-1">
              {historique.length === 0 ? (
                <p className="text-sm text-[#94A3B8] py-4">Aucune entrée d'historique.</p>
              ) : (
                historique.map((entree, i) => {
                  const isLast = i === historique.length - 1;
                  const couleur = couleurHistorique(entree.action);
                  const Icone = iconeHistorique(entree.action);
                  return (
                    <div key={entree.id} className="relative pl-8">
                      {!isLast && <div className="absolute left-3 top-0 bottom-0 w-px bg-[#E2E8F0]" />}
                      <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: couleur }}>
                        <Icone size={12} color="white" />
                      </div>
                      <div className="pb-5">
                        <p className="text-sm font-medium text-[#1E293B] leading-snug break-words">{entree.action}</p>
                        {entree.details && (
                          <p className="text-xs text-[#64748B] mt-0.5 italic break-words">{entree.details}</p>
                        )}
                        <p className="text-[11px] text-[#94A3B8] mt-1">
                          {entree.auteur ? `${entree.auteur.prenom} ${entree.auteur.nom}` : "Système"}
                          {" · "}
                          {new Date(entree.dateAction).toLocaleString("fr-FR", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Espace collaboratif — s'étire pour combler la hauteur restante de
              la colonne (mêmes proportions que la colonne gauche, en évitant
              un vide disgracieux en bas à droite) */}
          <div className="flex flex-col flex-1 min-h-0 mt-8 pt-8 border-t border-[#E2E8F0]">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy mb-4 shrink-0">
              <MessageSquare size={15} color="#0D2B4E" />
              Espace collaboratif
            </h2>

            {/* Pièces jointes */}
            <div className="shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">
                  <Paperclip size={13} /> Pièces jointes ({pieces.length})
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
                        <span className="font-medium">{u.nom}</span> : {u.erreur}
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
                  Aucune pièce jointe. Cliquez sur « + Ajouter » pour en ajouter une.
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
            </div>

            {/* Commentaires — champ de saisie en haut, fil des commentaires
                (le plus récent en premier) juste en dessous */}
            <div className="flex flex-col flex-1 min-h-0 mt-6 pt-5 border-t border-[#E2E8F0]">
              <p className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide mb-3">
                <MessageCircle size={13} /> Commentaires ({commentaires.length})
              </p>

              <div className="shrink-0 flex items-start gap-2 mb-4">
                <textarea value={nouveauCommentaire} onChange={(e) => setNouveauCommentaire(e.target.value)}
                  rows={2} placeholder="Ajouter un commentaire…"
                  className={`${inputCls} resize-none flex-1`} />
                <button type="button" onClick={envoyerCommentaire} disabled={envoiCommentaire || !nouveauCommentaire.trim()}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: "#0D2B4E" }}>
                  <Send size={13} strokeWidth={2.2} /> Envoyer
                </button>
              </div>

              <div className="flex-1 min-h-[120px] overflow-y-auto">
                {commentaires.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center px-4">
                    <p className="text-sm text-[#94A3B8]">Aucun commentaire. Lancez la discussion ci-dessus.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commentaires.map((c) => <CommentaireItem key={c.id} commentaire={c} />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modales ── */}
      {showModalRejet && (
        <ModalRejeterIncident
          onConfirm={confirmerRejet}
          onClose={() => setShowModalRejet(false)}
        />
      )}
      {showModalValider && (
        <ModalValiderIncident
          users={users}
          onConfirm={confirmerValider}
          onClose={() => setShowModalValider(false)}
        />
      )}
      {showModalModifier && (
        <ModalModifierIncident
          incident={incident}
          onConfirm={confirmerModification}
          onClose={() => setShowModalModifier(false)}
        />
      )}
    </AppLayout>
  );
}

export default IncidentDetailPage;
