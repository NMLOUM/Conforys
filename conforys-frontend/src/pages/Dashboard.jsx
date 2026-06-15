import { useState, useEffect } from "react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";

function Dashboard() {
  // État pour stocker les stats récupérées de l'API
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);

  // useEffect : s'exécute une fois au chargement de la page
  useEffect(() => {
    // Fonction qui récupère les stats depuis l'API
    const chargerStats = async () => {
      try {
        const response = await api.get("/dashboard/incidents");
        setStats(response.data.data);
      } catch (error) {
        console.error("Erreur chargement stats:", error);
      } finally {
        setChargement(false);
      }
    };
    chargerStats();
  }, []); // [] = exécuté une seule fois

  return (
    <AppLayout titre="Tableau de bord">
      {chargement ? (
        <p className="text-gray-500">Chargement des statistiques...</p>
      ) : (
        <div>
          {/* Cartes KPI */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total incidents */}
            <div className="p-5 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Total incidents
              </p>
              <p className="mt-2 text-3xl font-bold text-navy">
                {stats?.total ?? 0}
              </p>
            </div>

            {/* Par gravité */}
            <div className="p-5 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Catégories de gravité
              </p>
              <p className="mt-2 text-3xl font-bold text-navy">
                {stats?.parGravite?.length ?? 0}
              </p>
            </div>

            {/* Par statut */}
            <div className="p-5 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Statuts actifs
              </p>
              <p className="mt-2 text-3xl font-bold text-navy">
                {stats?.parStatut?.length ?? 0}
              </p>
            </div>

            {/* Types */}
            <div className="p-5 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Types d'incidents
              </p>
              <p className="mt-2 text-3xl font-bold text-navy">
                {stats?.parType?.length ?? 0}
              </p>
            </div>
          </div>

          {/* Incidents récents */}
          <div className="mt-6 bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-navy">Incidents récents</h2>
            </div>
            <div className="p-5">
              {stats?.recents?.length > 0 ? (
                <ul className="space-y-3">
                  {stats.recents.map((inc) => (
                    <li
                      key={inc.id}
                      className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {inc.numeroReference}
                        </p>
                        <p className="text-xs text-gray-500">
                          {inc.site?.nom}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                        {inc.gravite}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Aucun incident pour le moment.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Dashboard;