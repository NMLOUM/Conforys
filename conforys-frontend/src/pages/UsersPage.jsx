import { useState, useEffect } from "react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";

function UsersPage() {
  const [users,      setUsers]      = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    document.title = "CONFORYS — Utilisateurs";
    return () => { document.title = "CONFORYS"; };
  }, []);

  useEffect(() => {
    api.get("/users")
      .then((res) => setUsers(res.data.data || []))
      .catch((e) => console.error("Erreur chargement utilisateurs:", e))
      .finally(() => setChargement(false));
  }, []);

  return (
    <AppLayout titre="Utilisateurs">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[#64748B]">{users.length} utilisateur(s)</p>
      </div>

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Nom", "Email", "Rôle", "Entreprise", "Statut"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#94A3B8]">
                    Aucun utilisateur
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 text-[11px] font-semibold text-white rounded-full bg-navy shrink-0 select-none">
                          {u.prenom?.[0]}{u.nom?.[0]}
                        </div>
                        <span className="font-medium text-[#1E293B]">
                          {u.prenom} {u.nom}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{u.email}</td>
                    <td className="px-4 py-3"><Badge variant={u.role} /></td>
                    <td className="px-4 py-3 text-[#64748B]">{u.entreprise?.nom || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.actif ? "ACTIF_USER" : "INACTIF_USER"} label={u.actif ? "Actif" : "Inactif"} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}

export default UsersPage;
