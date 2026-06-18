import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useAuthStore } from "../store/authStore";
import Badge from "../components/ui/Badge";
import { incidentSchema } from "../validators/incidentSchema";

const TYPES = ["ACCIDENT", "PRESQU_ACCIDENT", "SITUATION_DANGEREUSE", "INCIDENT_ENVIRONNEMENTAL"];
const GRAVITES = ["FAIBLE", "MOYEN", "GRAVE", "CRITIQUE"];

const LABELS_TYPE = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presqu'accident",
  SITUATION_DANGEREUSE:     "Situation dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Incident environnemental",
};

function IncidentsPage() {
  const user = useAuthStore((s) => s.user);
  const [incidents,  setIncidents]  = useState([]);
  const [sites,      setSites]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [erreurForm, setErreurForm] = useState("");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      type:          "ACCIDENT",
      gravite:       "FAIBLE",
      description:   "",
      adresseLisible: "",
      dateIncident:  "",
      declareParId:  user?.id ?? "",
      siteId:        "",
    },
  });

  useEffect(() => {
    document.title = "CONFORYS — Incidents";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get("/incidents");
      setIncidents(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement incidents:", e);
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
    reset({ type: "ACCIDENT", gravite: "FAIBLE", description: "", adresseLisible: "", dateIncident: "", declareParId: user?.id ?? "", siteId: "" });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setErreurForm("");
    try {
      await api.post("/incidents", data);
      setShowModal(false);
      charger();
    } catch (err) {
      setErreurForm(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    }
  };

  return (
    <AppLayout titre="Incidents">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{incidents.length} incident(s)</p>
        <button onClick={ouvrirModal}
          className="px-4 py-2 text-sm font-medium text-white rounded bg-navy hover:opacity-90 transition">
          Nouvel incident
        </button>
      </div>

      {chargement ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Référence", "Type", "Gravité", "Statut", "Date", "Lieu"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incidents.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucun incident enregistré</td></tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-navy">{inc.numeroReference}</td>
                    <td className="px-4 py-3 text-gray-700">{LABELS_TYPE[inc.type] ?? inc.type}</td>
                    <td className="px-4 py-3"><Badge variant={inc.gravite} /></td>
                    <td className="px-4 py-3"><Badge variant={inc.statut} /></td>
                    <td className="px-4 py-3 text-gray-600">
                      {inc.dateIncident ? new Date(inc.dateIncident).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inc.adresseLisible || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-lg p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-navy">Nouvel incident</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&#x2715;</button>
            </div>

            {erreurForm && (
              <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{erreurForm}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Type</label>
                  <select {...register("type")}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy">
                    {TYPES.map((t) => <option key={t} value={t}>{LABELS_TYPE[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Gravité</label>
                  <select {...register("gravite")}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy">
                    {GRAVITES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Date de l'incident</label>
                <input type="datetime-local" {...register("dateIncident")}
                  className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-navy ${errors.dateIncident ? "border-red-400" : "border-gray-300"}`} />
                {errors.dateIncident && <p className="mt-1 text-xs text-red-600">{errors.dateIncident.message}</p>}
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Lieu</label>
                <input type="text" {...register("adresseLisible")} placeholder="ex: Atelier A, Zone industrielle"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Description</label>
                <textarea {...register("description")} rows={3}
                  className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-navy resize-none ${errors.description ? "border-red-400" : "border-gray-300"}`} />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Site</label>
                <select {...register("siteId")}
                  className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-navy ${errors.siteId ? "border-red-400" : "border-gray-300"}`}>
                  <option value="">— Sélectionner un site —</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                {errors.siteId && <p className="mt-1 text-xs text-red-600">{errors.siteId.message}</p>}
              </div>

              {/* Champ caché pour le déclarant */}
              <input type="hidden" {...register("declareParId")} />

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white rounded bg-navy hover:opacity-90 disabled:opacity-50 transition">
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

export default IncidentsPage;
