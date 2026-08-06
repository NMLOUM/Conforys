import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useAuthStore } from "../store/authStore";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";
import { auditSchema } from "../validators/auditSchema";

const LABELS_TYPE = {
  SECURITE:      "Sécurité",
  QUALITE:       "Qualité",
  ENVIRONNEMENT: "Environnement",
  HYGIENE:       "Hygiène",
};

// ── Couleurs par catégorie — pilote le badge de type (table + templates) ────
const CONFIG_TYPE = {
  SECURITE:      { text: "#DC2626", bg: "#FDECEA" },
  ENVIRONNEMENT: { text: "#2E7D32", bg: "#EAF3EC" },
  HYGIENE:       { text: "#2563EB", bg: "#E7F0FB" },
  QUALITE:       { text: "#EA580C", bg: "#FEF3E2" },
};

// EPI et Électrique partagent le type SECURITE (donnée inchangée), mais
// méritent leur propre teinte d'icône pour se distinguer visuellement des
// autres templates "Sécurité" sur la bibliothèque — navy, comme demandé.
const ACCENT_NAVY = { text: "#0D2B4E", bg: "#E7EDF5" };
const IDS_ACCENT_NAVY = ["epi", "electrique"];
const accentTemplate = (template) =>
  IDS_ACCENT_NAVY.includes(template.id) ? ACCENT_NAVY : (CONFIG_TYPE[template.type] ?? ACCENT_NAVY);

function BadgeType({ type }) {
  const c = CONFIG_TYPE[type] ?? { text: "#64748B", bg: "#F1F5F9" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: c.text, backgroundColor: c.bg }}>
      {LABELS_TYPE[type] ?? type}
    </span>
  );
}

// ── Icônes des templates — traits simples, teintés selon la catégorie ───────

const TRACES_ICONES = {
  "securite-chantier": "M12 2 4 5v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V5l-8-3Z M9 12l2 2 4-4",
  "incendie":          "M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-2-1-3-1-3 1 4-1 5-2 5-2 0-3-2-1-4 1-1 1-3-2-5Z",
  "epi":               "M12 2 4 5v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V5l-8-3Z",
  "environnement":     "M5 20c8 0 14-6 14-14V4h-2C9 4 5 10 5 18v2Z M5 20c2-4 5-7 9-9",
  "hygiene":           "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z",
  "electrique":        "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
};

function IconeTemplate({ id, couleur }) {
  const trace = TRACES_ICONES[id];
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: couleur.bg }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={couleur.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={trace} />
      </svg>
    </div>
  );
}

// ── Carte de la bibliothèque de templates — coins arrondis, couleurs par catégorie ──

function CarteBibliotheque({ template, onDemarrer }) {
  const couleur = accentTemplate(template);
  return (
    <div className="h-full flex flex-col p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:border-navy/40 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <IconeTemplate id={template.id} couleur={couleur} />
        <BadgeType type={template.type} />
      </div>
      <p className="text-sm font-semibold text-[#1E293B] mb-1">{template.nom}</p>
      <p className="flex-1 text-xs text-[#64748B] leading-relaxed mb-3">{template.description}</p>
      <button
        type="button"
        onClick={() => onDemarrer(template)}
        className="shrink-0 text-xs font-semibold text-navy hover:underline text-left"
      >
        Démarrer l'audit →
      </button>
    </div>
  );
}

// ── Pastille de statut d'audit — couleurs exactes de la charte (propre à
// cette page, sans toucher au composant Badge partagé par les autres écrans) ──
const CONFIG_STATUT = {
  PLANIFIE: { label: "Planifié", text: "#2563EB", bg: "#E7F0FB" },
  EN_COURS: { label: "En cours", text: "#EA580C", bg: "#FEF3E2" },
  TERMINE:  { label: "Terminé",  text: "#2E7D32", bg: "#EAF3EC" },
  ANNULE:   { label: "Annulé",   text: "#64748B", bg: "#F1F5F9" },
};

function PastilleStatut({ statut }) {
  const c = CONFIG_STATUT[statut] ?? { label: statut, text: "#64748B", bg: "#F1F5F9" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: c.text, backgroundColor: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.text }} />
      {c.label}
    </span>
  );
}

// ── Pastille de score — colorée selon le niveau de conformité ───────────────
function PastilleScore({ score }) {
  if (score == null) return <span className="text-[#CBD5E1]">—</span>;
  const c = score >= 80 ? { text: "#2E7D32", bg: "#EAF3EC" }
    : score >= 50        ? { text: "#EA580C", bg: "#FEF3E2" }
    :                       { text: "#DC2626", bg: "#FDECEA" };
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: c.text, backgroundColor: c.bg }}>
      {score}%
    </span>
  );
}

function AuditsPage() {
  const user = useAuthStore((s) => s.user);
  const { can } = useRole();
  const [audits,     setAudits]     = useState([]);
  const [sites,      setSites]      = useState([]);
  const [templates,  setTemplates]  = useState([]);
  const [chargement, setChargement] = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [erreurForm, setErreurForm] = useState("");
  const [templateChoisi, setTemplateChoisi] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    mode: "onBlur",
    resolver: zodResolver(auditSchema),
    defaultValues: {
      titre: "", templateId: "",
      datePrevue: "", auditeurId: user?.id ?? "", siteId: "",
    },
  });

  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(audits, ["titre", "reference"]);

  useEffect(() => {
    document.title = "Audits";
    return () => { document.title = "CONFORYS"; };
  }, []);

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

  useEffect(() => {
    charger();
    api.get("/sites").then((r) => setSites(r.data.data || [])).catch(() => {});
    api.get("/audits/templates").then((r) => setTemplates(r.data.data || [])).catch(() => {});
  }, []);

  // Cliquer une carte de la bibliothèque ouvre directement le formulaire,
  // le template est déjà fixé (badge en lecture seule dans le formulaire).
  const demarrerAudit = (template) => {
    setErreurForm("");
    setTemplateChoisi(template);
    reset({ titre: template.nom, templateId: template.id, datePrevue: "", auditeurId: user?.id ?? "", siteId: "" });
    setValue("templateId", template.id);
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setErreurForm("");
    try {
      await api.post("/audits", data);
      toast.success("Audit programmé, checklist générée avec succès");
      setShowModal(false);
      charger();
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
    <AppLayout titre="Audits internes">
      {/* ── Bibliothèque de templates ── */}
      {can("RESPONSABLE_QHSE") && (
        <div className="mb-6">
          <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-3">
            Démarrer un nouvel audit
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
            {templates.map((t) => (
              <CarteBibliotheque key={t.id} template={t} onDemarrer={demarrerAudit} />
            ))}
          </div>
        </div>
      )}

      {/* ── Liste des audits ── */}
      <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-3">
        Vos audits
      </p>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Rechercher par titre, référence…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition" />
        </div>
        <span className="text-sm text-[#64748B] shrink-0">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
      </div>

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Référence", "Titre", "Type", "Date prévue", "Statut", "Score"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {affiches.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-[#94A3B8]">
                  {recherche ? "Aucun audit ne correspond à la recherche." : "Aucun audit enregistré"}
                </td></tr>
              ) : (
                affiches.map((audit) => (
                  <tr key={audit.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <Link to={`/audits/${audit.id}`} className="font-semibold text-navy hover:underline">
                        {audit.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1E293B]">{audit.titre}</td>
                    <td className="px-4 py-3"><BadgeType type={audit.type} /></td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {audit.datePrevue ? new Date(audit.datePrevue).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3"><PastilleStatut statut={audit.statut} /></td>
                    <td className="px-4 py-3 font-semibold">
                      <PastilleScore score={audit.scoreConformite} />
                    </td>
                  </tr>
                ))
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

      {/* ── Formulaire de programmation d'un audit ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] mx-4 flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#F1F5F9] shrink-0">
              <h2 className="text-lg font-semibold text-navy">Programmer une inspection</h2>
              <button onClick={() => setShowModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition text-base leading-none">
                &#x2715;
              </button>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1">
              {erreurForm && (
                <div className="mb-4 p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md">{erreurForm}</div>
              )}

              <form id="audit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {/* Section : informations générales */}
                <div>
                  <p className="text-xs font-semibold text-navy uppercase tracking-wide mb-3">
                    Informations générales
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Template</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
                        {templateChoisi && <IconeTemplate id={templateChoisi.id} couleur={accentTemplate(templateChoisi)} />}
                        <span className="text-sm font-medium text-[#1E293B]">{templateChoisi?.nom ?? "—"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Titre</label>
                      <input type="text" {...register("titre")} placeholder="ex: Audit sécurité Q2 2026" className={inputCls("titre")} />
                      {errors.titre && <p className="mt-1 text-xs text-[#DC2626]">{errors.titre.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Section : planification */}
                <div>
                  <p className="text-xs font-semibold text-navy uppercase tracking-wide mb-3">
                    Planification
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Date prévue</label>
                      <input type="date" {...register("datePrevue")} className={inputCls("datePrevue")} />
                      {errors.datePrevue && <p className="mt-1 text-xs text-[#DC2626]">{errors.datePrevue.message}</p>}
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Site</label>
                      <select {...register("siteId")} className={inputCls("siteId")}>
                        <option value="">Sélectionner un site</option>
                        {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                      </select>
                      {errors.siteId && <p className="mt-1 text-xs text-[#DC2626]">{errors.siteId.message}</p>}
                    </div>
                  </div>
                </div>

                <input type="hidden" {...register("templateId")} />
                <input type="hidden" {...register("auditeurId")} />
              </form>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9] shrink-0">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors">
                Annuler
              </button>
              <button type="submit" form="audit-form" disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
                {isSubmitting ? "Programmation..." : "Programmer l'audit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default AuditsPage;
