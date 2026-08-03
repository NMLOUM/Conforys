import { useState } from "react";

// Modale de validation d'un incident (choix obligatoire de l'employé qui va
// le traiter) — partagée entre la page de détail et la liste des incidents.
// `incident` est optionnel : quand il est fourni (vue liste), un aperçu de
// l'incident visé est affiché.
function ModalValiderIncident({ incident, users, onConfirm, onClose }) {
  const [employeId, setEmployeId] = useState("");
  const [erreur,     setErreur]   = useState("");
  const [envoi,      setEnvoi]    = useState(false);

  const confirmer = async () => {
    if (!employeId) {
      setErreur("Sélectionnez un employé pour traiter cet incident.");
      return;
    }
    setErreur("");
    setEnvoi(true);
    try {
      await onConfirm(employeId);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Valider l'incident</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {incident && (
            <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#475569]">
              {incident.numeroReference} : {incident.description?.slice(0, 80)}…
            </div>
          )}
          <p className="text-xs text-[#64748B]">
            La validation passe l'incident en traitement. Choisissez l'employé qui en aura la charge.
          </p>
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">
              Assigner à *
            </label>
            <select value={employeId} onChange={(e) => setEmployeId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition">
              <option value="">Sélectionner un employé…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button type="button" onClick={confirmer} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#2E7D32" }}>
            {envoi ? "Validation…" : "Valider et assigner"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalValiderIncident;
