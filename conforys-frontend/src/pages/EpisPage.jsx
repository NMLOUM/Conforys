import { useState, useEffect } from "react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";

const FORM_VIDE = {
  designation: "",
  type: "",
  quantite: "",
  seuilAlerte: "",
  siteId: "",
};

function EpisPage() {
  const [epis, setEpis] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);

  useEffect(() => { document.title = "CONFORYS — EPI"; return () => { document.title = "CONFORYS"; }; }, []);

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

  useEffect(() => { charger(); }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      await api.post("/epis", {
        ...form,
        quantite: parseInt(form.quantite, 10),
        seuilAlerte: parseInt(form.seuilAlerte, 10),
      });
      setShowModal(false);
      setForm(FORM_VIDE);
      charger();
    } catch (err) {
      console.error("Erreur création EPI:", err);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AppLayout titre="Equipements de Protection Individuelle">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{epis.length} EPI(s) enregistré(s)</p>
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
                {["Désignation", "Type", "Quantité", "Seuil alerte", "Statut"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {epis.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Aucun EPI enregistré
                  </td>
                </tr>
              ) : (
                epis.map((epi) => {
                  const enAlerte = epi.quantite <= epi.seuilAlerte;
                  return (
                    <tr key={epi.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{epi.designation}</td>
                      <td className="px-4 py-3 text-gray-600">{epi.type || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{epi.quantite}</td>
                      <td className="px-4 py-3 text-gray-600">{epi.seuilAlerte}</td>
                      <td className="px-4 py-3">
                        <Badge variant={enAlerte ? "ALERTE" : "STOCK_OK"} />
                      </td>
                    </tr>
                  );
                })
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
          <div className="w-full max-w-md bg-white rounded-lg p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-navy">Nouvel EPI</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                &#x2715;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Désignation</label>
                <input type="text" name="designation" value={form.designation}
                  onChange={handleChange} required placeholder="ex: Casque de chantier"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Type</label>
                <input type="text" name="type" value={form.type}
                  onChange={handleChange} placeholder="ex: Protection tête"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Quantité</label>
                  <input type="number" name="quantite" value={form.quantite}
                    onChange={handleChange} required min={0}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Seuil d'alerte</label>
                  <input type="number" name="seuilAlerte" value={form.seuilAlerte}
                    onChange={handleChange} required min={0}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">ID Site</label>
                <input type="text" name="siteId" value={form.siteId}
                  onChange={handleChange} required placeholder="Identifiant du site"
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

export default EpisPage;
