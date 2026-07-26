import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Plus, Search, X, AlertTriangle, FileDown, Trash2, CalendarCheck } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";
import { risqueSchema } from "../validators/risqueSchema";

// ── Référentiel de cotation — partagé entre la matrice, les badges et le formulaire ──
// celluleTexte : couleur du chiffre affiché dans la case de la matrice —
// distincte de `texte` (utilisée par les badges sur fond pâle `fond`), car
// le fond de case est plus foncé/saturé et nécessite du blanc pour rester
// lisible sur les niveaux élevé/critique.
const CONFIG_NIVEAU = {
  FAIBLE:   { label: "Faible",   plage: "1 à 3",   texte: "#166534", fond: "#F0FDF4", cellule: "#BBF7D0", celluleTexte: "#14532D" },
  MODERE:   { label: "Modéré",   plage: "4 à 7",   texte: "#854D0E", fond: "#FEFCE8", cellule: "#FEF08A", celluleTexte: "#713F12" },
  ELEVE:    { label: "Élevé",    plage: "8 à 11",  texte: "#9A3412", fond: "#FFF7ED", cellule: "#FED7AA", celluleTexte: "#7C2D12" },
  CRITIQUE: { label: "Critique", plage: "12 à 16", texte: "#DC2626", fond: "#FEF2F2", cellule: "#F87171", celluleTexte: "#FFFFFF" },
};

// Même calcul que le backend (risqueService.calculerNiveauQualitatif) — dupliqué
// ici pour l'aperçu en direct dans le formulaire, avant tout enregistrement.
const calculerNiveauQualitatif = (niveau) => {
  if (niveau == null) return null;
  if (niveau <= 3)  return "FAIBLE";
  if (niveau <= 7)  return "MODERE";
  if (niveau <= 11) return "ELEVE";
  return "CRITIQUE";
};

const CATEGORIES = {
  CHUTE: "Chute", ELECTRIQUE: "Électrique", CHIMIQUE: "Chimique", MECANIQUE: "Mécanique",
  INCENDIE: "Incendie", BRUIT: "Bruit", MANUTENTION: "Manutention", THERMIQUE: "Thermique",
  BIOLOGIQUE: "Biologique", AUTRE: "Autre",
};

const LABELS_PROBABILITE = { 1: "Rare", 2: "Possible", 3: "Probable", 4: "Fréquent" };
const LABELS_GRAVITE     = { 1: "Mineure", 2: "Modérée", 3: "Grave", 4: "Critique" };
const LABELS_STATUT_ACTION = { A_FAIRE: "à faire", EN_COURS: "en cours", TERMINE: "terminée", ANNULE: "annulée" };

const FORM_DEFAUT = {
  danger: "", description: "", categorie: "AUTRE", zone: "", siteId: "",
  probabilite: "", gravite: "", mesuresPrevention: "",
  probabiliteResiduelle: "", graviteResiduelle: "",
};

const selectCls =
  "px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#475569] focus:outline-none focus:ring-2 focus:ring-navy/30 transition min-w-[150px]";

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

// ── Barre de répartition par niveau ──────────────────────────────────────────
function BarreRepartition({ risques }) {
  const total = risques.length;
  const traites = risques.filter((r) => r.mesuresPrevention && r.mesuresPrevention.trim() !== "").length;

  const comptes = { FAIBLE: 0, MODERE: 0, ELEVE: 0, CRITIQUE: 0 };
  risques.forEach((r) => { if (r.niveauQualitatif) comptes[r.niveauQualitatif]++; });

  return (
    <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl">
      <p className="text-sm font-semibold text-navy mb-1">Répartition par niveau</p>
      <p className="text-xs text-[#94A3B8] mb-4">
        {total} risque{total !== 1 ? "s" : ""} · {traites} traité{traites !== 1 ? "s" : ""}
      </p>

      {total === 0 ? (
        <p className="text-sm text-[#94A3B8]">Aucun risque enregistré.</p>
      ) : (
        <>
          <div className="flex w-full h-3 rounded-full overflow-hidden bg-[#F1F5F9]">
            {Object.entries(comptes).map(([niveau, n]) => n > 0 && (
              <div key={niveau} style={{ width: `${(n / total) * 100}%`, backgroundColor: CONFIG_NIVEAU[niveau].texte }}
                title={`${CONFIG_NIVEAU[niveau].label} : ${n}`} />
            ))}
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            {Object.entries(comptes).map(([niveau, n]) => (
              <div key={niveau} className="flex items-center justify-between text-xs text-[#475569]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CONFIG_NIVEAU[niveau].texte }} />
                  {CONFIG_NIVEAU[niveau].label}
                </span>
                <span className="font-semibold text-[#1E293B]">{n}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Suivi de révision annuelle du DUERP ──────────────────────────────────────
function StatutRevision({ statut, onMarquerRevise, enCours, peutGerer }) {
  if (!statut) return null;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  return (
    <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <CalendarCheck size={16} color={statut.enRetard ? "#DC2626" : "#2E7D32"} strokeWidth={2} className="shrink-0" />
        <p className="text-sm font-semibold text-navy">Révision annuelle</p>
      </div>
      <div className="space-y-1.5 text-xs text-[#475569]">
        <p>Dernière révision : <span className="font-medium text-[#1E293B]">{formatDate(statut.dateDerniereRevision)}</span></p>
        <p>Prochaine échéance : <span className="font-medium text-[#1E293B]">{formatDate(statut.dateProchaineRevision)}</span></p>
      </div>
      <div className={`mt-3 px-2.5 py-1.5 rounded-md text-xs font-semibold ${statut.enRetard ? "bg-red-50 text-[#DC2626]" : "bg-green-50 text-[#2E7D32]"}`}>
        {statut.enRetard ? "Révision en retard" : "À jour"}
      </div>
      {peutGerer && (
        <button onClick={onMarquerRevise} disabled={enCours}
          className="mt-3 w-full px-3 py-2 text-xs font-semibold rounded-md text-white bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
          {enCours ? "…" : "Marquer comme révisé aujourd'hui"}
        </button>
      )}
    </div>
  );
}

// ── Risques prioritaires — élevés/critiques sans action encore générée ──────
function RisquesPrioritaires({ risques, onGenerer, genererEnCoursId }) {
  const prioritaires = risques
    .filter((r) => (r.niveauQualitatif === "CRITIQUE" || r.niveauQualitatif === "ELEVE") && r.nombreActions === 0)
    .sort((a, b) => b.niveauRisque - a.niveauRisque)
    .slice(0, 5);

  return (
    <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} color="#DC2626" strokeWidth={2} className="shrink-0" />
        <p className="text-sm font-semibold text-navy">Risques prioritaires</p>
      </div>
      {prioritaires.length === 0 ? (
        <p className="text-xs text-[#94A3B8]">Aucun risque élevé/critique en attente d'action.</p>
      ) : (
        <div className="space-y-2">
          {prioritaires.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F8FAFC]">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#1E293B] truncate">{r.danger}</p>
                <div className="mt-1"><BadgeNiveau niveau={r.niveauQualitatif} /></div>
              </div>
              <button onClick={() => onGenerer(r)} disabled={genererEnCoursId === r.id}
                className="shrink-0 px-2.5 py-1.5 text-[11px] font-semibold rounded-md text-white bg-[#EA580C] hover:bg-[#EA580C]/90 disabled:opacity-50 transition-colors">
                {genererEnCoursId === r.id ? "…" : "Générer"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Matrice de risques 4×4 ────────────────────────────────────────────────────
function MatriceRisques({ cellules, filtreCase, onFiltrer }) {
  if (!cellules.length) return null;

  return (
    <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl">
      <p className="text-sm font-semibold text-navy mb-1">Matrice des risques</p>
      <p className="text-xs text-[#94A3B8] mb-4">Probabilité × Gravité — cliquez une case pour filtrer le tableau</p>

      <div className="flex gap-1.5 max-w-[340px]">
        {/* Libellés de l'axe probabilité (vertical) */}
        <div className="flex flex-col justify-between shrink-0 py-1" style={{ width: 56 }}>
          {[4, 3, 2, 1].map((p) => (
            <div key={p} className="flex-1 flex items-center justify-end pr-2 text-[10px] text-[#64748B] text-right">
              {LABELS_PROBABILITE[p]}
            </div>
          ))}
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-4 gap-1.5">
            {cellules.map((cell) => {
              const c = CONFIG_NIVEAU[cell.niveauQualitatif];
              const actif = filtreCase && filtreCase.probabilite === cell.probabilite && filtreCase.gravite === cell.gravite;
              return (
                <button
                  key={`${cell.probabilite}-${cell.gravite}`}
                  onClick={() => onFiltrer(actif ? null : { probabilite: cell.probabilite, gravite: cell.gravite })}
                  className="aspect-square rounded-md flex flex-col items-center justify-center transition-transform hover:scale-[1.03] hover:brightness-95"
                  style={{
                    backgroundColor: c.cellule,
                    outline: actif ? `2.5px solid ${c.texte}` : "none",
                    outlineOffset: "-2.5px",
                  }}
                  title={`Probabilité ${cell.probabilite} × Gravité ${cell.gravite} = ${cell.niveauRisque}`}
                >
                  <span className="text-sm font-bold" style={{ color: c.celluleTexte }}>{cell.nombre || ""}</span>
                </button>
              );
            })}
          </div>
          {/* Libellés de l'axe gravité (horizontal) */}
          <div className="grid grid-cols-4 gap-1.5 mt-1">
            {[1, 2, 3, 4].map((g) => (
              <div key={g} className="text-center text-[10px] text-[#64748B]">{LABELS_GRAVITE[g]}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-[#F1F5F9]">
        {Object.entries(CONFIG_NIVEAU).map(([cle, c]) => (
          <span key={cle} className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: c.cellule }} />
            {c.label} <span className="text-[#94A3B8]">({c.plage})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DUERPPage() {
  const { can } = useRole();
  const peutGerer = can("RESPONSABLE_QHSE");

  const [risques,     setRisques]     = useState([]);
  const [sites,       setSites]       = useState([]);
  const [matrice,     setMatrice]     = useState([]);
  const [chargement,  setChargement]  = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [erreurForm,  setErreurForm]  = useState("");
  const [risqueEnEdition, setRisqueEnEdition] = useState(null);
  const [filtreCase,  setFiltreCase]  = useState(null);
  const [filtreSite,      setFiltreSite]      = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [filtreNiveau,    setFiltreNiveau]    = useState("");
  const [genererEnCoursId, setGenererEnCoursId] = useState(null);
  const [statutRevision,  setStatutRevision]  = useState(null);
  const [marquerReviseEnCours, setMarquerReviseEnCours] = useState(false);
  const [telechargementPdf, setTelechargementPdf] = useState(false);
  const [risqueASupprimer, setRisqueASupprimer] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    mode: "onBlur",
    resolver: zodResolver(risqueSchema),
    defaultValues: FORM_DEFAUT,
  });

  const probabiliteSaisie = watch("probabilite");
  const graviteSaisie      = watch("gravite");
  const probResiduelleSaisie = watch("probabiliteResiduelle");
  const graviteResiduelleSaisie = watch("graviteResiduelle");

  const niveauApercu = probabiliteSaisie && graviteSaisie
    ? calculerNiveauQualitatif(Number(probabiliteSaisie) * Number(graviteSaisie))
    : null;
  const niveauResiduelApercu = probResiduelleSaisie && graviteResiduelleSaisie
    ? calculerNiveauQualitatif(Number(probResiduelleSaisie) * Number(graviteResiduelleSaisie))
    : null;

  const filtresActifs = filtreSite || filtreCategorie || filtreNiveau || filtreCase;

  const risquesFiltres = risques
    .filter((r) => !filtreSite      || r.siteId === filtreSite)
    .filter((r) => !filtreCategorie || r.categorie === filtreCategorie)
    .filter((r) => !filtreNiveau    || r.niveauQualitatif === filtreNiveau)
    .filter((r) => !filtreCase      || (r.probabilite === filtreCase.probabilite && r.gravite === filtreCase.gravite));

  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(risquesFiltres, ["danger", "zone"]);

  const reinitialiserFiltres = () => {
    setFiltreSite(""); setFiltreCategorie(""); setFiltreNiveau(""); setFiltreCase(null);
  };

  useEffect(() => {
    document.title = "CONFORYS — DUERP";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get("/risques");
      setRisques(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement risques:", e);
    } finally {
      setChargement(false);
    }
  };

  const chargerMatrice = async () => {
    try {
      const res = await api.get("/risques/matrice");
      setMatrice(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement matrice:", e);
    }
  };

  const chargerStatutRevision = async () => {
    try {
      const res = await api.get("/risques/statut-revision");
      setStatutRevision(res.data.data);
    } catch (e) {
      console.error("Erreur chargement statut de révision:", e);
    }
  };

  useEffect(() => {
    charger();
    chargerMatrice();
    chargerStatutRevision();
    api.get("/sites").then((r) => setSites(r.data.data || [])).catch(() => {});
  }, []);

  const marquerRevise = async () => {
    setMarquerReviseEnCours(true);
    try {
      const res = await api.post("/risques/marquer-revise");
      setStatutRevision(res.data.data);
      toast.success("DUERP marqué comme révisé");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la mise à jour de la révision.");
    } finally {
      setMarquerReviseEnCours(false);
    }
  };

  const telechargerPdf = async () => {
    setTelechargementPdf(true);
    try {
      const res = await api.get("/risques/rapport-pdf", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `duerp-registre-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Erreur lors du téléchargement du registre PDF.");
    } finally {
      setTelechargementPdf(false);
    }
  };

  const confirmerSuppression = async () => {
    if (!risqueASupprimer) return;
    setSuppressionEnCours(true);
    try {
      await api.delete(`/risques/${risqueASupprimer.id}`);
      toast.success("Risque supprimé avec succès");
      setRisqueASupprimer(null);
      charger();
      chargerMatrice();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression.");
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const ouvrirCreation = () => {
    setErreurForm("");
    setRisqueEnEdition(null);
    reset(FORM_DEFAUT);
    setShowModal(true);
  };

  const ouvrirModification = (risque) => {
    setErreurForm("");
    setRisqueEnEdition(risque);
    reset({
      danger: risque.danger,
      description: risque.description || "",
      categorie: risque.categorie,
      zone: risque.zone || "",
      siteId: risque.siteId,
      probabilite: risque.probabilite,
      gravite: risque.gravite,
      mesuresPrevention: risque.mesuresPrevention || "",
      probabiliteResiduelle: risque.probabiliteResiduelle || "",
      graviteResiduelle: risque.graviteResiduelle || "",
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setErreurForm("");
    const payload = {
      ...data,
      description: data.description || null,
      zone: data.zone || null,
      mesuresPrevention: data.mesuresPrevention || null,
      probabiliteResiduelle: data.probabiliteResiduelle || null,
      graviteResiduelle: data.graviteResiduelle || null,
    };
    try {
      if (risqueEnEdition) {
        await api.put(`/risques/${risqueEnEdition.id}`, payload);
        toast.success("Risque modifié avec succès");
      } else {
        await api.post("/risques", payload);
        toast.success("Risque enregistré avec succès");
      }
      setShowModal(false);
      charger();
      chargerMatrice();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'enregistrement.";
      setErreurForm(msg);
      toast.error(msg);
    }
  };

  const genererAction = async (risque) => {
    setGenererEnCoursId(risque.id);
    try {
      await api.post(`/risques/${risque.id}/generer-action`);
      toast.success("Action de prévention générée avec succès");
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la génération de l'action.");
    } finally {
      setGenererEnCoursId(null);
    }
  };

  const inputCls = (name) =>
    `w-full px-3 py-2.5 text-sm border rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition ${
      errors[name] ? "border-[#DC2626]" : "border-[#E2E8F0]"
    }`;

  return (
    <AppLayout titre="DUERP">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold text-navy">DUERP — Évaluation des risques</h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">Tableau de bord <span className="mx-1">›</span> DUERP</p>
        </div>
        <button onClick={telechargerPdf} disabled={telechargementPdf}
          className="shrink-0 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
          <FileDown size={14} strokeWidth={2.2} />
          {telechargementPdf ? "Génération…" : "Exporter le registre PDF"}
        </button>
      </div>

      {/* ── Barre de filtres persistante ── */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white border border-[#E2E8F0] rounded-xl mb-5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">Site</label>
          <select value={filtreSite} onChange={(e) => setFiltreSite(e.target.value)} className={selectCls}>
            <option value="">Tous les sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">Catégorie</label>
          <select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)} className={selectCls}>
            <option value="">Toutes catégories</option>
            {Object.entries(CATEGORIES).map(([cle, label]) => <option key={cle} value={cle}>{label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">Niveau</label>
          <select value={filtreNiveau} onChange={(e) => setFiltreNiveau(e.target.value)} className={selectCls}>
            <option value="">Tous niveaux</option>
            {Object.entries(CONFIG_NIVEAU).map(([cle, c]) => <option key={cle} value={cle}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">Recherche</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            <input type="text" placeholder="Danger, zone…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition" />
          </div>
        </div>
        {filtresActifs && (
          <button onClick={reinitialiserFiltres} className="flex items-center gap-1 text-xs text-[#64748B] hover:text-navy underline pb-2 shrink-0">
            <X size={12} /> Réinitialiser
          </button>
        )}
        <span className="text-xs text-[#94A3B8] pb-2 ml-auto shrink-0">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Disposition 2 colonnes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Colonne principale */}
        <div className="lg:col-span-8 space-y-5">
          <MatriceRisques cellules={matrice} filtreCase={filtreCase} onFiltrer={setFiltreCase} />

          {chargement ? (
            <p className="text-sm text-[#64748B]">Chargement...</p>
          ) : (
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <p className="text-sm font-semibold text-navy">Registre des risques</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      {["Danger", "Catégorie", "Zone", "Probabilité", "Gravité", "Initial", "Résiduel", "Mesures", peutGerer ? "Action" : null].filter(Boolean).map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {affiches.length === 0 ? (
                      <tr><td colSpan={peutGerer ? 9 : 8} className="px-4 py-12 text-center text-[#94A3B8]">
                        {recherche || filtresActifs ? "Aucun risque ne correspond aux critères." : "Aucun risque enregistré"}
                      </td></tr>
                    ) : (
                      affiches.map((r) => {
                        const peutGenererAction = peutGerer && (r.niveauQualitatif === "ELEVE" || r.niveauQualitatif === "CRITIQUE");
                        return (
                          <tr key={r.id} onClick={() => peutGerer && ouvrirModification(r)}
                            className={`hover:bg-[#F8FAFC] transition-colors ${peutGerer ? "cursor-pointer" : ""}`}>
                            <td className="px-4 py-3 font-medium">
                              <Link to={`/duerp/${r.id}`} onClick={(e) => e.stopPropagation()}
                                className="text-navy hover:underline">
                                {r.danger}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-[#64748B]">{CATEGORIES[r.categorie] ?? r.categorie}</td>
                            <td className="px-4 py-3 text-[#64748B]">{r.zone || "—"}</td>
                            <td className="px-4 py-3 text-[#64748B]">{LABELS_PROBABILITE[r.probabilite]}</td>
                            <td className="px-4 py-3 text-[#64748B]">{LABELS_GRAVITE[r.gravite]}</td>
                            <td className="px-4 py-3"><BadgeNiveau niveau={r.niveauQualitatif} /></td>
                            <td className="px-4 py-3"><BadgeNiveau niveau={r.niveauQualitatifResiduel} /></td>
                            <td className="px-4 py-3 text-[#64748B] max-w-[200px] truncate">{r.mesuresPrevention || "—"}</td>
                            {peutGerer && (
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  {peutGenererAction ? (
                                    r.nombreActions > 0 ? (
                                      <Link to="/actions" className="text-xs text-navy hover:underline italic">
                                        Action {LABELS_STATUT_ACTION[r.actions?.[0]?.statut] ?? "générée"}
                                      </Link>
                                    ) : (
                                      <button onClick={() => genererAction(r)} disabled={genererEnCoursId === r.id}
                                        className="px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-[#EA580C] hover:bg-[#EA580C]/90 disabled:opacity-50 transition-colors">
                                        {genererEnCoursId === r.id ? "…" : "Générer une action"}
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-[#94A3B8]">—</span>
                                  )}
                                  <button onClick={() => setRisqueASupprimer(r)} title="Supprimer ce risque"
                                    className="shrink-0 p-1.5 rounded-md text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 transition-colors">
                                    <Trash2 size={14} strokeWidth={2} />
                                  </button>
                                </div>
                              </td>
                            )}
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
            </div>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6 self-start">
          {peutGerer && (
            <button onClick={ouvrirCreation}
              className="w-full flex items-center justify-center gap-2 py-4 px-5 text-sm font-semibold text-white rounded-xl bg-navy hover:bg-navy/90 transition-colors shadow-sm">
              <Plus size={18} strokeWidth={2.2} />
              Identifier un risque
            </button>
          )}
          <BarreRepartition risques={risques} />
          <StatutRevision statut={statutRevision} onMarquerRevise={marquerRevise} enCours={marquerReviseEnCours} peutGerer={peutGerer} />
          <RisquesPrioritaires risques={risques} onGenerer={genererAction} genererEnCoursId={genererEnCoursId} />
        </div>
      </div>

      {/* ── Modale de création / modification ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1E293B]">{risqueEnEdition ? "Modifier le risque" : "Nouveau risque"}</h2>
              <button onClick={() => setShowModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition text-base leading-none">
                &#x2715;
              </button>
            </div>

            {erreurForm && (
              <div className="mb-4 p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md">{erreurForm}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Danger identifié</label>
                <input type="text" {...register("danger")} placeholder="ex: Chute de hauteur" className={inputCls("danger")} />
                {errors.danger && <p className="mt-1 text-xs text-[#DC2626]">{errors.danger.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Catégorie</label>
                  <select {...register("categorie")} className={inputCls("categorie")}>
                    {Object.entries(CATEGORIES).map(([cle, label]) => <option key={cle} value={cle}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Zone / poste</label>
                  <input type="text" {...register("zone")} placeholder="ex: Atelier soudure" className={inputCls("zone")} />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Site</label>
                <select {...register("siteId")} className={inputCls("siteId")}>
                  <option value="">— Sélectionner un site —</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                {errors.siteId && <p className="mt-1 text-xs text-[#DC2626]">{errors.siteId.message}</p>}
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                  Description <span className="font-normal normal-case text-[#94A3B8]">(optionnel)</span>
                </label>
                <textarea {...register("description")} rows={2} className={inputCls("description")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Probabilité</label>
                  <select {...register("probabilite")} className={inputCls("probabilite")}>
                    <option value="">—</option>
                    {[1, 2, 3, 4].map((p) => <option key={p} value={p}>{p} — {LABELS_PROBABILITE[p]}</option>)}
                  </select>
                  {errors.probabilite && <p className="mt-1 text-xs text-[#DC2626]">{errors.probabilite.message}</p>}
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Gravité</label>
                  <select {...register("gravite")} className={inputCls("gravite")}>
                    <option value="">—</option>
                    {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g} — {LABELS_GRAVITE[g]}</option>)}
                  </select>
                  {errors.gravite && <p className="mt-1 text-xs text-[#DC2626]">{errors.gravite.message}</p>}
                </div>
              </div>

              {niveauApercu && (
                <div className="flex items-center gap-2 p-3 rounded-md" style={{ backgroundColor: CONFIG_NIVEAU[niveauApercu].fond }}>
                  <span className="text-xs font-semibold text-[#475569]">Niveau de risque :</span>
                  <BadgeNiveau niveau={niveauApercu} />
                  <span className="text-xs text-[#94A3B8]">({probabiliteSaisie} × {graviteSaisie} = {Number(probabiliteSaisie) * Number(graviteSaisie)})</span>
                </div>
              )}

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                  Mesures de prévention <span className="font-normal normal-case text-[#94A3B8]">(optionnel)</span>
                </label>
                <textarea {...register("mesuresPrevention")} rows={3} placeholder="Mesures existantes ou à mettre en place…" className={inputCls("mesuresPrevention")} />
              </div>

              <div className="pt-2 border-t border-[#F1F5F9]">
                <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
                  Cotation résiduelle <span className="font-normal normal-case text-[#94A3B8]">(après mesures, optionnel)</span>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs text-[#94A3B8]">Probabilité résiduelle</label>
                    <select {...register("probabiliteResiduelle")} className={inputCls("probabiliteResiduelle")}>
                      <option value="">—</option>
                      {[1, 2, 3, 4].map((p) => <option key={p} value={p}>{p} — {LABELS_PROBABILITE[p]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs text-[#94A3B8]">Gravité résiduelle</label>
                    <select {...register("graviteResiduelle")} className={inputCls("graviteResiduelle")}>
                      <option value="">—</option>
                      {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g} — {LABELS_GRAVITE[g]}</option>)}
                    </select>
                  </div>
                </div>
                {niveauResiduelApercu && (
                  <div className="flex items-center gap-2 p-3 rounded-md mt-3" style={{ backgroundColor: CONFIG_NIVEAU[niveauResiduelApercu].fond }}>
                    <span className="text-xs font-semibold text-[#475569]">Niveau résiduel :</span>
                    <BadgeNiveau niveau={niveauResiduelApercu} />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#F1F5F9]">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
                  {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmation de suppression ── */}
      {risqueASupprimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setRisqueASupprimer(null)}>
          <div className="w-full max-w-sm bg-white rounded-lg border border-[#E2E8F0] p-6 mx-4">
            <h2 className="text-base font-semibold text-[#1E293B] mb-2">Supprimer ce risque ?</h2>
            <p className="text-sm text-[#64748B] mb-5">
              « <span className="font-medium text-[#1E293B]">{risqueASupprimer.danger}</span> » sera définitivement supprimé du registre DUERP. Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRisqueASupprimer(null)} disabled={suppressionEnCours}
                className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
                Annuler
              </button>
              <button onClick={confirmerSuppression} disabled={suppressionEnCours}
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

export default DUERPPage;
