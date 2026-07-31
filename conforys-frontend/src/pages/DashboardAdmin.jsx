import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import GraviteChart from "../components/dashboard/GraviteChart";
import AlertesCritiques from "../components/dashboard/AlertesCritiques";
import Badge from "../components/ui/Badge";

// â”€â”€ Carte KPI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KpiCard({ label, value, sub, subColor = "text-[#64748B]", valueColor = "#0D2B4E" }) {
  return (
    <div
      className="bg-white rounded-lg p-5 flex flex-col justify-between"
      style={{ minHeight: "112px", border: "1px solid #E2E8F0" }}
    >
      <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{label}</p>
      <p className="text-[36px] font-bold leading-none" style={{ color: valueColor }}>{value ?? "—"}</p>
      <p className={`text-[12px] ${subColor}`}>{sub || " "}</p>
    </div>
  );
}
// L'ADMIN gère uniquement les utilisateurs et peut consulter les incidents (lecture)
const ACCES = [
  { label: "Utilisateurs",  to: "/users",     desc: "Gérer les comptes" },
  { label: "Incidents",     to: "/incidents", desc: "Consulter (lecture)" },
];

function DashboardAdmin() {
  const navigate = useNavigate();
  const [stats,      setStats]      = useState(null);
  const [nbUsers,    setNbUsers]    = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    document.title = "Administration";
    return () => { document.title = "CONFORYS"; };
  }, []);

  useEffect(() => {
    const charger = async () => {
      try {
        const [resDash, resUsers] = await Promise.all([
          api.get("/dashboard/incidents"),
          api.get("/users"),
        ]);
        setStats(resDash.data.data ?? resDash.data);
        const users = resUsers.data.data ?? resUsers.data;
        setNbUsers(Array.isArray(users) ? users.length : null);
      } catch (e) {
        console.error("Erreur chargement dashboard admin:", e);
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const taux = stats?.tauxConformite;
  const tauxAccent =
    taux >= 80 ? "#2E7D32" :
    taux >= 50 ? "#EA580C" : "#DC2626";

  return (
    <AppLayout titre="Administration">
      {chargement ? (
        <div className="flex items-center gap-2 text-sm text-[#64748B] py-8">
          <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          Chargement...
        </div>
      ) : (
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Utilisateurs"
              value={nbUsers ?? "—"}
              sub="Comptes enregistrés"
              valueColor="#0D2B4E"
            />
            <KpiCard
              label="Total incidents"
              value={stats?.total ?? 0}
              sub={`${stats?.critiques ?? 0} critique${stats?.critiques > 1 ? "s" : ""}`}
              subColor={stats?.critiques > 0 ? "text-[#DC2626] font-medium" : "text-[#64748B]"}
              valueColor={stats?.critiques > 0 ? "#DC2626" : stats?.total > 0 ? "#EA580C" : "#0D2B4E"}
            />
            <KpiCard
              label="Taux de conformité"
              value={taux != null ? `${taux}%` : "—"}
              sub="EPI conformes"
              subColor={taux >= 80 ? "text-[#2E7D32]" : taux >= 50 ? "text-[#EA580C]" : "text-[#DC2626]"}
              valueColor={tauxAccent}
            />
            <KpiCard
              label="EPI en alerte"
              value={stats?.episEnAlerte ?? 0}
              sub="Stock sous le seuil"
              subColor={stats?.episEnAlerte > 0 ? "text-[#DC2626] font-medium" : "text-[#64748B]"}
              valueColor={stats?.episEnAlerte > 0 ? "#DC2626" : "#2E7D32"}
            />
          </div>

          {/* Accès rapides */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
            <h2 className="text-base font-semibold text-[#1E293B] mb-4">Accès rapides</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ACCES.map((a) => (
                <button
                  key={a.to}
                  onClick={() => navigate(a.to)}
                  className="flex flex-col items-start gap-1 p-3 border border-[#E2E8F0] rounded-lg hover:border-navy hover:bg-navy/5 transition text-left"
                >
                  <span className="text-sm font-semibold text-navy">{a.label}</span>
                  <span className="text-xs text-[#64748B]">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Graphiques + Alertes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <h2 className="text-base font-semibold text-[#1E293B] mb-4">Incidents par gravité</h2>
              <GraviteChart data={stats?.parGravite ?? []} />
            </div>
            <div className="md:col-span-2">
              <AlertesCritiques alertes={stats?.alertes ?? []} />
            </div>
          </div>

          {/* Derniers incidents */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-base font-semibold text-[#1E293B]">Incidents récents</h2>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  {["Référence", "Type", "Site", "Déclaré par", "Gravité", "Statut"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {(stats?.recents ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#94A3B8]">
                      Aucun incident enregistré
                    </td>
                  </tr>
                ) : (
                  (stats?.recents ?? []).map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 font-semibold text-navy text-xs">{inc.numeroReference}</td>
                      <td className="px-4 py-3 text-[#475569]">{inc.type}</td>
                      <td className="px-4 py-3 text-[#475569]">{inc.site?.nom ?? "—"}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {inc.declarePar ? `${inc.declarePar.prenom} ${inc.declarePar.nom}` : "—"}
                      </td>
                      <td className="px-4 py-3"><Badge variant={inc.gravite} /></td>
                      <td className="px-4 py-3"><Badge variant={inc.statut} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

        </div>
      )}
    </AppLayout>
  );
}

export default DashboardAdmin;
