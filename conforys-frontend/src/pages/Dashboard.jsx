import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Download } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import GraviteChart from "../components/dashboard/GraviteChart";
import TypeChart from "../components/dashboard/TypeChart";
import EvolutionChart from "../components/dashboard/EvolutionChart";
import AlertesATraiter from "../components/dashboard/AlertesATraiter";
import Badge from "../components/ui/Badge";
import toast from "react-hot-toast";

const TYPE_LABEL = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presque-acc.",
  SITUATION_DANGEREUSE:     "Sit. dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Environnemental",
};

// ── Carte KPI (libellé + valeur + sous-info ou barre de progression) ──
function KpiCard({ iconColor = "#0D2B4E", label, value, valueColor, sub, subColor, progress }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#E2E8F0] shadow-sm flex flex-col gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">{label}</span>
      <div>
        <p className="text-xl font-bold leading-none" style={{ color: valueColor || "#0D2B4E" }}>{value}</p>
        {progress != null ? (
          <div className="mt-2">
            <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: iconColor }} />
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1.5">{sub}</p>
          </div>
        ) : (
          <p className={`text-[11px] mt-1.5 ${subColor || "text-[#94A3B8]"}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── Export du bilan de sécurité PDF sur une période (bouton + panneau) ────
function ExportBilan() {
  const premierJourMois = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  };
  const aujourdHui = () => new Date().toISOString().split("T")[0];

  const [ouvert, setOuvert] = useState(false);
  const [sites, setSites] = useState([]);
  const [dateDebut, setDateDebut] = useState(premierJourMois());
  const [dateFin, setDateFin] = useState(aujourdHui());
  const [siteId, setSiteId] = useState("");
  const [genererEnCours, setGenererEnCours] = useState(false);
  const conteneurRef = useRef(null);

  useEffect(() => {
    api.get("/sites").then((r) => setSites(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const fermerSiExterieur = (e) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) setOuvert(false);
    };
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, []);

  const genererBilan = async () => {
    if (!dateDebut || !dateFin) {
      toast.error("Sélectionnez une date de début et une date de fin.");
      return;
    }
    if (new Date(dateDebut) > new Date(dateFin)) {
      toast.error("La date de fin doit être postérieure ou égale à la date de début.");
      return;
    }
    setGenererEnCours(true);
    try {
      const res = await api.get("/rapports/synthese-pdf", {
        params: { dateDebut, dateFin, ...(siteId && { siteId }) },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `bilan-securite-${dateDebut}-au-${dateFin}.pdf`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
      setOuvert(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la génération du bilan.");
    } finally {
      setGenererEnCours(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] " +
    "focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition";

  return (
    <div className="relative" ref={conteneurRef}>
      <button
        onClick={() => setOuvert((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy border border-[#E2E8F0] rounded-md bg-white hover:bg-[#F8FAFC] transition-colors"
      >
        <Download size={13} />
        Exporter un bilan
      </button>
      {ouvert && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E2E8F0] rounded-lg shadow-lg p-4 z-30">
          <p className="text-[15px] font-semibold text-[#1E293B] mb-1">Exporter un bilan</p>
          <p className="text-xs text-[#94A3B8] mb-3">
            Bilan de sécurité PDF sur la période choisie, destiné à la direction.
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block mb-1 text-xs font-medium text-[#64748B] uppercase tracking-wide">Du</label>
                <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className="block mb-1 text-xs font-medium text-[#64748B] uppercase tracking-wide">Au</label>
                <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-[#64748B] uppercase tracking-wide">Site</label>
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={inputCls}>
                <option value="">Tous les sites</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <button
              onClick={genererBilan}
              disabled={genererEnCours}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors"
            >
              <Download size={15} />
              {genererEnCours ? "Génération…" : "Générer le bilan PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats]           = useState(null);
  const [chargement, setChargement] = useState(true);
  const [periode, setPeriode]       = useState(12);
  const [filtreGravite, setFiltreGravite] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { document.title = "Tableau de bord"; return () => { document.title = "CONFORYS"; }; }, []);

  useEffect(() => {
    api.get("/dashboard/incidents")
      .then((res) => setStats(res.data.data))
      .catch((e) => console.error("Erreur dashboard:", e))
      .finally(() => setChargement(false));
  }, []);

  const graviteData    = (stats?.parGravite || []).map((g) => ({ name: g.gravite, value: g._count.gravite }));
  const typeData       = (stats?.parType    || []).map((t) => ({ name: t.type,    value: t._count.type }));
  const evolutionData  = (stats?.evolutionMensuelle || []).slice(-periode);
  const alertes        = stats?.alertes || [];
  const incidentsAffiches = filtreGravite
    ? (stats?.recents || []).filter((i) => i.gravite === filtreGravite)
    : (stats?.recents || []);

  const evo = stats?.evolutionIncidents;
  const tendanceIncidents =
    evo === null || evo === undefined ? null
    : evo > 0 ? { texte: `+${evo}% vs mois dernier`, couleur: "text-[#DC2626]" }
    : evo < 0 ? { texte: `${evo}% vs mois dernier`,  couleur: "text-[#2E7D32]" }
    : { texte: "Stable vs mois dernier", couleur: "text-[#94A3B8]" };

  const dateAujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <AppLayout titre="Tableau de bord">
      {chargement ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#94A3B8]">Chargement des données...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── EN-TÊTE ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy">Vue d'ensemble</h1>
              <p className="text-xs text-[#94A3B8] capitalize mt-0.5">{dateAujourdhui}</p>
            </div>
            <div className="flex items-center gap-3">
              {alertes.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DC2626]/30 bg-red-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />
                  <span className="text-xs font-semibold text-[#DC2626]">
                    {alertes.filter((a) => a.niveau === "CRITIQUE").length} critique{alertes.filter((a) => a.niveau === "CRITIQUE").length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              <ExportBilan />
              <button
                onClick={() => navigate("/journal-activite")}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors"
              >
                Journal d'activité
              </button>
            </div>
          </div>

          {/* ── LIGNE KPI ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <KpiCard
              iconColor={evo > 0 ? "#DC2626" : evo < 0 ? "#2E7D32" : "#64748B"}
              label="Ce mois"
              value={stats?.incidentsMoisCourant ?? 0}
              valueColor="#0D2B4E"
              sub={tendanceIncidents?.texte ?? "Incidents déclarés"}
              subColor={tendanceIncidents?.couleur}
            />
            <KpiCard
              iconColor="#0D2B4E"
              label="Audits réalisés"
              value={stats?.auditsMoisCourant ?? 0}
              progress={stats?.tauxConformite ?? 0}
              sub={`${stats?.tauxConformite ?? 0}% de conformité`}
            />
            <KpiCard
              iconColor={
                (stats?.conformiteEpi ?? 0) >= 80 ? "#2E7D32" :
                (stats?.conformiteEpi ?? 0) >= 50 ? "#EA580C" : "#DC2626"
              }
              label="Conformité EPI"
              value={`${stats?.conformiteEpi ?? 0}%`}
              valueColor={
                (stats?.conformiteEpi ?? 0) >= 80 ? "#2E7D32" :
                (stats?.conformiteEpi ?? 0) >= 50 ? "#EA580C" : "#DC2626"
              }
              progress={stats?.conformiteEpi ?? 0}
              sub={stats?.episEnAlerte > 0 ? `${stats.episEnAlerte} EPI sous le seuil` : "Stocks conformes"}
            />
            <KpiCard
              iconColor={
                stats?.joursSansAccident == null ? "#2E7D32" :
                stats.joursSansAccident === 0    ? "#DC2626" :
                stats.joursSansAccident < 7      ? "#EA580C" : "#2E7D32"
              }
              label="Jours sans accident"
              value={stats?.joursSansAccident ?? "—"}
              valueColor={
                stats?.joursSansAccident == null ? "#2E7D32" :
                stats.joursSansAccident === 0    ? "#DC2626" :
                stats.joursSansAccident < 7      ? "#EA580C" : "#2E7D32"
              }
              sub={
                stats?.dateDernierAccident
                  ? `Dernier : ${new Date(stats.dateDernierAccident).toLocaleDateString("fr-FR")}`
                  : "Aucun accident déclaré"
              }
              subColor={stats?.joursSansAccident != null && stats.joursSansAccident < 7 ? "text-[#EA580C] font-medium" : "text-[#94A3B8]"}
            />
            <KpiCard
              iconColor={stats?.risquesCritiques > 0 ? "#DC2626" : "#0D2B4E"}
              label="Risques DUERP"
              value={stats?.risquesCritiques ?? 0}
              valueColor={stats?.risquesCritiques > 0 ? "#DC2626" : "#0D2B4E"}
              sub={`${stats?.risquesTotal ?? 0} recensés · ${stats?.risquesTraites ?? 0} traités`}
              subColor={stats?.risquesCritiques > 0 ? "text-[#DC2626] font-medium" : "text-[#94A3B8]"}
            />
          </div>

          {/* ── LIGNE 2 : Évolution 12 mois + Alertes ──────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[15px] font-semibold text-[#1E293B]">Évolution des incidents</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Ventilé par type d'incident</p>
                </div>
                <div className="flex items-center gap-1">
                  {[3, 6, 12].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriode(p)}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium transition ${
                        periode === p
                          ? "bg-navy text-white"
                          : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                      }`}
                    >
                      {p} mois
                    </button>
                  ))}
                </div>
              </div>
              <EvolutionChart data={evolutionData} />
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
              <AlertesATraiter />
            </div>
          </div>

          {/* ── LIGNE 3 : Par gravité + Par type ────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

            {/* Donut gravité — cliquable */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[15px] font-semibold text-[#1E293B]">Par gravité</p>
                <span className="text-xs text-[#94A3B8]">{stats?.total ?? 0} incidents</span>
              </div>
              <GraviteChart
                data={graviteData}
                selected={filtreGravite}
                onSelect={setFiltreGravite}
              />
            </div>

            {/* Par type */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-5">
              <p className="text-[15px] font-semibold text-[#1E293B] mb-4">Par type</p>
              <TypeChart data={typeData} />
            </div>
          </div>

          {/* ── LIGNE 4 : 5 derniers incidents ──────────────────────────── */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-4">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold text-[#1E293B]">5 derniers incidents</p>
                {filtreGravite && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-navy/10 text-navy font-medium">
                    {filtreGravite}
                    <button onClick={() => setFiltreGravite(null)} className="ml-1 hover:text-red-500">✕</button>
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate("/incidents")}
                className="text-xs text-navy/70 hover:text-navy font-medium hover:underline"
              >
                Voir tout →
              </button>
            </div>
            {incidentsAffiches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
                      <th className="text-left px-5 py-2 font-medium text-[#64748B] uppercase tracking-wide">Référence</th>
                      <th className="text-left px-3 py-2 font-medium text-[#64748B] uppercase tracking-wide hidden sm:table-cell">Déclarant</th>
                      <th className="text-left px-3 py-2 font-medium text-[#64748B] uppercase tracking-wide">Gravité</th>
                      <th className="text-left px-3 py-2 font-medium text-[#64748B] uppercase tracking-wide">Statut</th>
                      <th className="text-right px-5 py-2 font-medium text-[#64748B] uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {incidentsAffiches.map((inc) => (
                      <tr key={inc.id} className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group" onClick={() => navigate(`/incidents/${inc.id}`)}>
                        <td className="py-3 pl-5 pr-3">
                          <p className="font-semibold text-navy">{inc.numeroReference}</p>
                          <p className="text-[#94A3B8] mt-0.5">{TYPE_LABEL[inc.type] || inc.type}</p>
                        </td>
                        <td className="py-3 pr-3 text-[#64748B] hidden sm:table-cell">
                          {inc.declarePar ? `${inc.declarePar.prenom} ${inc.declarePar.nom}` : "—"}
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={inc.gravite} />
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={inc.statut} />
                        </td>
                        <td className="py-3 pr-5 text-right">
                          <span className="inline-flex text-[#94A3B8] group-hover:text-navy transition-colors">
                            <Eye size={15} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm font-medium text-[#64748B]">
                  {filtreGravite ? `Aucun incident ${filtreGravite.toLowerCase()}` : "Aucun incident déclaré"}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  {filtreGravite ? "Essayez un autre filtre" : "Les incidents apparaîtront ici"}
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </AppLayout>
  );
}

export default Dashboard;
