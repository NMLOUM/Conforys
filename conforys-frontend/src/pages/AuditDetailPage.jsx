import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Chart from "react-apexcharts";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";

// ── Constantes ────────────────────────────────────────────────────────────────

const LABELS_TYPE = {
  SECURITE:      "Sécurité",
  QUALITE:       "Qualité",
  ENVIRONNEMENT: "Environnement",
  HYGIENE:       "Hygiène",
};

const CONFIG_CRITICITE = {
  CRITIQUE: { label: "Critique", bg: "bg-red-50",    text: "text-[#DC2626]", border: "#DC2626" },
  MAJEUR:   { label: "Majeur",   bg: "bg-orange-50",  text: "text-[#EA580C]", border: "#EA580C" },
  MINEUR:   { label: "Mineur",   bg: "bg-slate-100",  text: "text-[#64748B]", border: "#94A3B8" },
};

const TYPES_ACCEPTES   = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_OCTET = 5 * 1024 * 1024; // 5 Mo

function Spinner() {
  return (
    <div className="w-4 h-4 border-2 border-[#0D2B4E] border-t-transparent rounded-full animate-spin shrink-0" />
  );
}

// ── Jauge circulaire du taux de conformité ───────────────────────────────────

function JaugeConformite({ score }) {
  const valeur = score ?? 0;
  const couleur = valeur >= 75 ? "#2E7D32" : valeur >= 50 ? "#EA580C" : "#DC2626";

  const options = {
    chart: { type: "radialBar", animations: { enabled: false } },
    colors: [couleur],
    plotOptions: {
      radialBar: {
        hollow: { size: "68%" },
        track:  { background: "#F1F5F9" },
        dataLabels: {
          name:  { show: false },
          value: {
            fontSize: "26px",
            fontWeight: 700,
            color: "#1E293B",
            offsetY: 8,
            formatter: (v) => `${Math.round(v)}%`,
          },
        },
      },
    },
    stroke: { lineCap: "round" },
  };

  return (
    <div className="flex flex-col items-center">
      <Chart type="radialBar" options={options} series={[valeur]} height={200} />
      <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide -mt-2">
        Taux de conformité
      </p>
    </div>
  );
}

// ── Une ligne de question ─────────────────────────────────────────────────────

function LigneQuestion({ question, onReponse, disabled }) {
  const [afficherFormNC, setAfficherFormNC] = useState(question.reponse === "NON_CONFORME");
  const [commentaire,    setCommentaire]    = useState(question.commentaire || "");
  const [photoUrl,       setPhotoUrl]       = useState(question.photoUrl || "");
  const [apercu,         setApercu]         = useState("");
  const [uploading,      setUploading]      = useState(false);
  const [uploadErreur,   setUploadErreur]   = useState("");
  const [envoi,          setEnvoi]          = useState(false);

  const crit = CONFIG_CRITICITE[question.criticite] ?? CONFIG_CRITICITE.MINEUR;
  const reponseActuelle = question.reponse;

  const repondreDirect = async (reponse) => {
    setEnvoi(true);
    try {
      await onReponse(question.id, { reponse, commentaire: "", photoUrl: "" });
      setAfficherFormNC(false);
    } finally {
      setEnvoi(false);
    }
  };

  const handleNonConforme = () => {
    setAfficherFormNC(true);
  };

  const enregistrerNonConforme = async () => {
    setEnvoi(true);
    try {
      await onReponse(question.id, { reponse: "NON_CONFORME", commentaire, photoUrl });
    } finally {
      setEnvoi(false);
    }
  };

  const handleFichier = async (e) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      setUploadErreur("Formats acceptés : JPG, PNG, WebP.");
      return;
    }
    if (fichier.size > TAILLE_MAX_OCTET) {
      setUploadErreur("Fichier trop volumineux (max 5 Mo).");
      return;
    }

    if (apercu) URL.revokeObjectURL(apercu);
    setApercu(URL.createObjectURL(fichier));
    setUploadErreur("");
    setPhotoUrl("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", fichier);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Réponse ImgBB invalide.");
      setPhotoUrl(json.data.url);
    } catch (err) {
      setUploadErreur(
        err.message?.includes("fetch")
          ? "Impossible de joindre ImgBB. Vérifiez votre connexion."
          : (err.message || "Échec de l'envoi.")
      );
      setApercu("");
    } finally {
      setUploading(false);
    }
  };

  const boutonCls = (actif, couleurActif) =>
    `px-3 py-1.5 text-xs font-semibold rounded-md border-2 transition-all ${
      actif ? "" : "text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
    }`;

  return (
    <div className="p-4 border border-[#E2E8F0] rounded-lg bg-white">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm font-medium text-[#1E293B] leading-relaxed flex-1">{question.libelle}</p>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${crit.bg} ${crit.text}`}>
          {crit.label}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={envoi || disabled}
          onClick={() => repondreDirect("CONFORME")}
          className={boutonCls(reponseActuelle === "CONFORME")}
          style={reponseActuelle === "CONFORME"
            ? { backgroundColor: "#F0FDF4", borderColor: "#2E7D32", color: "#2E7D32" }
            : {}}
        >
          Conforme
        </button>
        <button
          type="button"
          disabled={envoi || disabled}
          onClick={handleNonConforme}
          className={boutonCls(reponseActuelle === "NON_CONFORME")}
          style={reponseActuelle === "NON_CONFORME"
            ? { backgroundColor: "#FEF2F2", borderColor: "#DC2626", color: "#DC2626" }
            : {}}
        >
          Non conforme
        </button>
        <button
          type="button"
          disabled={envoi || disabled}
          onClick={() => repondreDirect("NON_APPLICABLE")}
          className={boutonCls(reponseActuelle === "NON_APPLICABLE")}
          style={reponseActuelle === "NON_APPLICABLE"
            ? { backgroundColor: "#F1F5F9", borderColor: "#94A3B8", color: "#475569" }
            : {}}
        >
          N.A.
        </button>
      </div>

      {afficherFormNC && !disabled && (
        <div className="mt-3 pt-3 border-t border-[#F1F5F9] space-y-3">
          <div>
            <label className="block mb-1.5 text-[11px] font-semibold text-[#475569] uppercase tracking-wide">
              Commentaire * <span className="font-normal normal-case text-[#94A3B8]">(min. 5 caractères)</span>
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
              placeholder="Décrivez la non-conformité constatée…"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626] transition resize-none"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-[11px] font-semibold text-[#475569] uppercase tracking-wide">
              Photo <span className="font-normal normal-case text-[#94A3B8]">(recommandée)</span>
            </label>
            <label className="flex items-center gap-3 px-3 py-2 border-2 border-dashed rounded-md cursor-pointer select-none"
              style={{ borderColor: photoUrl ? "#0D2B4E" : "#E2E8F0", backgroundColor: photoUrl ? "rgba(13,43,78,0.03)" : "#FAFAFA" }}>
              <input type="file" accept="image/*" onChange={handleFichier} disabled={uploading} className="sr-only" />
              {uploading ? (
                <span className="flex items-center gap-2 text-xs text-[#64748B]"><Spinner /> Envoi…</span>
              ) : photoUrl ? (
                <span className="text-xs font-medium text-[#0D2B4E]">Photo envoyée, cliquer pour changer</span>
              ) : (
                <span className="text-xs text-[#64748B]">Sélectionner une photo</span>
              )}
            </label>
            {apercu && <img src={apercu} alt="Aperçu" className="mt-2 h-20 rounded-md object-cover border border-[#E2E8F0]" />}
            {uploadErreur && <p className="mt-1.5 text-xs text-[#DC2626]">{uploadErreur}</p>}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={envoi || commentaire.trim().length < 5}
              onClick={enregistrerNonConforme}
              className="px-4 py-2 text-xs font-semibold text-white rounded-md bg-[#DC2626] hover:bg-[#DC2626]/90 disabled:opacity-50 transition-colors"
            >
              {envoi ? "Enregistrement…" : "Enregistrer la non-conformité"}
            </button>
          </div>
        </div>
      )}

      {/* Lecture seule : justification déjà enregistrée, audit non modifiable */}
      {disabled && reponseActuelle === "NON_CONFORME" && (commentaire || photoUrl) && (
        <div className="mt-3 pt-3 border-t border-[#F1F5F9] space-y-2">
          {commentaire && (
            <p className="text-xs text-[#475569]">
              <span className="font-semibold uppercase tracking-wide text-[10px] text-[#94A3B8]">Commentaire </span>
              {commentaire}
            </p>
          )}
          {photoUrl && (
            <img src={photoUrl} alt="Photo de la non-conformité" className="h-20 rounded-md object-cover border border-[#E2E8F0]" />
          )}
        </div>
      )}
    </div>
  );
}

// ── Modale de clôture d'une action corrective ────────────────────────────────

function ModalCloturerCapa({ action, onSuccess, onClose }) {
  const [commentaire, setCommentaire] = useState("");
  const [erreur,      setErreur]      = useState("");
  const [envoi,       setEnvoi]       = useState(false);

  const soumettre = async () => {
    if (commentaire.trim().length < 5) {
      setErreur("Le commentaire doit faire au moins 5 caractères.");
      return;
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
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Clôturer l'action</h3>
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
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">
              Commentaire de clôture *
            </label>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              rows={3} placeholder="Décrivez comment l'action a été réalisée…"
              className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32] transition resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button type="button" onClick={soumettre} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-[#2E7D32] hover:bg-[#2E7D32]/90 disabled:opacity-50 transition-colors">
            {envoi ? "Clôture en cours…" : "Confirmer la clôture"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section "Plan d'actions correctives" ─────────────────────────────────────

function SectionCapa({ auditId, nombreNonConformes, auditTermine, can, actions, onGenerer, onCloturer, genererEnCours }) {
  if (!can("RESPONSABLE_QHSE")) return null;

  return (
    <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#1E293B]">Plan d'actions correctives</p>
        {auditTermine && nombreNonConformes > 0 && (
          <button
            type="button"
            onClick={onGenerer}
            disabled={genererEnCours}
            className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors"
          >
            {genererEnCours ? "Génération…" : "Générer le plan d'actions correctives"}
          </button>
        )}
      </div>

      {!auditTermine && (
        <p className="text-xs text-[#94A3B8]">
          Finalisez l'audit (toutes les questions répondues) pour pouvoir générer le plan d'actions.
        </p>
      )}
      {auditTermine && nombreNonConformes === 0 && (
        <p className="text-xs text-[#2E7D32]">Aucune non-conformité, aucun plan d'action nécessaire.</p>
      )}

      {actions.length > 0 && (
        <div className="mt-3 border border-[#F1F5F9] rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Description", "Priorité", "Statut", "Responsable", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {actions.map((a) => {
                const peutCloturer = a.statut !== "TERMINE" && a.statut !== "ANNULE";
                return (
                  <tr key={a.id}>
                    <td className="px-3 py-2.5 text-[#1E293B] max-w-xs">
                      <p className="line-clamp-2">{a.description}</p>
                    </td>
                    <td className="px-3 py-2.5"><Badge variant={a.priorite} /></td>
                    <td className="px-3 py-2.5"><Badge variant={a.statut} /></td>
                    <td className="px-3 py-2.5 text-[#475569] whitespace-nowrap">
                      {a.responsable ? `${a.responsable.prenom} ${a.responsable.nom}` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {peutCloturer && (
                        <button onClick={() => onCloturer(a)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md text-white transition-colors bg-[#2E7D32] hover:bg-[#2E7D32]/90">
                          Clôturer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function AuditDetailPage() {
  const { id } = useParams();
  const { can } = useRole();
  const [audit,      setAudit]      = useState(null);
  const [chargement, setChargement] = useState(true);
  const [capaActions,     setCapaActions]     = useState([]);
  const [genererEnCours,  setGenererEnCours]  = useState(false);
  const [capaACloturer,   setCapaACloturer]   = useState(null);
  const [transitionEnCours, setTransitionEnCours] = useState(false);
  const [telechargementPdf, setTelechargementPdf] = useState(false);
  const [historique,      setHistorique]      = useState([]);
  const [showHistorique,  setShowHistorique]  = useState(false);

  useEffect(() => {
    document.title = "Audit";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get(`/audits/${id}`);
      setAudit(res.data.data);
    } catch (e) {
      console.error("Erreur chargement audit:", e);
    } finally {
      setChargement(false);
    }
  };

  const chargerCapa = async () => {
    try {
      const res = await api.get(`/audits/${id}/actions`);
      setCapaActions(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement actions correctives:", e);
    }
  };

  const chargerHistorique = async () => {
    try {
      const res = await api.get(`/audits/${id}/historique`);
      setHistorique(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement historique:", e);
    }
  };

  useEffect(() => { charger(); chargerCapa(); chargerHistorique(); }, [id]);

  const repondre = async (questionId, payload) => {
    try {
      const res = await api.put(`/audits/${id}/questions/${questionId}`, payload);
      setAudit(res.data.data);
      if (payload.reponse === "NON_CONFORME") chargerHistorique();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'enregistrement de la réponse.";
      toast.error(msg);
      throw err;
    }
  };

  const genererCapa = async () => {
    setGenererEnCours(true);
    try {
      const res = await api.post(`/audits/${id}/generer-actions`);
      setCapaActions(res.data.data || []);
      chargerHistorique();
      toast.success("Plan d'actions correctives généré");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la génération du plan d'actions.");
    } finally {
      setGenererEnCours(false);
    }
  };

  const cloturerCapa = async () => {
    setCapaACloturer(null);
    await chargerCapa();
  };

  const telechargerRapportPdf = async () => {
    setTelechargementPdf(true);
    try {
      const res = await api.get(`/audits/${id}/rapport-pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `rapport-${audit.reference}.pdf`;
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

  const demarrer = async () => {
    setTransitionEnCours(true);
    try {
      const res = await api.put(`/audits/${id}/demarrer`);
      setAudit(res.data.data);
      chargerHistorique();
      toast.success("Audit démarré");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors du démarrage.");
    } finally {
      setTransitionEnCours(false);
    }
  };

  const finaliser = async () => {
    setTransitionEnCours(true);
    try {
      const res = await api.put(`/audits/${id}/finaliser`);
      setAudit(res.data.data);
      chargerHistorique();
      toast.success("Audit finalisé");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la finalisation.");
    } finally {
      setTransitionEnCours(false);
    }
  };

  if (chargement) {
    return (
      <AppLayout titre="Audit">
        <p className="text-sm text-[#64748B]">Chargement…</p>
      </AppLayout>
    );
  }

  if (!audit) {
    return (
      <AppLayout titre="Audit">
        <p className="text-sm text-[#94A3B8]">Audit introuvable.</p>
      </AppLayout>
    );
  }

  const questions = audit.questions || [];
  const repondues  = questions.filter((q) => q.reponse !== "NON_REPONDU").length;
  const repartition = {
    CONFORME:       questions.filter((q) => q.reponse === "CONFORME").length,
    NON_CONFORME:   questions.filter((q) => q.reponse === "NON_CONFORME").length,
    NON_APPLICABLE: questions.filter((q) => q.reponse === "NON_APPLICABLE").length,
  };
  const progression = questions.length === 0 ? 0 : Math.round((repondues / questions.length) * 100);

  return (
    <AppLayout titre="Audit">
      <div className="mb-5">
        <Link to="/audits" className="text-xs text-[#64748B] hover:text-navy transition-colors">
          ← Retour aux audits
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-navy">{audit.reference}</h1>
            <Badge variant={audit.statut} />
            <span className="text-sm text-[#64748B]">{LABELS_TYPE[audit.type] ?? audit.type}</span>
          </div>
          {can("RESPONSABLE_QHSE") && (
            <div className="flex items-center gap-2">
              {audit.statut === "PLANIFIE" && (
                <button type="button" onClick={demarrer} disabled={transitionEnCours}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
                  {transitionEnCours ? "…" : "Démarrer"}
                </button>
              )}
              {audit.statut === "EN_COURS" && (
                <button type="button" onClick={finaliser} disabled={transitionEnCours}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-[#2E7D32] hover:bg-[#2E7D32]/90 disabled:opacity-50 transition-colors">
                  {transitionEnCours ? "…" : "Finaliser"}
                </button>
              )}
              <button type="button" onClick={telechargerRapportPdf} disabled={telechargementPdf}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
                {telechargementPdf ? "Génération…" : "Télécharger le rapport PDF"}
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-[#475569] mt-1">{audit.titre}</p>
        <p className="text-xs text-[#94A3B8] mt-1">
          Site : {audit.site?.nom ?? "—"} · Auditeur : {audit.auditeur?.prenom} {audit.auditeur?.nom} · Prévu le{" "}
          {audit.datePrevue ? new Date(audit.datePrevue).toLocaleDateString("fr-FR") : "—"}
        </p>
        {audit.statut !== "EN_COURS" && (
          <p className="mt-2 text-xs text-[#94A3B8] italic">
            {audit.statut === "PLANIFIE" && "Cliquez sur « Démarrer » pour commencer à répondre à la checklist."}
            {audit.statut === "TERMINE" && "Audit finalisé. Les réponses sont en lecture seule."}
            {audit.statut === "ANNULE" && "Audit annulé. Les réponses sont en lecture seule."}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Colonne gauche — questions ── */}
        <div className="lg:col-span-2 space-y-3">
          {questions.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">Aucune question dans cette checklist.</p>
          ) : (
            questions.map((q) => (
              <LigneQuestion key={q.id} question={q} onReponse={repondre} disabled={audit.statut !== "EN_COURS"} />
            ))
          )}
        </div>

        {/* ── Colonne droite — panneau scoring ── */}
        <div className="space-y-4">
          <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
            <JaugeConformite score={audit.scoreConformite} />
          </div>

          <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white space-y-3">
            <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Répartition</p>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#1E293B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" /> Conformes
              </span>
              <span className="font-semibold text-[#1E293B]">{repartition.CONFORME}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#1E293B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Non-conformités
              </span>
              <span className="font-semibold text-[#1E293B]">{repartition.NON_CONFORME}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#1E293B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" /> Non applicables
              </span>
              <span className="font-semibold text-[#1E293B]">{repartition.NON_APPLICABLE}</span>
            </div>
          </div>

          <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Progression</p>
              <span className="text-xs font-semibold text-[#1E293B]">{repondues}/{questions.length}</span>
            </div>
            <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
              <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${progression}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Plan d'actions correctives (CAPA) ── */}
      <div className="mt-5">
        <SectionCapa
          auditId={id}
          nombreNonConformes={repartition.NON_CONFORME}
          auditTermine={audit.statut === "TERMINE"}
          can={can}
          actions={capaActions}
          onGenerer={genererCapa}
          onCloturer={setCapaACloturer}
          genererEnCours={genererEnCours}
        />
      </div>

      {/* ── Historique ── */}
      <div className="mt-5 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <button type="button" onClick={() => setShowHistorique((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors">
          <div className="text-left">
            <h2 className="text-lg font-semibold text-navy">
              Historique
              {historique.length > 0 && (
                <span className="ml-2 text-[11px] font-normal text-[#94A3B8]">
                  {historique.length} entrée{historique.length > 1 ? "s" : ""}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">Piste d'audit (lecture seule)</p>
          </div>
          <svg className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform duration-200 ${showHistorique ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showHistorique && (
          <>
            <div className="border-t border-[#E2E8F0]" />
            {historique.length === 0 ? (
              <p className="px-5 py-8 text-sm text-[#94A3B8] text-center">Aucune entrée d'historique.</p>
            ) : (
              <ol className="px-5 py-4">
                {historique.map((entree, i) => {
                  const isLast = i === historique.length - 1;
                  return (
                    <li key={entree.id} className="flex gap-4">
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
          </>
        )}
      </div>

      {capaACloturer && (
        <ModalCloturerCapa
          action={capaACloturer}
          onSuccess={cloturerCapa}
          onClose={() => setCapaACloturer(null)}
        />
      )}
    </AppLayout>
  );
}

export default AuditDetailPage;
