import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Flame, ShieldCheck, Zap, Trash2, HeartPulse, Mountain } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";
import { formationSchema } from "../validators/formationSchema";

const FORM_DEFAUT = { titre: "", formateur: "", dateDebut: "", dateFin: "", dureeHeures: "", theme: "", siteId: "" };

// ── Thèmes de formation — icône + libellé, utilisés par la bibliothèque de modules ──
const THEMES = {
  INCENDIE:            { label: "Incendie",             Icone: Flame },
  EPI:                 { label: "EPI",                  Icone: ShieldCheck },
  RISQUES_ELECTRIQUES: { label: "Risques électriques",  Icone: Zap },
  DECHETS:             { label: "Déchets",               Icone: Trash2 },
  PREMIERS_SECOURS:    { label: "Premiers secours",     Icone: HeartPulse },
  TRAVAIL_HAUTEUR:     { label: "Travail en hauteur",   Icone: Mountain },
};

// ── Statut de session — palette dédiée (navy/orange/vert/gris) ──────────────
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

// ── Avatar à initiales — participant d'une session ───────────────────────────
function AvatarInitiales({ prenom, nom }) {
  const init = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div
      title={`${prenom ?? ""} ${nom ?? ""}`.trim()}
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 border-2 border-white -ml-2 first:ml-0"
      style={{ backgroundColor: "#0D2B4E" }}
    >
      {init}
    </div>
  );
}

// ── Barre de progression — proportion de participants marqués présents ──────
function BarreProgression({ valeur }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${valeur}%`, backgroundColor: valeur >= 100 ? "#2E7D32" : "#0D2B4E" }} />
    </div>
  );
}

// ── Cartes de synthèse ────────────────────────────────────────────────────────
function CartesSynthese({ stats }) {
  const cartes = [
    { label: "Sessions planifiées",     value: stats?.sessionsPlanifiees ?? 0,           sub: "à venir",                  accent: "#0D2B4E" },
    { label: "Taux de participation",   value: `${stats?.tauxParticipation ?? 0}%`,      sub: "sessions réalisées",       accent: "#2E7D32" },
    { label: "Recyclages à prévoir",    value: stats?.recyclagesAPrevoir ?? 0,           sub: "formations de +1 an",      accent: "#EA580C" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
      {cartes.map((c) => (
        <div key={c.label} className="bg-white rounded-lg p-5 flex flex-col justify-between"
          style={{ minHeight: "108px", border: "1px solid #E2E8F0", borderLeft: `4px solid ${c.accent}` }}>
          <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{c.label}</p>
          <p className="text-[28px] font-bold leading-none" style={{ color: c.accent }}>{c.value}</p>
          <p className="text-[12px] text-[#94A3B8]">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Bibliothèque de modules — thèmes de formation ────────────────────────────
function BibliothequeModules({ filtreTheme, onFiltrer }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold text-navy mb-2">Bibliothèque de modules</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(THEMES).map(([cle, { label, Icone }]) => {
          const actif = filtreTheme === cle;
          return (
            <button
              key={cle}
              onClick={() => onFiltrer(actif ? null : cle)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                actif ? "border-navy bg-navy/5" : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
              }`}
            >
              <Icone size={22} color="#0D2B4E" strokeWidth={1.6} />
              <span className="text-xs font-medium text-[#1E293B] text-center">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormationsPage() {
  const { can } = useRole();
  const peutGerer = can("RESPONSABLE_QHSE");
  const navigate = useNavigate();

  const [formations,  setFormations]  = useState([]);
  const [sites,       setSites]       = useState([]);
  const [users,       setUsers]       = useState([]);
  const [stats,       setStats]       = useState(null);
  const [chargement,  setChargement]  = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [erreurForm,  setErreurForm]  = useState("");
  const [formationEnEdition, setFormationEnEdition] = useState(null);
  const [participantsSelectionnes, setParticipantsSelectionnes] = useState([]);
  const [filtreTheme, setFiltreTheme] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    mode: "onBlur",
    resolver: zodResolver(formationSchema),
    defaultValues: FORM_DEFAUT,
  });

  const formationsFiltrees = formations.filter((f) => !filtreTheme || f.theme === filtreTheme);
  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(formationsFiltrees, ["titre", "formateur"]);

  useEffect(() => {
    document.title = "Formations";
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

  const chargerStats = async () => {
    try {
      const res = await api.get("/formations/stats");
      setStats(res.data.data);
    } catch (e) {
      console.error("Erreur chargement stats formations:", e);
    }
  };

  useEffect(() => {
    charger();
    chargerStats();
    api.get("/sites").then((r) => setSites(r.data.data || [])).catch(() => {});
    if (peutGerer) {
      api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
    }
  }, []);

  const ouvrirCreation = () => {
    setErreurForm("");
    setFormationEnEdition(null);
    setParticipantsSelectionnes([]);
    reset(FORM_DEFAUT);
    setShowModal(true);
  };

  const ouvrirModification = (f) => {
    setErreurForm("");
    setFormationEnEdition(f);
    setParticipantsSelectionnes(f.participations.map((p) => p.participantId));
    reset({
      titre: f.titre,
      formateur: f.formateur,
      dateDebut: f.dateDebut ? new Date(f.dateDebut).toISOString().split("T")[0] : "",
      dateFin: f.dateFin ? new Date(f.dateFin).toISOString().split("T")[0] : "",
      dureeHeures: f.dureeHeures ?? "",
      theme: f.theme ?? "",
      siteId: f.siteId,
    });
    setShowModal(true);
  };

  const toggleParticipant = (userId) => {
    setParticipantsSelectionnes((liste) =>
      liste.includes(userId) ? liste.filter((id) => id !== userId) : [...liste, userId]
    );
  };

  const onSubmit = async (data) => {
    setErreurForm("");
    const payload = {
      ...data,
      theme: data.theme || null,
      dateFin: data.dateFin || null,
      dureeHeures: data.dureeHeures || null,
      participantIds: participantsSelectionnes,
    };
    try {
      if (formationEnEdition) {
        await api.put(`/formations/${formationEnEdition.id}`, payload);
        toast.success("Formation modifiée avec succès");
      } else {
        await api.post("/formations", payload);
        toast.success("Formation enregistrée avec succès");
      }
      setShowModal(false);
      charger();
      chargerStats();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'enregistrement.";
      setErreurForm(msg);
      toast.error(msg);
    }
  };

  const inputCls = (name) =>
    `w-full px-3 py-2.5 text-sm border rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition ${
      errors[name] ? "border-[#DC2626]" : "border-[#E2E8F0]"
    }`;

  return (
    <AppLayout titre="Formations">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-lg font-semibold text-navy">Formations</h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">Tableau de bord <span className="mx-1">›</span> Formations</p>
        </div>
        {peutGerer && (
          <button onClick={ouvrirCreation}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors">
            Nouvelle session
          </button>
        )}
      </div>

      <div className="my-5">
        <CartesSynthese stats={stats} />
        <BibliothequeModules filtreTheme={filtreTheme} onFiltrer={setFiltreTheme} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Rechercher par titre, formateur…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition" />
        </div>
        <span className="text-sm text-[#64748B] shrink-0">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
        {filtreTheme && (
          <button onClick={() => setFiltreTheme(null)} className="text-xs text-[#64748B] hover:text-navy underline shrink-0">
            Retirer le filtre « {THEMES[filtreTheme]?.label} »
          </button>
        )}
      </div>

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  {["Session", "Date", "Participants", "Statut", "Progression", peutGerer ? "Actions" : null].filter(Boolean).map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {affiches.length === 0 ? (
                  <tr><td colSpan={peutGerer ? 6 : 5} className="px-4 py-12 text-center text-[#94A3B8]">
                    {recherche || filtreTheme ? "Aucune session ne correspond aux critères." : "Aucune formation enregistrée"}
                  </td></tr>
                ) : (
                  affiches.map((f) => {
                    const total = f.participations.length;
                    const presents = f.participations.filter((p) => p.present).length;
                    const progression = total > 0 ? Math.round((presents / total) * 100) : 0;
                    const MAX_AVATARS = 4;
                    return (
                      <tr key={f.id} onClick={() => navigate(`/formations/${f.id}`)}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#1E293B]">{f.titre}</p>
                          <p className="text-xs text-[#94A3B8] mt-0.5">{f.formateur}</p>
                        </td>
                        <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                          {f.dateDebut ? new Date(f.dateDebut).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {total === 0 ? (
                            <span className="text-[#94A3B8]">—</span>
                          ) : (
                            <div className="flex items-center">
                              <div className="flex">
                                {f.participations.slice(0, MAX_AVATARS).map((p) => (
                                  <AvatarInitiales key={p.id} prenom={p.participant.prenom} nom={p.participant.nom} />
                                ))}
                              </div>
                              {total > MAX_AVATARS && (
                                <span className="ml-1.5 text-[10px] font-semibold text-[#64748B]">+{total - MAX_AVATARS}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3"><BadgeStatut statut={f.statut} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <BarreProgression valeur={progression} />
                            <span className="text-xs font-medium text-[#64748B] shrink-0">{progression}%</span>
                          </div>
                        </td>
                        {peutGerer && (
                          <td className="px-4 py-3">
                            <button onClick={(e) => { e.stopPropagation(); ouvrirModification(f); }}
                              className="px-2.5 py-1 text-xs font-medium text-navy border border-[#E2E8F0] rounded-md hover:bg-[#F1F5F9] transition-colors">
                              Modifier
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                ← Précédent
              </button>
              <span className="text-xs text-[#64748B]">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modale de création / modification ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1E293B]">{formationEnEdition ? "Modifier la session" : "Nouvelle session"}</h2>
              <button onClick={() => setShowModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition text-base leading-none">
                &#x2715;
              </button>
            </div>

            {erreurForm && (
              <div className="mb-4 p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md">{erreurForm}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Titre</label>
                <input type="text" {...register("titre")} placeholder="ex: Sécurité incendie" className={inputCls("titre")} />
                {errors.titre && <p className="mt-1 text-xs text-[#DC2626]">{errors.titre.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Formateur</label>
                  <input type="text" {...register("formateur")} placeholder="Nom du formateur" className={inputCls("formateur")} />
                  {errors.formateur && <p className="mt-1 text-xs text-[#DC2626]">{errors.formateur.message}</p>}
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Thème</label>
                  <select {...register("theme")} className={inputCls("theme")}>
                    <option value="">Aucun</option>
                    {Object.entries(THEMES).map(([cle, { label }]) => <option key={cle} value={cle}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Date de début</label>
                  <input type="date" {...register("dateDebut")} className={inputCls("dateDebut")} />
                  {errors.dateDebut && <p className="mt-1 text-xs text-[#DC2626]">{errors.dateDebut.message}</p>}
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Date de fin</label>
                  <input type="date" {...register("dateFin")} className={inputCls("dateFin")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Durée (heures)</label>
                  <input type="number" step="0.5" {...register("dureeHeures")} placeholder="ex: 7" className={inputCls("dureeHeures")} />
                  {errors.dureeHeures && <p className="mt-1 text-xs text-[#DC2626]">{errors.dureeHeures.message}</p>}
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Site</label>
                  <select {...register("siteId")} className={inputCls("siteId")}>
                    <option value="">Sélectionner un site</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                  {errors.siteId && <p className="mt-1 text-xs text-[#DC2626]">{errors.siteId.message}</p>}
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wide">Participants</label>
                <div className="border border-[#E2E8F0] rounded-md max-h-40 overflow-y-auto divide-y divide-[#F1F5F9]">
                  {users.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-[#94A3B8]">Aucun utilisateur disponible.</p>
                  ) : (
                    users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[#F8FAFC]">
                        <input
                          type="checkbox"
                          checked={participantsSelectionnes.includes(u.id)}
                          onChange={() => toggleParticipant(u.id)}
                          className="w-4 h-4 rounded border-[#E2E8F0] text-navy focus:ring-navy/30"
                        />
                        <span className="text-[#1E293B]">{u.prenom} {u.nom}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#F1F5F9]">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
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
