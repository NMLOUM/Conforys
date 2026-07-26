import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";

const CONFIG_NIVEAU = {
  FAIBLE:   { label: "Faible",   texte: "#2E7D32", fond: "#F0FDF4" },
  MODERE:   { label: "Modéré",   texte: "#A16207", fond: "#FEFCE8" },
  ELEVE:    { label: "Élevé",    texte: "#EA580C", fond: "#FFF7ED" },
  CRITIQUE: { label: "Critique", texte: "#DC2626", fond: "#FEF2F2" },
};

const CATEGORIES = {
  CHUTE: "Chute", ELECTRIQUE: "Électrique", CHIMIQUE: "Chimique", MECANIQUE: "Mécanique",
  INCENDIE: "Incendie", BRUIT: "Bruit", MANUTENTION: "Manutention", THERMIQUE: "Thermique",
  BIOLOGIQUE: "Biologique", AUTRE: "Autre",
};

const LABELS_PROBABILITE = { 1: "Rare", 2: "Possible", 3: "Probable", 4: "Fréquent" };
const LABELS_GRAVITE     = { 1: "Mineure", 2: "Modérée", 3: "Grave", 4: "Critique" };

function BadgeNiveau({ niveau }) {
  if (!niveau) return <span className="text-[#94A3B8]">—</span>;
  const c = CONFIG_NIVEAU[niveau];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: c.fond, color: c.texte }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.texte }} />
      {c.label}
    </span>
  );
}

// ── Modale de clôture d'une action de prévention ─────────────────────────────
function ModalCloturerAction({ action, onSuccess, onClose }) {
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
          <h3 className="text-base font-semibold text-[#1E293B]">Clôturer l'action</h3>
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

// ── Page principale ───────────────────────────────────────────────────────────
function RisqueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useRole();
  const peutGerer = can("RESPONSABLE_QHSE");

  const [risque,      setRisque]      = useState(null);
  const [chargement,  setChargement]  = useState(true);
  const [historique,      setHistorique]      = useState([]);
  const [showHistorique,  setShowHistorique]  = useState(false);
  const [genererEnCours,  setGenererEnCours]  = useState(false);
  const [actionACloturer, setActionACloturer] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);

  useEffect(() => {
    document.title = "CONFORYS — Risque DUERP";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get(`/risques/${id}`);
      setRisque(res.data.data);
    } catch (e) {
      console.error("Erreur chargement risque:", e);
    } finally {
      setChargement(false);
    }
  };

  const chargerHistorique = async () => {
    try {
      const res = await api.get(`/risques/${id}/historique`);
      setHistorique(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement historique:", e);
    }
  };

  useEffect(() => { charger(); chargerHistorique(); }, [id]);

  const genererAction = async () => {
    setGenererEnCours(true);
    try {
      await api.post(`/risques/${id}/generer-action`);
      toast.success("Action de prévention générée avec succès");
      charger();
      chargerHistorique();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la génération de l'action.");
    } finally {
      setGenererEnCours(false);
    }
  };

  const apresClotureAction = async () => {
    setActionACloturer(null);
    await charger();
  };

  const supprimer = async () => {
    setSuppressionEnCours(true);
    try {
      await api.delete(`/risques/${id}`);
      toast.success("Risque supprimé avec succès");
      navigate("/duerp");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression.");
      setSuppressionEnCours(false);
    }
  };

  if (chargement) {
    return (
      <AppLayout titre="Risque">
        <p className="text-sm text-[#64748B]">Chargement…</p>
      </AppLayout>
    );
  }

  if (!risque) {
    return (
      <AppLayout titre="Risque">
        <p className="text-sm text-[#94A3B8]">Risque introuvable.</p>
      </AppLayout>
    );
  }

  const niveauQualitatif = risque.niveauQualitatif;
  const niveauQualitatifResiduel = risque.niveauQualitatifResiduel;
  const peutGenererAction = peutGerer && (niveauQualitatif === "ELEVE" || niveauQualitatif === "CRITIQUE");
  const action = risque.actions?.[0];

  return (
    <AppLayout titre="Risque">
      <div className="mb-5">
        <Link to="/duerp" className="text-xs text-[#64748B] hover:text-navy transition-colors">
          ← Retour au DUERP
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-navy">{risque.danger}</h1>
            <BadgeNiveau niveau={niveauQualitatif} />
          </div>
          {peutGerer && (
            <button type="button" onClick={() => setConfirmerSuppression(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-[#DC2626] border border-[#DC2626]/30 hover:bg-red-50 transition-colors">
              <Trash2 size={14} strokeWidth={2} /> Supprimer
            </button>
          )}
        </div>
        <p className="text-sm text-[#475569] mt-1">
          {CATEGORIES[risque.categorie] ?? risque.categorie}
          {risque.zone && ` · ${risque.zone}`}
        </p>
        <p className="text-xs text-[#94A3B8] mt-1">
          Site : {risque.site?.nom ?? "—"} · Identifié par {risque.auteur?.prenom} {risque.auteur?.nom}
          {risque.createdAt && ` · le ${new Date(risque.createdAt).toLocaleDateString("fr-FR")}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Colonne gauche ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Description</p>
            <p className="text-sm text-[#1E293B]">{risque.description || "Aucune description renseignée."}</p>
          </div>

          <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Mesures de prévention</p>
            <p className="text-sm text-[#1E293B] whitespace-pre-wrap">{risque.mesuresPrevention || "Aucune mesure renseignée."}</p>
          </div>

          {/* ── Action de prévention liée ── */}
          <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#1E293B]">Action de prévention</p>
              {peutGenererAction && !action && (
                <button type="button" onClick={genererAction} disabled={genererEnCours}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-[#EA580C] hover:bg-[#EA580C]/90 disabled:opacity-50 transition-colors">
                  {genererEnCours ? "Génération…" : "Générer une action"}
                </button>
              )}
            </div>
            {!peutGenererAction && !action && (
              <p className="text-xs text-[#94A3B8]">
                Seuls les risques élevés ou critiques nécessitent une action de prévention.
              </p>
            )}
            {action && (
              <div className="border border-[#F1F5F9] rounded-md p-3 space-y-2">
                <p className="text-sm text-[#1E293B]">{action.description}</p>
                <div className="flex items-center flex-wrap gap-2">
                  <Badge variant={action.priorite} />
                  <Badge variant={action.statut} />
                  {action.responsable && (
                    <span className="text-xs text-[#64748B]">
                      Responsable : {action.responsable.prenom} {action.responsable.nom}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Link to="/actions" className="text-xs text-navy hover:underline">Voir dans les actions correctives →</Link>
                  {peutGerer && action.statut !== "TERMINE" && action.statut !== "ANNULE" && (
                    <button type="button" onClick={() => setActionACloturer(action)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-[#2E7D32] hover:bg-[#2E7D32]/90 transition-colors">
                      Clôturer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Piste d'audit ── */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <button type="button" onClick={() => setShowHistorique((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors">
              <div className="text-left">
                <h2 className="text-sm font-semibold text-[#1E293B]">
                  Historique
                  {historique.length > 0 && (
                    <span className="ml-2 text-[11px] font-normal text-[#94A3B8]">
                      {historique.length} entrée{historique.length > 1 ? "s" : ""}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">Piste d'audit — lecture seule</p>
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
        </div>

        {/* ── Colonne droite — cotation ── */}
        <div className="space-y-4">
          <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Cotation initiale</p>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[#64748B]">Probabilité</span>
              <span className="font-semibold text-[#1E293B]">{LABELS_PROBABILITE[risque.probabilite]}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-[#64748B]">Gravité</span>
              <span className="font-semibold text-[#1E293B]">{LABELS_GRAVITE[risque.gravite]}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
              <span className="text-xs font-semibold text-[#475569] uppercase tracking-wide">Niveau</span>
              <div className="flex items-center gap-2">
                <BadgeNiveau niveau={niveauQualitatif} />
                <span className="text-xs text-[#94A3B8]">({risque.niveauRisque}/16)</span>
              </div>
            </div>
          </div>

          {(risque.probabiliteResiduelle && risque.graviteResiduelle) ? (
            <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
              <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Cotation résiduelle</p>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#64748B]">Probabilité</span>
                <span className="font-semibold text-[#1E293B]">{LABELS_PROBABILITE[risque.probabiliteResiduelle]}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-[#64748B]">Gravité</span>
                <span className="font-semibold text-[#1E293B]">{LABELS_GRAVITE[risque.graviteResiduelle]}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wide">Niveau résiduel</span>
                <BadgeNiveau niveau={niveauQualitatifResiduel} />
              </div>
            </div>
          ) : (
            <div className="p-5 border border-[#E2E8F0] rounded-lg bg-white">
              <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Cotation résiduelle</p>
              <p className="text-xs text-[#94A3B8]">Non renseignée — à évaluer une fois les mesures de prévention appliquées.</p>
            </div>
          )}
        </div>
      </div>

      {actionACloturer && (
        <ModalCloturerAction
          action={actionACloturer}
          onSuccess={apresClotureAction}
          onClose={() => setActionACloturer(null)}
        />
      )}

      {confirmerSuppression && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setConfirmerSuppression(false)}>
          <div className="w-full max-w-sm bg-white rounded-lg border border-[#E2E8F0] p-6 mx-4">
            <h2 className="text-base font-semibold text-[#1E293B] mb-2">Supprimer ce risque ?</h2>
            <p className="text-sm text-[#64748B] mb-5">
              « <span className="font-medium text-[#1E293B]">{risque.danger}</span> » sera définitivement supprimé du registre DUERP. Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmerSuppression(false)} disabled={suppressionEnCours}
                className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
                Annuler
              </button>
              <button onClick={supprimer} disabled={suppressionEnCours}
                className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-[#DC2626] hover:bg-[#DC2626]/90 disabled:opacity-50 transition-colors">
                {suppressionEnCours ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default RisqueDetailPage;
