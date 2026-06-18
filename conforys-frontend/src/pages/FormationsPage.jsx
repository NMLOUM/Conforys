import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";
import { formationSchema } from "../validators/formationSchema";

const STATUTS = ["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"];

const FORM_DEFAUT = { titre: "", formateur: "", dateDebut: "", statut: "PLANIFIEE", siteId: "" };

function FormationsPage() {
  const { can } = useRole();
  const [formations, setFormations] = useState([]);
  const [sites,      setSites]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [erreurForm, setErreurForm] = useState("");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(formationSchema),
    defaultValues: FORM_DEFAUT,
  });

  useEffect(() => {
    document.title = "CONFORYS — Formations";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get("/formations");
      setFormations(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement formations:", e);
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
      await api.post("/formations", data);
      setShowModal(false);
      charger();
    } catch (err) {
      setErreurForm(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    }
  };

  const FieldError = ({ name }) =>
    errors[name] ? <p className="mt-1 text-xs text-red-600">{errors[name].message}</p> : null;

  const inputCls = (name) =>
    `w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-navy ${errors[name] ? "border-red-400" : "border-gray-300"}`;

  return (
    <AppLayout titre="Formations">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{formations.length} formation(s)</p>
        {can("ADMIN", "RESPONSABLE_QHSE") && (
          <button onClick={ouvrirModal}
            className="px-4 py-2 text-sm font-medium text-white rounded bg-navy hover:opacity-90 transition">
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
                {["Titre", "Formateur", "Date de début", "Statut"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {formations.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Aucune formation enregistrée</td></tr>
              ) : (
                formations.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{f.titre}</td>
                    <td className="px-4 py-3 text-gray-600">{f.formateur || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {f.dateDebut ? new Date(f.dateDebut).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td className="px-4 py-3"><Badge variant={f.statut} /></td>
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
          <div className="w-full max-w-md bg-white rounded-lg p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-navy">Nouvelle formation</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&#x2715;</button>
            </div>

            {erreurForm && (
              <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{erreurForm}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Titre</label>
                <input type="text" {...register("titre")} placeholder="ex: Sécurité incendie" className={inputCls("titre")} />
                <FieldError name="titre" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Formateur</label>
                <input type="text" {...register("formateur")} placeholder="Nom du formateur" className={inputCls("formateur")} />
                <FieldError name="formateur" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Date de début</label>
                  <input type="date" {...register("dateDebut")} className={inputCls("dateDebut")} />
                  <FieldError name="dateDebut" />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Statut</label>
                  <select {...register("statut")} className={inputCls("statut")}>
                    {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Site</label>
                <select {...register("siteId")} className={inputCls("siteId")}>
                  <option value="">— Sélectionner un site —</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                <FieldError name="siteId" />
              </div>
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

export default FormationsPage;
