import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useAuthStore } from "../store/authStore";
import { useRole } from "../hooks/useRole";
import Badge from "../components/ui/Badge";
import { incidentSchema } from "../validators/incidentSchema";

const TYPES   = ["ACCIDENT", "PRESQU_ACCIDENT", "SITUATION_DANGEREUSE", "INCIDENT_ENVIRONNEMENTAL"];
const GRAVITES = ["FAIBLE", "MOYEN", "GRAVE", "CRITIQUE"];

const LABELS_TYPE = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presqu'accident",
  SITUATION_DANGEREUSE:     "Situation dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Incident environnemental",
};

// Boutons d'action selon le statut de l'incident et le rôle de l'utilisateur
function BoutonsAction({ incident, user, isQhseOuAdmin, enCours, onAction }) {
  const estDeclarant = user?.id === incident.declarePar?.id;

  // BROUILLON + c'est mon incident → Soumettre
  if (incident.statut === "BROUILLON" && estDeclarant) {
    return (
      <button
        onClick={() => onAction(incident.id, "soumettre")}
        disabled={enCours}
        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-colors"
      >
        {enCours ? "..." : "Soumettre"}
      </button>
    );
  }

  // OUVERT + QHSE/ADMIN → Valider + Rejeter
  if (incident.statut === "OUVERT" && isQhseOuAdmin) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onAction(incident.id, "valider")}
          disabled={enCours}
          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#2E7D32] text-white hover:bg-[#2E7D32]/90 disabled:opacity-50 transition-colors"
        >
          {enCours ? "..." : "Valider"}
        </button>
        <button
          onClick={() => onAction(incident.id, "rejeter")}
          disabled={enCours}
          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[#DC2626] text-[#DC2626] hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Rejeter
        </button>
      </div>
    );
  }

  // EN_COURS + QHSE/ADMIN → Clôturer
  if (incident.statut === "EN_COURS" && isQhseOuAdmin) {
    return (
      <button
        onClick={() => onAction(incident.id, "cloturer")}
        disabled={enCours}
        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#475569] text-white hover:bg-[#475569]/90 disabled:opacity-50 transition-colors"
      >
        {enCours ? "..." : "Clôturer"}
      </button>
    );
  }

  return null;
}

function IncidentsPage() {
  const user = useAuthStore((s) => s.user);
  const { can } = useRole();
  const isQhseOuAdmin = can("ADMIN", "RESPONSABLE_QHSE");

  const [incidents,     setIncidents]     = useState([]);
  const [sites,         setSites]         = useState([]);
  const [chargement,    setChargement]    = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [erreurForm,    setErreurForm]    = useState("");
  const [erreurAction,  setErreurAction]  = useState("");
  // { id: string, action: string } | null — identifie quel bouton tourne
  const [actionEnCours, setActionEnCours] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      type: "ACCIDENT", gravite: "FAIBLE", description: "",
      adresseLisible: "", dateIncident: "", declareParId: user?.id ?? "", siteId: "",
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
    reset({
      type: "ACCIDENT", gravite: "FAIBLE", description: "",
      adresseLisible: "", dateIncident: "", declareParId: user?.id ?? "", siteId: "",
    });
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

  // Exécute une transition de statut (soumettre / valider / rejeter / clôturer)
  const effectuerAction = async (incidentId, action) => {
    setErreurAction("");
    setActionEnCours({ id: incidentId, action });
    try {
      await api.put(`/incidents/${incidentId}/${action}`);
      await charger();
    } catch (err) {
      setErreurAction(err.response?.data?.message || `Erreur lors de l'action "${action}".`);
    } finally {
      setActionEnCours(null);
    }
  };

  const inputCls = (name) =>
    `w-full px-3 py-2.5 text-sm border rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition ${
      errors[name] ? "border-[#DC2626]" : "border-[#E2E8F0]"
    }`;

  return (
    <AppLayout titre="Incidents">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[#64748B]">{incidents.length} incident(s)</p>
        <button
          onClick={ouvrirModal}
          className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors"
        >
          Nouvel incident
        </button>
      </div>

      {/* Erreur d'action workflow (non-bloquante, au-dessus du tableau) */}
      {erreurAction && (
        <div className="mb-4 p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
          <span>{erreurAction}</span>
          <button onClick={() => setErreurAction("")} className="ml-4 text-[#94A3B8] hover:text-[#64748B] text-base leading-none">&#x2715;</button>
        </div>
      )}

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Référence", "Type", "Gravité", "Statut", "Date", "Lieu", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#94A3B8]">Aucun incident enregistré</td>
                </tr>
              ) : (
                incidents.map((inc) => {
                  const boutonEnCours =
                    actionEnCours?.id === inc.id ? actionEnCours.action : null;
                  return (
                    <tr key={inc.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 font-semibold text-navy text-xs whitespace-nowrap">{inc.numeroReference}</td>
                      <td className="px-4 py-3 text-[#475569]">{LABELS_TYPE[inc.type] ?? inc.type}</td>
                      <td className="px-4 py-3"><Badge variant={inc.gravite} /></td>
                      <td className="px-4 py-3"><Badge variant={inc.statut} /></td>
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                        {inc.dateIncident ? new Date(inc.dateIncident).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{inc.adresseLisible || "—"}</td>
                      <td className="px-4 py-3">
                        <BoutonsAction
                          incident={inc}
                          user={user}
                          isQhseOuAdmin={isQhseOuAdmin}
                          enCours={!!boutonEnCours}
                          onAction={effectuerAction}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale de création d'incident */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1E293B]">Nouvel incident</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition text-base leading-none"
              >
                &#x2715;
              </button>
            </div>

            {erreurForm && (
              <div className="mb-4 p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md">{erreurForm}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Type</label>
                  <select {...register("type")} className={inputCls("type")}>
                    {TYPES.map((t) => <option key={t} value={t}>{LABELS_TYPE[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Gravité</label>
                  <select {...register("gravite")} className={inputCls("gravite")}>
                    {GRAVITES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Date de l'incident</label>
                <input type="datetime-local" {...register("dateIncident")} className={inputCls("dateIncident")} />
                {errors.dateIncident && <p className="mt-1 text-xs text-[#DC2626]">{errors.dateIncident.message}</p>}
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Lieu</label>
                <input
                  type="text"
                  {...register("adresseLisible")}
                  placeholder="ex: Atelier A, Zone industrielle"
                  className={inputCls("adresseLisible")}
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Description</label>
                <textarea {...register("description")} rows={3} className={`${inputCls("description")} resize-none`} />
                {errors.description && <p className="mt-1 text-xs text-[#DC2626]">{errors.description.message}</p>}
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Site</label>
                <select {...register("siteId")} className={inputCls("siteId")}>
                  <option value="">— Sélectionner un site —</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                {errors.siteId && <p className="mt-1 text-xs text-[#DC2626]">{errors.siteId.message}</p>}
              </div>

              <input type="hidden" {...register("declareParId")} />

              <div className="flex justify-end gap-3 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors"
                >
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
