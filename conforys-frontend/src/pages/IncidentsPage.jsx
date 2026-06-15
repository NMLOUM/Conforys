import { useState, useEffect } from "react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useAuthStore } from "../store/authStore";
import Badge from "../components/ui/Badge";

const TYPES = ["ACCIDENT", "PRESQUE_ACCIDENT", "SITUATION_DANGEREUSE", "INCIDENT_ENVIRONNEMENTAL"];
const GRAVITES = ["FAIBLE", "MODEREE", "GRAVE", "CRITIQUE"];

const FORM_VIDE = (userId) => ({
  type: "ACCIDENT",
  gravite: "FAIBLE",
  description: "",
  adresseLisible: "",
  dateIncident: "",
  declareParId: userId || "",
  siteId: "",
});

function IncidentsPage() {
  const user = useAuthStore((s) => s.user);
  const [incidents, setIncidents] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [form, setForm] = useState(FORM_VIDE(user?.id));

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

  useEffect(() => { charger(); }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      await api.post("/incidents", form);
      setShowModal(false);
      setForm(FORM_VIDE(user?.id));
      charger();
    } catch (err) {
      console.error("Erreur création incident:", err);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AppLayout titre="Incidents">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{incidents.length} incident(s)</p>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-medium text-white rounded bg-navy hover:opacity-90 transition"
        >
          Nouveau
        </button>
      </div>

      {chargement ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Référence", "Type", "Gravité", "Date", "Lieu"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Aucun incident enregistré
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-navy">{inc.numeroReference}</td>
                    <td className="px-4 py-3 text-gray-700">{inc.type}</td>
                    <td className="px-4 py-3">
                      <Badge variant={inc.gravite} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {inc.dateIncident
                        ? new Date(inc.dateIncident).toLocaleDateString("fr-FR")
                        : "-"}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="w-full max-w-lg bg-white rounded-lg p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-navy">Nouvel incident</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                &#x2715;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Type</label>
                  <select name="type" value={form.type} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy">
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Gravité</label>
                  <select name="gravite" value={form.gravite} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy">
                    {GRAVITES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Date de l'incident</label>
                <input type="datetime-local" name="dateIncident" value={form.dateIncident}
                  onChange={handleChange} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Lieu</label>
                <input type="text" name="adresseLisible" value={form.adresseLisible}
                  onChange={handleChange} placeholder="ex: Atelier A, Zone industrielle"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy resize-none" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">ID Site</label>
                <input type="text" name="siteId" value={form.siteId} onChange={handleChange}
                  required placeholder="Identifiant du site"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={envoi}
                  className="px-4 py-2 text-sm font-medium text-white rounded bg-navy hover:opacity-90 disabled:opacity-50 transition">
                  {envoi ? "Enregistrement..." : "Enregistrer"}
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
