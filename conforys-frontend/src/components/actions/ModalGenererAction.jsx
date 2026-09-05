import { useState } from "react";
import { X, CheckCircle2, CalendarDays, Save } from "lucide-react";

const PRIORITES = [
  { value: "FAIBLE",   label: "Faible" },
  { value: "MOYEN",    label: "Moyen" },
  { value: "ELEVE",    label: "Élevé" },
  { value: "CRITIQUE", label: "Critique" },
];

// Rang de sévérité (pour la jauge visuelle) et couleur — mêmes teintes que le
// composant Badge partagé (MOYEN=jaune, ELEVE=orange, CRITIQUE=rouge) pour
// rester cohérent avec le reste de l'app.
const SEVERITE = {
  FAIBLE:   { rang: 1, couleur: "#22C55E" },
  MOYEN:    { rang: 2, couleur: "#EAB308" },
  ELEVE:    { rang: 3, couleur: "#EA580C" },
  CRITIQUE: { rang: 4, couleur: "#DC2626" },
};

const LABELS_ROLE = {
  ADMIN: "Admin", RESPONSABLE_QHSE: "Resp. QHSE", MANAGER: "Manager", EMPLOYE: "Employé",
};

const initiales = (u) => `${u.prenom?.[0] ?? ""}${u.nom?.[0] ?? ""}`.toUpperCase() || "?";

// Formulaire partagé de création d'une action corrective à partir d'un
// contexte source (risque DUERP, cause racine, non-conformité d'audit…) —
// présenté en panneau latéral (côté droit) plutôt qu'en boîte de dialogue
// centrée. La description et la priorité sont pré-remplies mais restent
// modifiables ; le responsable doit toujours être choisi explicitement.
function ModalGenererAction({ titre, contexte, defaultDescription = "", defaultPriorite = "MOYEN", users, onClose, onConfirm }) {
  const [description,   setDescription]   = useState(defaultDescription);
  const [responsableId, setResponsableId] = useState("");
  const [priorite,      setPriorite]      = useState(defaultPriorite);
  const [dateLimite,    setDateLimite]    = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi,  setEnvoi]  = useState(false);

  const soumettre = async () => {
    if (!description.trim() || description.trim().length < 5) {
      setErreur("La description doit faire au moins 5 caractères.");
      return;
    }
    if (!responsableId) {
      setErreur("Sélectionnez un responsable.");
      return;
    }
    setErreur("");
    setEnvoi(true);
    try {
      await onConfirm({ description: description.trim(), responsableId, priorite, dateLimite: dateLimite || null });
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la création de l'action corrective.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* En-tête */}
        <div className="px-8 py-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold text-navy">{titre}</h3>
            {contexte && (
              <div className="flex items-center gap-2 mt-1.5 text-sm">
                <span className="text-[#64748B]">Contexte :</span>
                <span className="font-semibold bg-navy/10 text-navy px-2 py-0.5 rounded text-xs">{contexte}</span>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#E2E8F0] flex items-center justify-center transition-colors shrink-0">
            <X size={18} className="text-[#64748B]" />
          </button>
        </div>

        {/* Contenu du formulaire */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Description de l'action *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={4} placeholder="Décrivez les étapes de l'action corrective…"
              className="w-full px-4 py-3 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition resize-none" />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Responsable de l'action *</label>
            <div className="grid grid-cols-2 gap-3">
              {users.map((u) => {
                const actif = responsableId === u.id;
                return (
                  <button key={u.id} type="button" onClick={() => setResponsableId(u.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      actif ? "border-navy bg-navy/5" : "border-[#E2E8F0] hover:border-navy/40 hover:bg-[#F8FAFC]"
                    }`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: "#0D2B4E" }}>
                      {initiales(u)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-navy truncate">{u.prenom} {u.nom}</p>
                      <p className="text-[10px] text-[#64748B]">{LABELS_ROLE[u.role] ?? u.role}</p>
                    </div>
                    {actif && <CheckCircle2 size={18} className="text-navy shrink-0" style={{ fill: "#0D2B4E", color: "white" }} />}
                  </button>
                );
              })}
              {users.length === 0 && (
                <p className="col-span-2 text-xs text-[#94A3B8]">Aucun utilisateur disponible.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Échéance</label>
              <div className="relative">
                <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                <input type="date" value={dateLimite} onChange={(e) => setDateLimite(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Niveau de priorité</label>
              <select value={priorite} onChange={(e) => setPriorite(e.target.value)}
                className="w-full px-3 py-3 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition">
                {PRIORITES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Sévérité :</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((seuil) => (
                <div key={seuil} className="w-6 h-1.5 rounded-full"
                  style={{ backgroundColor: seuil <= SEVERITE[priorite].rang ? SEVERITE[priorite].couleur : "#E2E8F0" }} />
              ))}
            </div>
          </div>
        </div>

        {/* Pied de panneau */}
        <div className="px-8 py-6 border-t border-[#E2E8F0] bg-white flex items-center justify-between shrink-0">
          <button type="button" onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-[#64748B] rounded-lg hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button type="button" onClick={soumettre} disabled={envoi}
            className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-white rounded-lg shadow-lg disabled:opacity-50 transition-all"
            style={{ backgroundColor: "#0D2B4E" }}>
            <Save size={16} />
            {envoi ? "Enregistrement…" : "Enregistrer l'action"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalGenererAction;
