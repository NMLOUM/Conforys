import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";
import { risqueSchema } from "../validators/risqueSchema";

// ── Référentiel de cotation — partagé entre la matrice, les badges et le formulaire ──
const CONFIG_NIVEAU = {
  FAIBLE:   { label: "Faible",   texte: "#2E7D32", fond: "#F0FDF4", cellule: "#DCFCE7" },
  MODERE:   { label: "Modéré",   texte: "#A16207", fond: "#FEFCE8", cellule: "#FEF08A" },
  ELEVE:    { label: "Élevé",    texte: "#EA580C", fond: "#FFF7ED", cellule: "#FED7AA" },
  CRITIQUE: { label: "Critique", texte: "#DC2626", fond: "#FEF2F2", cellule: "#FECACA" },
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

const FORM_DEFAUT = {
  danger: "", description: "", categorie: "AUTRE", zone: "", siteId: "",
  probabilite: "", gravite: "", mesuresPrevention: "",
  probabiliteResiduelle: "", graviteResiduelle: "",
};

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

// ── Cartes de synthèse ────────────────────────────────────────────────────────
function CartesSynthese({ risques }) {
  const total = risques.length;
  const critiquesEleves = risques.filter((r) => r.niveauQualitatif === "CRITIQUE" || r.niveauQualitatif === "ELEVE").length;
  const traites = risques.filter((r) => r.mesuresPrevention && r.mesuresPrevention.trim() !== "").length;

  const cartes = [
    { label: "Risques recensés",      valeur: total,           sub: "au total",                Icone: ShieldAlert,  accent: "#0D2B4E" },
    { label: "Critiques / élevés",    valeur: critiquesEleves, sub: "nécessitent une action",  Icone: AlertTriangle, accent: "#DC2626" },
    { label: "Risques traités",       valeur: traites,         sub: "avec mesures définies",   Icone: CheckCircle2,  accent: "#2E7D32" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
      {cartes.map((c) => (
        <div key={c.label} className="bg-white rounded-lg p-5 flex items-start justify-between"
          style={{ border: "1px solid #E2E8F0", borderLeft: `4px solid ${c.accent}` }}>
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{c.label}</p>
            <p className="text-[28px] font-bold leading-none mt-1" style={{ color: c.accent }}>{c.valeur}</p>
            <p className="text-[12px] text-[#94A3B8] mt-1">{c.sub}</p>
          </div>
          <c.Icone size={20} color={c.accent} strokeWidth={1.6} className="shrink-0 mt-1" />
        </div>
      ))}
    </div>
  );
}

// ── Matrice de risques 4×4 ────────────────────────────────────────────────────
function MatriceRisques({ cellules, filtreCase, onFiltrer }) {
  if (!cellules.length) return null;

  return (
    <div className="p-5 bg-white border border-[#E2E8F0] rounded-lg mb-5">
      <p className="text-sm font-semibold text-navy mb-1">Matrice des risques</p>
      <p className="text-xs text-[#94A3B8] mb-4">Probabilité × Gravité — cliquez une case pour filtrer le tableau</p>

      <div className="flex gap-2">
        {/* Libellés de l'axe probabilité (vertical) */}
        <div className="flex flex-col justify-between shrink-0 py-1" style={{ width: 70 }}>
          {[4, 3, 2, 1].map((p) => (
            <div key={p} className="flex-1 flex items-center justify-end pr-2 text-[11px] text-[#64748B] text-right">
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
                  className="aspect-square rounded-md flex flex-col items-center justify-center transition-all"
                  style={{
                    backgroundColor: c.cellule,
                    outline: actif ? `2.5px solid ${c.texte}` : "none",
                    outlineOffset: "-2.5px",
                  }}
                  title={`Probabilité ${cell.probabilite} × Gravité ${cell.gravite} = ${cell.niveauRisque}`}
                >
                  <span className="text-lg font-bold" style={{ color: c.texte }}>{cell.nombre || ""}</span>
                </button>
              );
            })}
          </div>
          {/* Libellés de l'axe gravité (horizontal) */}
          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
            {[1, 2, 3, 4].map((g) => (
              <div key={g} className="text-center text-[11px] text-[#64748B]">{LABELS_GRAVITE[g]}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#F1F5F9]">
        {Object.entries(CONFIG_NIVEAU).map(([cle, c]) => (
          <span key={cle} className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: c.cellule }} />
            {c.label}
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
  const [genererEnCoursId, setGenererEnCoursId] = useState(null);

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

  const risquesFiltres = filtreCase
    ? risques.filter((r) => r.probabilite === filtreCase.probabilite && r.gravite === filtreCase.gravite)
    : risques;

  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(risquesFiltres, ["danger", "zone"]);

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

  useEffect(() => {
    charger();
    chargerMatrice();
    api.get("/sites").then((r) => setSites(r.data.data || [])).catch(() => {});
  }, []);

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
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-lg font-semibold text-navy">DUERP — Évaluation des risques</h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">Tableau de bord <span className="mx-1">›</span> DUERP</p>
        </div>
        {peutGerer && (
          <button onClick={ouvrirCreation}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors">
            Nouveau risque
          </button>
        )}
      </div>

      <div className="my-5">
        <CartesSynthese risques={risques} />
        <MatriceRisques cellules={matrice} filtreCase={filtreCase} onFiltrer={setFiltreCase} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Rechercher par danger, zone…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition" />
        </div>
        <span className="text-sm text-[#64748B] shrink-0">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
        {filtreCase && (
          <button onClick={() => setFiltreCase(null)} className="text-xs text-[#64748B] hover:text-navy underline shrink-0">
            Retirer le filtre de case (P{filtreCase.probabilite} × G{filtreCase.gravite})
          </button>
        )}
      </div>

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  {["Danger", "Catégorie", "Zone", "Probabilité", "Gravité", "Niveau", "Mesures", peutGerer ? "Action" : null].filter(Boolean).map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {affiches.length === 0 ? (
                  <tr><td colSpan={peutGerer ? 8 : 7} className="px-4 py-12 text-center text-[#94A3B8]">
                    {recherche || filtreCase ? "Aucun risque ne correspond aux critères." : "Aucun risque enregistré"}
                  </td></tr>
                ) : (
                  affiches.map((r) => {
                    const peutGenererAction = peutGerer && (r.niveauQualitatif === "ELEVE" || r.niveauQualitatif === "CRITIQUE");
                    return (
                      <tr key={r.id} onClick={() => peutGerer && ouvrirModification(r)}
                        className={`hover:bg-[#F8FAFC] transition-colors ${peutGerer ? "cursor-pointer" : ""}`}>
                        <td className="px-4 py-3 font-medium text-[#1E293B]">{r.danger}</td>
                        <td className="px-4 py-3 text-[#64748B]">{CATEGORIES[r.categorie] ?? r.categorie}</td>
                        <td className="px-4 py-3 text-[#64748B]">{r.zone || "—"}</td>
                        <td className="px-4 py-3 text-[#64748B]">{LABELS_PROBABILITE[r.probabilite]}</td>
                        <td className="px-4 py-3 text-[#64748B]">{LABELS_GRAVITE[r.gravite]}</td>
                        <td className="px-4 py-3"><BadgeNiveau niveau={r.niveauQualitatif} /></td>
                        <td className="px-4 py-3 text-[#64748B] max-w-[220px] truncate">{r.mesuresPrevention || "—"}</td>
                        {peutGerer && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {peutGenererAction ? (
                              r.nombreActions > 0 ? (
                                <span className="text-xs text-[#94A3B8] italic">Action générée</span>
                              ) : (
                                <button onClick={() => genererAction(r)} disabled={genererEnCoursId === r.id}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-[#EA580C] hover:bg-[#EA580C]/90 disabled:opacity-50 transition-colors">
                                  {genererEnCoursId === r.id ? "…" : "Générer une action"}
                                </button>
                              )
                            ) : (
                              <span className="text-[#94A3B8]">—</span>
                            )}
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
    </AppLayout>
  );
}

export default DUERPPage;
