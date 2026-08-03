import { useState } from "react";

// Modale de rejet d'un incident (motif obligatoire) — partagée entre la page
// de détail et la liste des incidents. `incident` est optionnel : quand il
// est fourni (vue liste), un aperçu de l'incident visé est affiché.
function ModalRejeterIncident({ incident, onConfirm, onClose }) {
  const [motif,  setMotif]  = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi,  setEnvoi]  = useState(false);

  const confirmer = async () => {
    if (!motif.trim() || motif.trim().length < 5) {
      setErreur("Le motif doit faire au moins 5 caractères.");
      return;
    }
    setErreur("");
    setEnvoi(true);
    try {
      await onConfirm(motif.trim());
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Rejeter l'incident</h3>
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
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">
              Motif de rejet *
            </label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={4}
              placeholder="Expliquez pourquoi cet incident est rejeté…"
              className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626] transition resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button type="button" onClick={confirmer} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#DC2626" }}>
            {envoi ? "Rejet en cours…" : "Confirmer le rejet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalRejeterIncident;
