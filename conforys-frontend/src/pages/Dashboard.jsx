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

// â”€â”€ Composant carte KPI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KpiCard({ label, value, sub, subColor, valueColor = "#0D2B4E" }) {
  return (
    <div
      className="bg-white rounded-lg p-5 flex flex-col justify-between"
      style={{ minHeight: "112px", border: "1px solid #E2E8F0" }}
    >
      <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{label}</p>
      <p className="text-[36px] font-bold leading-none" style={{ color: valueColor }}>{value}</p>
      <p className={`text-[12px] ${subColor || "text-[#94A3B8]"}`}>{sub || " "}</p>
    </div>
  );
}

// â”€â”€ Page principale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

          {/* â”€â”€ EN-TÃŠTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy">Vue d'ensemble QHSE</h2>
              <p className="text-xs text-[#94A3B8] capitalize mt-0.5">{dateAujourdhui}</p>
            </div>
            {alertes.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DC2626]/30 bg-red-50">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />
                <span className="text-xs font-semibold text-[#DC2626]">
                  {alertes.filter((a) => a.niveau === "CRITIQUE").length} critique{alertes.filter((a) => a.niveau === "CRITIQUE").length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {/* â”€â”€ LIGNE 1 : Score + 4 KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">

            {/* Score global */}
            <div
              className="col-span-2 sm:col-span-1 lg:col-span-2 bg-white rounded-lg p-5"
              style={{
                border: "1px solid #E2E8F0",
                borderLeft: `4px solid ${
                  (stats?.scoreGlobal ?? 0) >= 80 ? "#2E7D32" :
                  (stats?.scoreGlobal ?? 0) >= 50 ? "#EA580C" : "#DC2626"
                }`
              }}
            >
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Score de sécurité</p>
              <ScoreGauge score={stats?.scoreGlobal ?? 0} />
              <div className="mt-2 grid grid-cols-3 gap-1 border-t border-[#E2E8F0] pt-2">
                <div>
                  <p className="text-[11px] text-[#94A3B8]">Audits</p>
                  <p className="text-xs font-semibold text-navy">{stats?.tauxConformite ?? 0}%</p>
                </div>
                <div className="border-x border-[#E2E8F0] px-2">
                  <p className="text-[11px] text-[#94A3B8]">EPI</p>
                  <p className="text-xs font-semibold text-navy">{stats?.conformiteEpi ?? 0}%</p>
                </div>
                <div className="pl-2">
                  <p className="text-[11px] text-[#94A3B8]">Incidents</p>
                  <p className="text-xs font-semibold text-navy">{stats?.total ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Incidents ce mois */}
            <KpiCard
              label="Ce mois"
              value={stats?.incidentsMoisCourant ?? 0}
              sub={tendanceIncidents?.texte ?? "Incidents déclarés"}
              subColor={tendanceIncidents?.couleur}
              valueColor={
                evo === null || evo === undefined ? "#0D2B4E" :
                evo > 0 ? "#DC2626" : evo < 0 ? "#2E7D32" : "#0D2B4E"
              }
            />

            {/* Audits ce mois */}
            <KpiCard
              label="Audits réalisés"
              value={stats?.auditsMoisCourant ?? 0}
              sub={`${stats?.tauxConformite ?? 0}% de conformité`}
              valueColor="#0D2B4E"
            />

            {/* Conformité EPI */}
            <KpiCard
              label="Conformité EPI"
              value={`${stats?.conformiteEpi ?? 0}%`}
              sub={stats?.episEnAlerte > 0 ? `${stats.episEnAlerte} EPI sous le seuil` : "Stocks conformes"}
              subColor={stats?.episEnAlerte > 0 ? "text-[#EA580C] font-medium" : "text-[#2E7D32]"}
              valueColor={
                (stats?.conformiteEpi ?? 0) >= 80 ? "#2E7D32" :
                (stats?.conformiteEpi ?? 0) >= 50 ? "#EA580C" : "#DC2626"
              }
            />

            {/* Habilitations */}
            <KpiCard
              label="Habilitations"
              value={stats?.habilitationsExpirantes ?? 0}
              sub="Expirent dans 30 j."
              subColor={stats?.habilitationsExpirantes > 0 ? "text-[#EA580C] font-medium" : "text-[#94A3B8]"}
              valueColor={stats?.habilitationsExpirantes > 0 ? "#EA580C" : "#0D2B4E"}
            />
          </div>

          {/* â”€â”€ LIGNE 2 : Évolution 12 mois + Alertes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-navy">Évolution des incidents</p>
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

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-navy">Alertes en cours</p>
                {alertes.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-50 text-[#DC2626] border border-red-200">
                    {alertes.length}
                  </span>
                )}
              </div>
              <AlertesCritiques alertes={alertes} />
            </div>
          </div>

          {/* â”€â”€ LIGNE 3 : Incidents récents + Donut + Type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">

            {/* Tableau incidents récents */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-navy">5 derniers incidents</p>
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
                      <tr className="border-b border-[#E2E8F0]">
                        <th className="text-left pb-2 font-semibold text-[#64748B] uppercase tracking-wider">Référence</th>
                        <th className="text-left pb-2 font-semibold text-[#64748B] uppercase tracking-wider hidden sm:table-cell">Déclarant</th>
                        <th className="text-left pb-2 font-semibold text-[#64748B] uppercase tracking-wider">Gravité</th>
                        <th className="text-left pb-2 font-semibold text-[#64748B] uppercase tracking-wider">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {incidentsAffiches.map((inc) => (
                        <tr key={inc.id} className="hover:bg-[#F8FAFC] transition-colors cursor-pointer" onClick={() => navigate("/incidents")}>
                          <td className="py-3 pr-3">
                            <p className="font-semibold text-navy">{inc.numeroReference}</p>
                            <p className="text-[#94A3B8] mt-0.5">{TYPE_LABEL[inc.type] || inc.type}</p>
                          </td>
                          <td className="py-3 pr-3 text-[#64748B] hidden sm:table-cell">
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
                  <p className="text-sm font-medium text-[#64748B]">
                    {filtreGravite ? `Aucun incident ${filtreGravite.toLowerCase()}` : "Aucun incident déclaré"}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {filtreGravite ? "Essayez un autre filtre" : "Les incidents apparaîtront ici"}
                  </p>
                </div>
              )}
            </div>

            {/* Donut gravité — cliquable */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-navy">Par gravité</p>
                <span className="text-xs text-[#94A3B8]">{stats?.total ?? 0} incidents</span>
              </div>
              <GraviteChart
                data={graviteData}
                selected={filtreGravite}
                onSelect={setFiltreGravite}
              />
            </div>

            {/* Par type */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <p className="text-sm font-bold text-navy mb-4">Par type</p>
              <TypeChart data={typeData} />
            </div>
          </div>

          {/* â”€â”€ LIGNE 4 : Accès rapides â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
            <p className="text-sm font-bold text-navy mb-3">Accès rapides</p>
            <AccesRapides />
          </div>

        </div>
      )}
    </AppLayout>
  );
}

export default Dashboard;
