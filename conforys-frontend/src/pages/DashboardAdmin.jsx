import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import GraviteChart from "../components/dashboard/GraviteChart";
import AlertesCritiques from "../components/dashboard/AlertesCritiques";
import Badge from "../components/ui/Badge";
import { Activity, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";

// â”€â”€ Carte KPI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KpiCard({ label, value, sub, subColor = "text-[#64748B]", valueColor = "#0D2B4E" }) {
  return (
    <div
      className="bg-white rounded-lg p-5 flex flex-col justify-between"
      style={{ minHeight: "112px", border: "1px solid #E2E8F0" }}
    >
      <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">{label}</p>
      <p className="text-[36px] font-bold leading-none" style={{ color: valueColor }}>{value ?? "—"}</p>
      <p className={`text-[12px] ${subColor}`}>{sub || " "}</p>
    </div>
  );
}
// L'ADMIN gère uniquement les utilisateurs et peut consulter les incidents (lecture)
const ACCES = [
  { label: "Utilisateurs",  to: "/users",     desc: "Gérer les comptes", icon: UsersRound },
  { label: "Incidents",     to: "/incidents", desc: "Consulter (lecture)", icon: Activity },
];

function DashboardAdmin() {
  const navigate = useNavigate();
  const [stats,      setStats]      = useState(null);
  const [nbUsers,    setNbUsers]    = useState(null);
  const [users,      setUsers]      = useState([]);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);

  useEffect(() => {
    document.title = "Administration";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async (initial = false) => {
    if (initial) setChargement(true);
    else setActualisation(true);
    try {
      const [resDash, resUsers] = await Promise.all([
        api.get("/dashboard/incidents"),
        api.get("/users"),
      ]);
      setStats(resDash.data.data ?? resDash.data);
      const listeUsers = resUsers.data.data ?? resUsers.data;
      setUsers(Array.isArray(listeUsers) ? listeUsers : []);
      setNbUsers(Array.isArray(listeUsers) ? listeUsers.length : null);
    } catch (e) {
      console.error("Erreur chargement dashboard admin:", e);
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => charger(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const comptesParRole = users.reduce((compteurs, user) => {
    compteurs[user.role] = (compteurs[user.role] || 0) + 1;
    return compteurs;
  }, {});

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

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8]">Centre de contrôle</p>
              <h1 className="text-2xl font-bold text-navy mt-1">Administration</h1>
              <p className="text-sm text-[#64748B] mt-1">Suivez les comptes et les principaux signaux QHSE de votre entreprise.</p>
            </div>
            <button type="button" onClick={() => charger()} disabled={actualisation}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-white disabled:opacity-50 transition-colors">
              <RefreshCw size={14} className={actualisation ? "animate-spin" : ""} />
              {actualisation ? "Actualisation…" : "Actualiser"}
            </button>
          </div>

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
            <h2 className="text-lg font-semibold text-navy mb-4">Accès rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACCES.map((a) => (
                <button
                  key={a.to}
                  onClick={() => navigate(a.to)}
                  className="flex flex-col items-start gap-1 p-3 border border-[#E2E8F0] rounded-lg hover:border-navy hover:bg-navy/5 transition text-left"
                >
                  <a.icon size={18} className="text-navy mb-1" />
                  <span className="text-sm font-semibold text-navy">{a.label}</span>
                  <span className="text-xs text-[#64748B]">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white border border-[#E2E8F0] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={18} className="text-navy" />
                <div>
                  <h2 className="text-[15px] font-semibold text-[#1E293B]">Répartition des comptes</h2>
                  <p className="text-xs text-[#94A3B8]">Vue rapide des utilisateurs enregistrés</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["ADMIN", "Administrateurs", "text-navy"],
                  ["RESPONSABLE_QHSE", "Responsables QHSE", "text-[#2E7D32]"],
                  ["EMPLOYE", "Employés", "text-[#64748B]"],
                ].map(([role, label, couleur]) => (
                  <div key={role} className="p-3 rounded-md bg-[#F8FAFC] border border-[#F1F5F9]">
                    <p className={`text-2xl font-bold ${couleur}`}>{comptesParRole[role] || 0}</p>
                    <p className="text-xs text-[#64748B] mt-1 leading-snug">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#0D2B4E] rounded-lg p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">État de la plateforme</p>
              <p className="text-2xl font-bold mt-3">Opérationnelle</p>
              <p className="text-xs text-white/65 mt-2">Les données affichées sont synchronisées avec l’espace QHSE.</p>
            </div>
          </div>

          {/* Graphiques + Alertes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <h2 className="text-lg font-semibold text-navy mb-4">Incidents par gravité</h2>
              <GraviteChart data={stats?.parGravite ?? []} />
            </div>
            <div className="md:col-span-2">
              <AlertesCritiques alertes={stats?.alertes ?? []} />
            </div>
          </div>

          {/* Derniers incidents */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-lg font-semibold text-navy">Incidents récents</h2>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  {["Référence", "Type", "Site", "Déclaré par", "Gravité", "Statut"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">
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
