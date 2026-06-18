import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import GraviteChart from "../components/dashboard/GraviteChart";
import AlertesCritiques from "../components/dashboard/AlertesCritiques";
import Badge from "../components/ui/Badge";

function KpiCard({ label, value, sub, subColor = "text-gray-500", icon, bgIcon }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-start gap-4">
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bgIcon}`}>
          <span className="text-lg">{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-navy mt-0.5">{value ?? "—"}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
      </div>
    </div>
  );
}

const ACCES = [
  { label: "Utilisateurs",  to: "/users",      desc: "Gérer les comptes" },
  { label: "Incidents",     to: "/incidents",   desc: "Tous les incidents" },
  { label: "Audits",        to: "/audits",      desc: "Planification & suivi" },
  { label: "EPI",           to: "/epis",        desc: "Stocks & alertes" },
  { label: "Formations",    to: "/formations",  desc: "Sessions planifiées" },
];

function DashboardAdmin() {
  const navigate = useNavigate();
  const [stats, setStats]         = useState(null);
  const [nbUsers, setNbUsers]     = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    document.title = "CONFORYS — Administration";
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

  const tauxCouleur =
    stats?.tauxConformite >= 80 ? "text-vert" :
    stats?.tauxConformite >= 50 ? "text-orange-500" : "text-red-500";

  return (
    <AppLayout titre="Administration">
      {chargement ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Utilisateurs"
              value={nbUsers ?? "—"}
              sub="Comptes actifs"
              icon="👥"
              bgIcon="bg-blue-50"
            />
            <KpiCard
              label="Total incidents"
              value={stats?.total ?? 0}
              sub={`${stats?.critiques ?? 0} critique(s)`}
              subColor={stats?.critiques > 0 ? "text-red-500" : "text-gray-400"}
              icon="⚠"
              bgIcon="bg-orange-50"
            />
            <KpiCard
              label="Taux de conformité"
              value={stats?.tauxConformite != null ? `${stats.tauxConformite}%` : "—"}
              sub="EPI conformes"
              subColor={tauxCouleur}
              icon="✓"
              bgIcon="bg-green-50"
            />
            <KpiCard
              label="EPI en alerte"
              value={stats?.episEnAlerte ?? 0}
              sub="Stock critique"
              subColor={stats?.episEnAlerte > 0 ? "text-red-500" : "text-gray-400"}
              icon="🛡"
              bgIcon="bg-red-50"
            />
          </div>

          {/* Accès rapides */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Accès rapides</h2>
            <div className="grid grid-cols-5 gap-3">
              {ACCES.map((a) => (
                <button
                  key={a.to}
                  onClick={() => navigate(a.to)}
                  className="flex flex-col items-start gap-1 p-3 border border-gray-200 rounded-lg hover:border-navy hover:bg-navy/5 transition text-left"
                >
                  <span className="text-sm font-medium text-navy">{a.label}</span>
                  <span className="text-xs text-gray-500">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Graphiques + Alertes */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Incidents par gravité</h2>
              <GraviteChart data={stats?.parGravite ?? []} />
            </div>
            <div className="col-span-2">
              <AlertesCritiques alertes={stats?.alertes ?? []} />
            </div>
          </div>

          {/* Derniers incidents */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Incidents récents</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Référence", "Type", "Site", "Déclaré par", "Gravité", "Statut"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.recents ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Aucun incident enregistré
                    </td>
                  </tr>
                ) : (
                  (stats?.recents ?? []).map((inc) => (
                    <tr key={inc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-navy">{inc.numeroReference}</td>
                      <td className="px-4 py-3 text-gray-600">{inc.type}</td>
                      <td className="px-4 py-3 text-gray-600">{inc.site?.nom ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
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
      )}
    </AppLayout>
  );
}

export default DashboardAdmin;
