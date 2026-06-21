import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useAuthStore } from "../store/authStore";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";
import { auditSchema } from "../validators/auditSchema";

const TYPES   = ["SECURITE", "QUALITE", "ENVIRONNEMENT", "HYGIENE"];
const STATUTS = ["PLANIFIE", "EN_COURS", "TERMINE", "ANNULE"];

const LABELS_TYPE = {
  SECURITE:      "Sécurité",
  QUALITE:       "Qualité",
  ENVIRONNEMENT: "Environnement",
  HYGIENE:       "Hygiène",
};

function AuditsPage() {
  const user = useAuthStore((s) => s.user);
  const { can } = useRole();
  const [audits,     setAudits]     = useState([]);
  const [sites,      setSites]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [erreurForm, setErreurForm] = useState("");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    mode: "onBlur",
    resolver: zodResolver(auditSchema),
    defaultValues: {
      titre: "", type: "SECURITE", statut: "PLANIFIE",
      datePrevue: "", auditeurId: user?.id ?? "", siteId: "",
    },
  });

  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(audits, ["titre", "reference"]);

  useEffect(() => {
    document.title = "CONFORYS — Audits";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get("/audits");
      setAudits(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement audits:", e);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
    api.get("/sites").then((r) => setSites(r.data.data || [])).catch(() => {});
  }, []);

  const ouvrirModal = () => {
    setErreurForm("");
    reset({ titre: "", type: "SECURITE", statut: "PLANIFIE", datePrevue: "", auditeurId: user?.id ?? "", siteId: "" });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setErreurForm("");
    try {
      await api.post("/audits", data);
      toast.success("Audit enregistré avec succès");
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

  return (
    <AppLayout titre="Audits internes">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Rechercher par titre, référence…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition" />
        </div>
        <span className="text-sm text-[#64748B] shrink-0">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
        {can("RESPONSABLE_QHSE") && (
          <button onClick={ouvrirModal}
            className="ml-auto px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors">
            Nouveau
          </button>
        )}
      </div>

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Référence", "Titre", "Type", "Date prévue", "Statut"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {affiches.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[#94A3B8]">
                  {recherche ? "Aucun audit ne correspond à la recherche." : "Aucun audit enregistré"}
                </td></tr>
              ) : (
                affiches.map((audit) => (
                  <tr key={audit.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-semibold text-navy text-xs">{audit.reference}</td>
                    <td className="px-4 py-3 font-medium text-[#1E293B]">{audit.titre}</td>
                    <td className="px-4 py-3 text-[#64748B]">{LABELS_TYPE[audit.type] ?? audit.type}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {audit.datePrevue ? new Date(audit.datePrevue).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3"><Badge variant={audit.statut} /></td>
                  </tr>
                ))
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1E293B]">Nouvel audit</h2>
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
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Titre</label>
                <input type="text" {...register("titre")} placeholder="ex: Audit sécurité Q2 2026" className={inputCls("titre")} />
                {errors.titre && <p className="mt-1 text-xs text-[#DC2626]">{errors.titre.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Type</label>
                  <select {...register("type")} className={inputCls("type")}>
                    {TYPES.map((t) => <option key={t} value={t}>{LABELS_TYPE[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Statut</label>
                  <select {...register("statut")} className={inputCls("statut")}>
                    {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Date prévue</label>
                <input type="date" {...register("datePrevue")} className={inputCls("datePrevue")} />
                {errors.datePrevue && <p className="mt-1 text-xs text-[#DC2626]">{errors.datePrevue.message}</p>}
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Site</label>
                <select {...register("siteId")} className={inputCls("siteId")}>
                  <option value="">— Sélectionner un site —</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                {errors.siteId && <p className="mt-1 text-xs text-[#DC2626]">{errors.siteId.message}</p>}
              </div>

              <input type="hidden" {...register("auditeurId")} />

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

export default AuditsPage;
