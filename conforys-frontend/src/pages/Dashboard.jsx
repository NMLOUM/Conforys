import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import ScoreGauge from "../components/dashboard/ScoreGauge";
import GraviteChart from "../components/dashboard/GraviteChart";
import TypeChart from "../components/dashboard/TypeChart";
import EvolutionChart from "../components/dashboard/EvolutionChart";
import AlertesCritiques from "../components/dashboard/AlertesCritiques";
import AccesRapides from "../components/dashboard/AccesRapides";
import Badge from "../components/ui/Badge";

const TYPE_LABEL = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presque-acc.",
  SITUATION_DANGEREUSE:     "Sit. dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Environnemental",
};

// ── Icônes SVG ─────────────────────────────────────────────────────────────────
const IconAlert = ({ color = "#6b7280" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconClipboard = ({ color = "#6b7280" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <path d="M9 12h6M9 16h4"/>
  </svg>
);
const IconBox = ({ color = "#6b7280" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
  </svg>
);
const IconClock = ({ color = "#6b7280" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconArrowUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);
const IconArrowDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
  </svg>
);

// ── Composant carte KPI ────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor, icon, bgIcon }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider leading-tight">{label}</p>
        {icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bgIcon || "bg-gray-50"}`}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-navy tracking-tight">{value}</p>
      {sub && <p className={`text-xs font-medium -mt-1 ${subColor || "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats]           = useState(null);
  const [chargement, setChargement] = useState(true);
  const [periode, setPeriode]       = useState(12);
  const [filtreGravite, setFiltreGravite] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { document.title = "CONFORYS — Tableau de bord"; return () => { document.title = "CONFORYS"; }; }, []);

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

  // Texte de tendance des incidents ce mois
  const evo = stats?.evolutionIncidents;
  const tendanceIncidents =
    evo === null || evo === undefined ? null
    : evo > 0 ? { texte: `+${evo}% vs mois dernier`, couleur: "text-red-500", icon: <IconArrowUp /> }
    : evo < 0 ? { texte: `${evo}% vs mois dernier`, couleur: "text-green-600", icon: <IconArrowDown /> }
    : { texte: "Stable vs mois dernier", couleur: "text-gray-400", icon: null };

  const dateAujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <AppLayout titre="Tableau de bord">
      {chargement ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Chargement des données...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── EN-TÊTE ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy">Vue d'ensemble QHSE</h2>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{dateAujourdhui}</p>
            </div>
            {alertes.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-red-700">
                  {alertes.filter((a) => a.niveau === "CRITIQUE").length} alerte{alertes.filter((a) => a.niveau === "CRITIQUE").length > 1 ? "s" : ""} critique{alertes.filter((a) => a.niveau === "CRITIQUE").length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {/* ── LIGNE 1 : Score + 4 KPIs ─────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">

            {/* Score global */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Score de sécurité</p>
              <ScoreGauge score={stats?.scoreGlobal ?? 0} />
              <div className="mt-2 grid grid-cols-3 gap-1 border-t border-gray-100 pt-2">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Audits</p>
                  <p className="text-xs font-bold text-navy">{stats?.tauxConformite ?? 0}%</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <p className="text-xs text-gray-400">EPI</p>
                  <p className="text-xs font-bold text-navy">{stats?.conformiteEpi ?? 0}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Incidents</p>
                  <p className="text-xs font-bold text-navy">{stats?.total ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Incidents ce mois */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ce mois</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50">
                  <IconAlert color="#EF4444" />
                </div>
              </div>
              <p className="text-3xl font-bold text-navy">{stats?.incidentsMoisCourant ?? 0}</p>
              {tendanceIncidents ? (
                <div className={`flex items-center gap-1 text-xs font-medium -mt-1 ${tendanceIncidents.couleur}`}>
                  {tendanceIncidents.icon}
                  {tendanceIncidents.texte}
                </div>
              ) : (
                <p className="text-xs text-gray-400 -mt-1">Incidents déclarés</p>
              )}
            </div>

            {/* Audits ce mois */}
            <KpiCard
              label="Audits réalisés"
              value={stats?.auditsMoisCourant ?? 0}
              sub={`${stats?.tauxConformite ?? 0}% de conformité globale`}
              icon={<IconClipboard color="#1D4ED8" />}
              bgIcon="bg-blue-50"
            />

            {/* Conformité EPI */}
            <KpiCard
              label="Conformité EPI"
              value={`${stats?.conformiteEpi ?? 0}%`}
              sub={stats?.episEnAlerte > 0 ? `${stats.episEnAlerte} EPI sous le seuil` : "Stocks conformes"}
              subColor={stats?.episEnAlerte > 0 ? "text-orange-500 font-semibold" : "text-green-600"}
              icon={<IconBox color="#EA580C" />}
              bgIcon="bg-orange-50"
            />

            {/* Habilitations */}
            <KpiCard
              label="Habilitations"
              value={stats?.habilitationsExpirantes ?? 0}
              sub="Expirent dans 30 j."
              subColor={stats?.habilitationsExpirantes > 0 ? "text-orange-500 font-semibold" : "text-gray-400"}
              icon={<IconClock color={stats?.habilitationsExpirantes > 0 ? "#EA580C" : "#6B7280"} />}
              bgIcon={stats?.habilitationsExpirantes > 0 ? "bg-orange-50" : "bg-gray-50"}
            />
          </div>

          {/* ── LIGNE 2 : Évolution 12 mois + Alertes ────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

            <div className="bg-white border border-gray-200 rounded-xl p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-navy">Évolution des incidents</p>
                  <p className="text-xs text-gray-400 mt-0.5">Ventilé par type d'incident</p>
                </div>
                <div className="flex items-center gap-1">
                  {[3, 6, 12].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriode(p)}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium transition ${
                        periode === p
                          ? "bg-navy text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {p} mois
                    </button>
                  ))}
                </div>
              </div>
              <EvolutionChart data={evolutionData} />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-navy">Alertes en cours</p>
                {alertes.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                    {alertes.length}
                  </span>
                )}
              </div>
              <AlertesCritiques alertes={alertes} />
            </div>
          </div>

          {/* ── LIGNE 3 : Incidents récents + Donut + Type ───────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">

            {/* Tableau incidents récents */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-navy">5 derniers incidents</p>
                  {filtreGravite && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-navy/10 text-navy font-medium">
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
                      <tr className="border-b border-gray-100">
                        <th className="text-left pb-2 font-semibold text-gray-400 uppercase tracking-wider">Référence</th>
                        <th className="text-left pb-2 font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Déclarant</th>
                        <th className="text-left pb-2 font-semibold text-gray-400 uppercase tracking-wider">Gravité</th>
                        <th className="text-left pb-2 font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {incidentsAffiches.map((inc) => (
                        <tr key={inc.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate("/incidents")}>
                          <td className="py-3 pr-3">
                            <p className="font-semibold text-navy">{inc.numeroReference}</p>
                            <p className="text-gray-400 mt-0.5">{TYPE_LABEL[inc.type] || inc.type}</p>
                          </td>
                          <td className="py-3 pr-3 text-gray-500 hidden sm:table-cell">
                            {inc.declarePar ? `${inc.declarePar.prenom} ${inc.declarePar.nom}` : "—"}
                          </td>
                          <td className="py-3 pr-3">
                            <Badge variant={inc.gravite} />
                          </td>
                          <td className="py-3">
                            <Badge variant={inc.statut} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    {filtreGravite ? `Aucun incident ${filtreGravite.toLowerCase()}` : "Aucun incident déclaré"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {filtreGravite ? "Essayez un autre filtre" : "Les incidents apparaîtront ici"}
                  </p>
                </div>
              )}
            </div>

            {/* Donut gravité — cliquable */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-navy">Par gravité</p>
                <span className="text-xs text-gray-400">{stats?.total ?? 0} incidents</span>
              </div>
              <GraviteChart
                data={graviteData}
                selected={filtreGravite}
                onSelect={setFiltreGravite}
              />
            </div>

            {/* Par type */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-bold text-navy mb-4">Par type</p>
              <TypeChart data={typeData} />
            </div>
          </div>

          {/* ── LIGNE 4 : Accès rapides ──────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm font-bold text-navy mb-3">Accès rapides</p>
            <AccesRapides />
          </div>

        </div>
      )}
    </AppLayout>
  );
}

export default Dashboard;
