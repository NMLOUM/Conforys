import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";
import { epiSchema } from "../validators/epiSchema";

const FORM_DEFAUT = { designation: "", type: "", quantite: "", seuilAlerte: "", siteId: "" };

function EpisPage() {
  const { can } = useRole();
  const [epis,       setEpis]       = useState([]);
  const [sites,      setSites]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [erreurForm, setErreurForm] = useState("");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(epiSchema),
    defaultValues: FORM_DEFAUT,
  });

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

  const ouvrirModal = () => {
    setErreurForm("");
    reset(FORM_DEFAUT);
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setErreurForm("");
    try {
      await api.post("/epis", data);
      setShowModal(false);
      charger();
    } catch (err) {
      setErreurForm(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    }
  };

  const inputCls = (name) =>
    `w-full px-3 py-2.5 text-sm border rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition ${
      errors[name] ? "border-[#DC2626]" : "border-[#E2E8F0]"
    }`;

  return (
    <AppLayout titre="Equipements de Protection Individuelle">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[#64748B]">{epis.length} EPI(s) enregistré(s)</p>
        {can("ADMIN", "RESPONSABLE_QHSE") && (
          <button onClick={ouvrirModal}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors">
            Nouveau
          </button>
        )}
      </div>

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Désignation", "Type", "Quantité", "Seuil alerte", "Statut"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {epis.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[#94A3B8]">Aucun EPI enregistré</td></tr>
              ) : (
                epis.map((epi) => {
                  const enAlerte = epi.quantite <= epi.seuilAlerte;
                  return (
                    <tr key={epi.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1E293B]">{epi.designation}</td>
                      <td className="px-4 py-3 text-[#64748B]">{epi.type || "—"}</td>
                      <td className="px-4 py-3 font-medium text-[#1E293B]">{epi.quantite}</td>
                      <td className="px-4 py-3 text-[#64748B]">{epi.seuilAlerte}</td>
                      <td className="px-4 py-3"><Badge variant={enAlerte ? "ALERTE" : "STOCK_OK"} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1E293B]">Nouvel EPI</h2>
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
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Type</label>
                <input type="text" {...register("type")} placeholder="ex: Protection tête" className={inputCls("type")} />
                {errors.type && <p className="mt-1 text-xs text-[#DC2626]">{errors.type.message}</p>}
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
