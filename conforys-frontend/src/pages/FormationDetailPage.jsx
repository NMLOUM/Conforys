import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Flame, ShieldCheck, Zap, Trash2, HeartPulse, Mountain } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useRole } from "../hooks/useRole";

const THEMES = {
  INCENDIE:            { label: "Incendie",             Icone: Flame },
  EPI:                 { label: "EPI",                  Icone: ShieldCheck },
  RISQUES_ELECTRIQUES: { label: "Risques électriques",  Icone: Zap },
  DECHETS:             { label: "Déchets",               Icone: Trash2 },
  PREMIERS_SECOURS:    { label: "Premiers secours",     Icone: HeartPulse },
  TRAVAIL_HAUTEUR:     { label: "Travail en hauteur",   Icone: Mountain },
};

const CONFIG_STATUT = {
  PLANIFIEE: { bg: "rgba(13,43,78,0.06)", text: "#0D2B4E", dot: "#0D2B4E", label: "Planifiée" },
  EN_COURS:  { bg: "#FFF7ED",             text: "#EA580C", dot: "#EA580C", label: "En cours" },
  TERMINEE:  { bg: "#F0FDF4",             text: "#2E7D32", dot: "#2E7D32", label: "Terminée" },
  ANNULEE:   { bg: "#F1F5F9",             text: "#64748B", dot: "#94A3B8", label: "Annulée" },
};

function BadgeStatut({ statut }) {
  const c = CONFIG_STATUT[statut] ?? CONFIG_STATUT.PLANIFIEE;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
}

function AvatarInitiales({ prenom, nom }) {
  const init = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ backgroundColor: "#0D2B4E" }}>
      {init}
    </div>
  );
}

function FormationDetailPage() {
  const { id } = useParams();
  const { can } = useRole();
  const peutGerer = can("RESPONSABLE_QHSE");

  const [formation,  setFormation]  = useState(null);
  const [chargement, setChargement] = useState(true);
  const [transitionEnCours, setTransitionEnCours] = useState(false);
  const [presenceEnCours,   setPresenceEnCours]   = useState(null);
  const [validationEnCours, setValidationEnCours] = useState(null);

  useEffect(() => {
    document.title = "CONFORYS — Session de formation";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get(`/formations/${id}`);
      setFormation(res.data.data);
    } catch (e) {
      console.error("Erreur chargement formation:", e);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, [id]);

  const transitionner = async (action, libelle) => {
    setTransitionEnCours(true);
    try {
      await api.put(`/formations/${id}/${action}`);
      toast.success(`Session ${libelle}`);
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors du changement de statut.");
    } finally {
      setTransitionEnCours(false);
    }
  };

  // Mise à jour optimiste : la case doit réagir immédiatement au clic, pas
  // attendre l'aller-retour réseau (sinon elle semble ignorer le clic le
  // temps du rechargement complet de la formation).
  const majParticipationLocale = (userId, champs) => {
    setFormation((f) => ({
      ...f,
      participations: f.participations.map((p) =>
        p.participantId === userId ? { ...p, ...champs } : p
      ),
    }));
  };

  const togglePresence = async (userId, present) => {
    majParticipationLocale(userId, { present });
    setPresenceEnCours(userId);
    try {
      await api.put(`/formations/${id}/participants/${userId}/presence`, { present });
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors du marquage de présence.");
      majParticipationLocale(userId, { present: !present }); // annule en cas d'échec
    } finally {
      setPresenceEnCours(null);
    }
  };

  const valider = async (userId) => {
    setValidationEnCours(userId);
    try {
      const res = await api.put(`/formations/${id}/participants/${userId}/valider`);
      majParticipationLocale(userId, { valide: res.data.data.valide, dateValidation: res.data.data.dateValidation });
      toast.success("Participant validé");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la validation.");
    } finally {
      setValidationEnCours(null);
    }
  };

  if (chargement) {
    return <AppLayout titre="Session de formation"><p className="text-sm text-[#64748B]">Chargement...</p></AppLayout>;
  }
  if (!formation) {
    return <AppLayout titre="Session de formation"><p className="text-sm text-[#94A3B8]">Formation introuvable.</p></AppLayout>;
  }

  const theme = THEMES[formation.theme];

  return (
    <AppLayout titre="Session de formation">
      <div className="mb-5">
        <Link to="/formations" className="text-xs text-[#64748B] hover:text-navy transition-colors">
          ← Retour aux formations
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-navy">{formation.titre}</h1>
            <BadgeStatut statut={formation.statut} />
            {theme && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]">
                <theme.Icone size={13} strokeWidth={1.8} />
                {theme.label}
              </span>
            )}
          </div>
          {peutGerer && (
            <div className="flex items-center gap-2">
              {formation.statut === "PLANIFIEE" && (
                <button type="button" onClick={() => transitionner("demarrer", "démarrée")} disabled={transitionEnCours}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
                  {transitionEnCours ? "…" : "Démarrer"}
                </button>
              )}
              {formation.statut === "EN_COURS" && (
                <button type="button" onClick={() => transitionner("terminer", "terminée")} disabled={transitionEnCours}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-[#2E7D32] hover:bg-[#2E7D32]/90 disabled:opacity-50 transition-colors">
                  {transitionEnCours ? "…" : "Terminer"}
                </button>
              )}
              {(formation.statut === "PLANIFIEE" || formation.statut === "EN_COURS") && (
                <button type="button" onClick={() => transitionner("annuler", "annulée")} disabled={transitionEnCours}
                  className="px-3 py-1.5 text-xs font-medium text-[#DC2626] border border-[#E2E8F0] rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors">
                  Annuler
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-[#475569] mt-1">
          Formateur : {formation.formateur} · Site : {formation.site?.nom ?? "—"}
        </p>
        <p className="text-xs text-[#94A3B8] mt-1">
          Du {formation.dateDebut ? new Date(formation.dateDebut).toLocaleDateString("fr-FR") : "—"}
          {formation.dateFin ? ` au ${new Date(formation.dateFin).toLocaleDateString("fr-FR")}` : ""}
          {formation.dureeHeures ? ` · ${formation.dureeHeures} h` : ""}
        </p>
      </div>

      {/* ── Participants ── */}
      <p className="text-sm font-semibold text-navy mb-2">Participants</p>
      <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Participant", "Présent", "Validation", peutGerer ? "Actions" : null].filter(Boolean).map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {formation.participations.length === 0 ? (
                <tr><td colSpan={peutGerer ? 4 : 3} className="px-4 py-12 text-center text-[#94A3B8]">Aucun participant inscrit.</td></tr>
              ) : (
                formation.participations.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AvatarInitiales prenom={p.participant.prenom} nom={p.participant.nom} />
                        <span className="font-medium text-[#1E293B]">{p.participant.prenom} {p.participant.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={p.present}
                        disabled={!peutGerer || presenceEnCours === p.participantId}
                        onChange={(e) => togglePresence(p.participantId, e.target.checked)}
                        className="w-4 h-4 rounded border-[#E2E8F0] text-navy focus:ring-navy/30 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {p.valide ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          Validé{p.dateValidation ? ` · ${new Date(p.dateValidation).toLocaleDateString("fr-FR")}` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                          Non validé
                        </span>
                      )}
                    </td>
                    {peutGerer && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => valider(p.participantId)}
                          disabled={!p.present || p.valide || validationEnCours === p.participantId}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-navy hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          {validationEnCours === p.participantId ? "…" : "Valider"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

export default FormationDetailPage;
