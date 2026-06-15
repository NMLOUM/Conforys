import { useState, useEffect } from "react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [chargement, setChargement] = useState(true);

  const charger = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data.data || []);
    } catch (e) {
      console.error("Erreur chargement utilisateurs:", e);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  return (
    <AppLayout titre="Utilisateurs">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{users.length} utilisateur(s)</p>
      </div>

      {chargement ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Nom", "Email", "Rôle", "Entreprise", "Statut"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Aucun utilisateur
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 text-xs font-semibold text-white rounded-full bg-navy shrink-0">
                          {u.prenom?.[0]}{u.nom?.[0]}
                        </div>
                        <span className="font-medium text-gray-800">
                          {u.prenom} {u.nom}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.entreprise?.nom || "-"}</td>
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
