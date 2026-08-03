import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ClipboardPlus, AlertTriangle } from "lucide-react";
import api from "../../api/axios";

// Gravités pour lesquelles une analyse des causes doit au moins avoir été
// initialisée avant de pouvoir créer une action corrective — même règle que
// GRAVITES_ANALYSE_REQUISE côté backend (actionService.createAction).
const GRAVITES_ANALYSE_REQUISE = ["GRAVE", "CRITIQUE"];

const PRIORITES = [
  { value: "FAIBLE",   label: "Faible" },
  { value: "MOYEN",    label: "Moyen" },
  { value: "ELEVE",    label: "Élevé" },
  { value: "CRITIQUE", label: "Critique" },
];

const FORM_DEFAUT = { description: "", responsableId: "", priorite: "MOYEN", dateLimite: "" };

// Carte "Action corrective" affichée sur la page détail de l'incident, à côté
// de l'analyse des causes. Pour un incident faible/moyen, la création directe
// est immédiate. Pour un incident grave/critique, elle reste bloquée tant
// qu'aucune analyse des causes n'a été initialisée pour cet incident.
function ActionCorrectiveDirecte({ incident, peutGerer }) {
  const navigate = useNavigate();
  const [analyse,    setAnalyse]    = useState(null);
  const [chargement, setChargement] = useState(true);
  const [users,      setUsers]      = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(FORM_DEFAUT);
  const [erreur,    setErreur]    = useState("");
  const [envoi,     setEnvoi]     = useState(false);

  useEffect(() => {
    api.get(`/incidents/${incident.id}/analyse`)
      .then((res) => setAnalyse(res.data.data))
      .catch(() => setAnalyse(null))
      .finally(() => setChargement(false));
  }, [incident.id]);

  useEffect(() => {
    if (peutGerer) api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
  }, [peutGerer]);

  if (!peutGerer) return null;

  const analyseRequise   = GRAVITES_ANALYSE_REQUISE.includes(incident.gravite);
  const analyseManquante = analyseRequise && !analyse;

  const ouvrirModal = () => {
    setForm(FORM_DEFAUT);
    setErreur("");
    setShowModal(true);
  };

  const soumettre = async () => {
    if (!form.description.trim() || form.description.trim().length < 5) {
      setErreur("La description doit faire au moins 5 caractères.");
      return;
    }
    if (!form.responsableId) {
      setErreur("Sélectionnez un responsable.");
      return;
    }
    setErreur("");
    setEnvoi(true);
    try {
      const res = await api.post(`/incidents/${incident.id}/actions`, {
        description:   form.description.trim(),
        responsableId: form.responsableId,
        priorite:      form.priorite,
        dateLimite:    form.dateLimite || null,
      });
      toast.success("Action corrective créée");
      setShowModal(false);
      navigate(`/actions/${res.data.data.id}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la création de l'action corrective.";
      setErreur(msg);
      toast.error(msg);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy mb-3">
        <ClipboardPlus size={15} color="#0D2B4E" strokeWidth={2} />
        Action corrective
      </h2>

      {chargement ? (
        <p className="text-xs text-[#64748B]">Chargement…</p>
      ) : analyseManquante ? (
        <p className="flex items-start gap-2 text-xs" style={{ color: "#9A3412" }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          Incident {incident.gravite === "CRITIQUE" ? "critique" : "grave"} : une analyse des causes est requise avant
          de créer une action corrective.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-[#64748B]">
            {analyseRequise
              ? "L'analyse des causes a été initialisée : vous pouvez créer une action corrective directement, ou depuis la cause racine identifiée."
              : "Cause évidente pour un incident de cette gravité : vous pouvez créer une action corrective directement."}
          </p>
          <button type="button" onClick={ouvrirModal}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors"
            style={{ backgroundColor: "#0D2B4E" }}>
            Ajouter une action corrective
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] mx-4">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
              <h3 className="text-[15px] font-semibold text-[#1E293B]">Nouvelle action corrective</h3>
              <button type="button" onClick={() => setShowModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
                &#x2715;
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {erreur && (
                <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
              )}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Description *</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Décrivez l'action corrective à mener…"
                  className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Responsable *</label>
                  <select value={form.responsableId} onChange={(e) => setForm((f) => ({ ...f, responsableId: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition">
                    <option value="">Sélectionner…</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Priorité</label>
                  <select value={form.priorite} onChange={(e) => setForm((f) => ({ ...f, priorite: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition">
                    {PRIORITES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">
                  Date limite <span className="font-normal normal-case">(optionnel)</span>
                </label>
                <input type="date" value={form.dateLimite} onChange={(e) => setForm((f) => ({ ...f, dateLimite: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
                Annuler
              </button>
              <button type="button" onClick={soumettre} disabled={envoi}
                className="px-4 py-2 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "#0D2B4E" }}>
                {envoi ? "Création…" : "Créer l'action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionCorrectiveDirecte;
