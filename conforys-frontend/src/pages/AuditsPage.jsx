import { useState, useEffect } from "react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useAuthStore } from "../store/authStore";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";

const TYPES = ["INTERNE", "EXTERNE", "FOURNISSEUR", "REGLEMENTAIRE"];
const STATUTS = ["PLANIFIE", "EN_COURS", "TERMINE", "ANNULE"];

function AuditsPage() {
  const user = useAuthStore((s) => s.user);
  const { can } = useRole();
  const [audits, setAudits] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [form, setForm] = useState({
    titre: "",
    type: "INTERNE",
    statut: "PLANIFIE",
    datePrevue: "",
    auditeurId: user?.id || "",
    siteId: "",
  });

  useEffect(() => { document.title = "CONFORYS — Audits"; return () => { document.title = "CONFORYS"; }; }, []);

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

  useEffect(() => { charger(); }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      await api.post("/audits", form);
      setShowModal(false);
      setForm({ titre: "", type: "INTERNE", statut: "PLANIFIE", datePrevue: "", auditeurId: user?.id || "", siteId: "" });
      charger();
    } catch (err) {
      console.error("Erreur création audit:", err);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AppLayout titre="Audits internes">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{audits.length} audit(s)</p>
        {/* EMPLOYE ne peut pas créer un audit */}
        {can("ADMIN", "RESPONSABLE_QHSE") && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm font-medium text-white rounded bg-navy hover:opacity-90 transition"
          >
            Nouveau
          </button>
        )}
      </div>

      {chargement ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Référence", "Titre", "Type", "Date prévue", "Statut"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Aucun audit enregistré
                  </td>
                </tr>
              ) : (
                audits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-navy">{audit.numeroReference}</td>
                    <td className="px-4 py-3 text-gray-800">{audit.titre}</td>
                    <td className="px-4 py-3 text-gray-600">{audit.type}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {audit.datePrevue
                        ? new Date(audit.datePrevue).toLocaleDateString("fr-FR")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={audit.statut} />
                    </td>
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
              <h2 className="font-semibold text-navy">Nouvel audit</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                &#x2715;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Titre</label>
                <input type="text" name="titre" value={form.titre}
                  onChange={handleChange} required placeholder="ex: Audit sécurité Q2 2026"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Type</label>
                  <select name="type" value={form.type} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy">
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Statut</label>
                  <select name="statut" value={form.statut} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy">
                    {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Date prévue</label>
                <input type="date" name="datePrevue" value={form.datePrevue}
                  onChange={handleChange} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy" />
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

export default AuditsPage;
