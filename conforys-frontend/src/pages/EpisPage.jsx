import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Chart from "react-apexcharts";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";
import { epiSchema } from "../validators/epiSchema";

const FORM_DEFAUT = {
  designation: "", type: "", reference: "", quantite: "", seuilAlerte: "",
  siteId: "", datePeremption: "", dateDerniereInspection: "",
};

const formatDateInput = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");
const formatDateAffichage = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : null);
const estPerime = (d) => Boolean(d && new Date(d) < new Date());

// ── Icône EPI — espace réservé sobre, en attendant les photos ImgBB ──────────

function IconeEpi() {
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(13, 43, 78, 0.06)" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D2B4E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 4 5v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V5l-8-3Z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    </div>
  );
}

// ── Jauge circulaire — toujours en vert (taux d'EPI conformes/disponibles) ──

function JaugeStock({ taux }) {
  const options = {
    chart: { type: "radialBar", animations: { enabled: false } },
    colors: ["#2E7D32"],
    plotOptions: {
      radialBar: {
        hollow: { size: "68%" },
        track: { background: "#F1F5F9" },
        dataLabels: {
          name: { show: false },
          value: { fontSize: "20px", fontWeight: 700, color: "#1E293B", offsetY: 6, formatter: (v) => `${Math.round(v)}%` },
        },
      },
    },
    stroke: { lineCap: "round" },
  };
  return <Chart type="radialBar" options={options} series={[taux]} height={130} />;
}

// ── Cartes de synthèse ────────────────────────────────────────────────────────

function CarteEtatStock({ epis }) {
  const total = epis.length;
  const nbOk = epis.filter((e) => e.niveauAlerte === "OK").length;
  const nbAlerte = epis.filter((e) => e.niveauAlerte === "ALERTE").length;
  const niveauOptimal = total === 0 ? 100 : Math.round((nbOk / total) * 100);

  return (
    <div className="p-5 rounded-lg border border-[#E2E8F0] bg-white">
      <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">État du stock</p>
      <p className="text-3xl font-bold text-navy">{niveauOptimal}%</p>
      <p className="text-xs text-[#94A3B8] mt-1 mb-3">Niveau optimal de l'inventaire</p>
      <div className="flex items-center gap-2 pt-3 border-t border-[#F1F5F9]">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: nbAlerte > 0 ? "#DC2626" : "#2E7D32" }} />
        <p className="text-sm" style={{ color: nbAlerte > 0 ? "#DC2626" : "#475569" }}>
          <span className="font-semibold">{nbAlerte}</span> EPI en alerte de stock
        </p>
      </div>
    </div>
  );
}

function CarteRepartition({ epis }) {
  const total = epis.length;
  const nbOk = epis.filter((e) => e.niveauAlerte === "OK").length;
  const nbAlerte = epis.filter((e) => e.niveauAlerte !== "OK").length;
  const taux = total === 0 ? 100 : Math.round((nbOk / total) * 100);

  return (
    <div className="p-5 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Répartition</p>
        <div className="space-y-1.5">
          <p className="text-sm text-[#1E293B]">
            <span className="font-semibold text-navy">{total}</span> EPI au total
          </p>
          <p className="text-sm text-[#1E293B]">
            <span className="font-semibold" style={{ color: nbAlerte > 0 ? "#DC2626" : "#2E7D32" }}>{nbAlerte}</span> en alerte
          </p>
        </div>
      </div>
      <JaugeStock taux={taux} />
    </div>
  );
}

// ── Carte individuelle d'un EPI ────────────────────────────────────────────────

function CarteEpi({ epi, peutGerer, onModifier }) {
  const perime = estPerime(epi.datePeremption);
  const enAlerteStock = epi.quantite <= epi.seuilAlerte;
  const derniereInspection = formatDateAffichage(epi.dateDerniereInspection);
  const peremption = formatDateAffichage(epi.datePeremption);

  return (
    <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white">
      <div className="flex items-start justify-between mb-3">
        <IconeEpi />
        <Badge variant={epi.niveauAlerte} />
      </div>
      <p className="text-sm font-semibold text-[#1E293B]">{epi.designation}</p>
      <p className="text-xs text-[#94A3B8] mb-3">{epi.type}{epi.reference ? ` · ${epi.reference}` : ""}</p>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#64748B]">Stock</span>
          <span className="font-semibold" style={{ color: enAlerteStock ? "#DC2626" : "#1E293B" }}>
            {epi.quantite}/{epi.seuilAlerte}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#64748B]">Dernière inspection</span>
          <span className="text-[#1E293B]">{derniereInspection ?? "Non inspecté"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#64748B]">Péremption</span>
          {perime ? <Badge variant="PERIME" /> : <span className="text-[#1E293B]">{peremption ?? "—"}</span>}
        </div>
      </div>

      {peutGerer && (
        <button onClick={() => onModifier(epi)}
          className="mt-3 w-full px-3 py-1.5 text-xs font-medium text-navy border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
          Modifier
        </button>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function EpisPage() {
  const { can } = useRole();
  const peutGerer = can("RESPONSABLE_QHSE");

  const [epis,       setEpis]       = useState([]);
  const [sites,      setSites]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [erreurForm, setErreurForm] = useState("");
  const [epiEnEdition, setEpiEnEdition] = useState(null);

  const [showFiltres,  setShowFiltres]  = useState(false);
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreSite,   setFiltreSite]   = useState("");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    mode: "onBlur",
    resolver: zodResolver(epiSchema),
    defaultValues: FORM_DEFAUT,
  });

  const episFiltres = epis
    .filter((e) => !filtreStatut || e.niveauAlerte === filtreStatut)
    .filter((e) => !filtreSite   || e.siteId === filtreSite);

  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(episFiltres, ["designation", "type"]);

  useEffect(() => {
    document.title = "CONFORYS — EPI";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get("/epis");
      setEpis(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement EPI:", e);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
    api.get("/sites").then((r) => setSites(r.data.data || [])).catch(() => {});
  }, []);

  const ouvrirCreation = () => {
    setErreurForm("");
    setEpiEnEdition(null);
    reset(FORM_DEFAUT);
    setShowModal(true);
  };

  const ouvrirModification = (epi) => {
    setErreurForm("");
    setEpiEnEdition(epi);
    reset({
      designation: epi.designation,
      type: epi.type,
      reference: epi.reference || "",
      quantite: epi.quantite,
      seuilAlerte: epi.seuilAlerte,
      siteId: epi.siteId,
      datePeremption: formatDateInput(epi.datePeremption),
      dateDerniereInspection: formatDateInput(epi.dateDerniereInspection),
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setErreurForm("");
    const payload = {
      ...data,
      reference: data.reference || null,
      datePeremption: data.datePeremption || null,
      dateDerniereInspection: data.dateDerniereInspection || null,
    };
    try {
      if (epiEnEdition) {
        await api.put(`/epis/${epiEnEdition.id}`, payload);
        toast.success("EPI modifié avec succès");
      } else {
        await api.post("/epis", payload);
        toast.success("EPI enregistré avec succès");
      }
      setShowModal(false);
      charger();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'enregistrement.";
      setErreurForm(msg);
      toast.error(msg);
    }
  };

  const inputCls = (name) =>
    `w-full px-3 py-2.5 text-sm border rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition ${
      errors[name] ? "border-[#DC2626]" : "border-[#E2E8F0]"
    }`;
  const selectCls =
    "px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#475569] focus:outline-none focus:ring-2 focus:ring-navy/30 transition";

  const filtresActifs = filtreStatut || filtreSite;

  return (
    <AppLayout titre="Gestion des EPI">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-lg font-semibold text-navy">Gestion des EPI</h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">Tableau de bord <span className="mx-1">›</span> Gestion des EPI</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFiltres((v) => !v)}
            className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
              showFiltres ? "border-navy text-navy bg-navy/5" : "border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"
            }`}
          >
            Filtrer
          </button>
          {peutGerer && (
            <button onClick={ouvrirCreation}
              className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors">
              Nouvel EPI
            </button>
          )}
        </div>
      </div>

      {/* ── Cartes de synthèse ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
        <CarteEtatStock epis={epis} />
        <CarteRepartition epis={epis} />
      </div>

      {/* ── Panneau de filtres (repliable) ── */}
      {showFiltres && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-white border border-[#E2E8F0] rounded-lg">
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className={selectCls}>
            <option value="">Tous les statuts</option>
            <option value="OK">OK</option>
            <option value="BIENTOT">Bientôt</option>
            <option value="ALERTE">Alerte</option>
          </select>
          <select value={filtreSite} onChange={(e) => setFiltreSite(e.target.value)} className={selectCls}>
            <option value="">Tous les sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
          {filtresActifs && (
            <button onClick={() => { setFiltreStatut(""); setFiltreSite(""); }}
              className="text-xs text-[#64748B] hover:text-navy underline">
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* ── Recherche ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Rechercher par désignation, type…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition" />
        </div>
        <span className="text-sm text-[#64748B] shrink-0">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
      </div>

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <>
          {/* ── Grille de cartes ── */}
          {affiches.length === 0 ? (
            <div className="p-12 text-center text-[#94A3B8] bg-white border border-[#E2E8F0] rounded-lg mb-5">
              {recherche || filtresActifs ? "Aucun EPI ne correspond aux critères." : "Aucun EPI enregistré"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-5">
              {affiches.map((epi) => (
                <CarteEpi key={epi.id} epi={epi} peutGerer={peutGerer} onModifier={ouvrirModification} />
              ))}
            </div>
          )}

          {/* ── Tableau détaillé ── */}
          <p className="text-sm font-semibold text-navy mb-2">Inventaire détaillé</p>
          <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    {["Désignation", "Type", "Site", "Stock", "Seuil", "Statut", "Péremption", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {affiches.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[#94A3B8]">Aucun EPI à afficher.</td></tr>
                  ) : (
                    affiches.map((epi) => {
                      const enAlerteStock = epi.quantite <= epi.seuilAlerte;
                      const perime = estPerime(epi.datePeremption);
                      const peremption = formatDateAffichage(epi.datePeremption);
                      return (
                        <tr key={epi.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3 font-medium text-[#1E293B]">{epi.designation}</td>
                          <td className="px-4 py-3 text-[#64748B]">{epi.type || "—"}</td>
                          <td className="px-4 py-3 text-[#64748B]">{epi.site?.nom ?? "—"}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: enAlerteStock ? "#DC2626" : "#1E293B" }}>{epi.quantite}</td>
                          <td className="px-4 py-3 text-[#64748B]">{epi.seuilAlerte}</td>
                          <td className="px-4 py-3"><Badge variant={epi.niveauAlerte} /></td>
                          <td className="px-4 py-3">
                            {perime ? <Badge variant="PERIME" /> : <span className="text-[#64748B]">{peremption ?? "—"}</span>}
                          </td>
                          <td className="px-4 py-3">
                            {peutGerer && (
                              <button onClick={() => ouvrirModification(epi)}
                                className="px-2.5 py-1 text-xs font-medium text-navy border border-[#E2E8F0] rounded-md hover:bg-[#F1F5F9] transition-colors">
                                Modifier
                              </button>
                            )}
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
          </div>
        </>
      )}

      {/* ── Modale de création / modification ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1E293B]">{epiEnEdition ? "Modifier l'EPI" : "Nouvel EPI"}</h2>
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
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Désignation</label>
                <input type="text" {...register("designation")} placeholder="ex: Casque de chantier" className={inputCls("designation")} />
                {errors.designation && <p className="mt-1 text-xs text-[#DC2626]">{errors.designation.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Type</label>
                  <input type="text" {...register("type")} placeholder="ex: Protection tête" className={inputCls("type")} />
                  {errors.type && <p className="mt-1 text-xs text-[#DC2626]">{errors.type.message}</p>}
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Référence</label>
                  <input type="text" {...register("reference")} placeholder="ex: REF-4521" className={inputCls("reference")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Quantité</label>
                  <input type="number" {...register("quantite")} min={0} className={inputCls("quantite")} />
                  {errors.quantite && <p className="mt-1 text-xs text-[#DC2626]">{errors.quantite.message}</p>}
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Seuil d'alerte</label>
                  <input type="number" {...register("seuilAlerte")} min={0} className={inputCls("seuilAlerte")} />
                  {errors.seuilAlerte && <p className="mt-1 text-xs text-[#DC2626]">{errors.seuilAlerte.message}</p>}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Dernière inspection</label>
                  <input type="date" {...register("dateDerniereInspection")} className={inputCls("dateDerniereInspection")} />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Péremption</label>
                  <input type="date" {...register("datePeremption")} className={inputCls("datePeremption")} />
                </div>
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

export default EpisPage;
