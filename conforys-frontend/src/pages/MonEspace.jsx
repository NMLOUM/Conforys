import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useAuthStore } from "../store/authStore";

function MonEspace() {
  const navigate    = useNavigate();
  const user        = useAuthStore((s) => s.user);

  const [incidents,   setIncidents]   = useState([]);
  const [formations,  setFormations]  = useState([]);
  const [habilitations, setHabilitations] = useState([]);
  const [chargement,  setChargement]  = useState(true);

  useEffect(() => {
    document.title = "CONFORYS — Mon espace";
    return () => { document.title = "CONFORYS"; };
  }, []);

  useEffect(() => {
    const charger = async () => {
      try {
        const [resInc, resFrm, resHab] = await Promise.all([
          api.get("/incidents"),
          api.get("/formations"),
          api.get("/habilitations").catch(() => ({ data: { data: [] } })),
        ]);

        const tousIncidents = resInc.data.data ?? resInc.data ?? [];
        // Filtrer uniquement les incidents déclarés par cet utilisateur
        setIncidents(
          tousIncidents.filter((inc) => inc.declarePar?.id === user?.id)
        );
        setFormations(resFrm.data.data ?? resFrm.data ?? []);

        const toutesHab = resHab.data.data ?? resHab.data ?? [];
        setHabilitations(
          toutesHab.filter((h) => h.titulaireId === user?.id)
        );
      } catch (e) {
        console.error("Erreur chargement mon espace:", e);
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, [user?.id]);

  const prenom = user?.prenom ?? user?.nom ?? "Utilisateur";
  const dateJour = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <AppLayout titre="Mon espace">
      {chargement ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="space-y-6">

          {/* En-tête personnel */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-navy">
                Bonjour, {prenom}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{dateJour}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p className="font-medium text-gray-700">{user?.email}</p>
              <p className="mt-0.5">
                <Badge variant="EMPLOYE" />
              </p>
            </div>
          </div>

          {/* Bouton CTA déclaration */}
          <div className="bg-navy rounded-lg p-6 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-base">
                Déclarer un incident
              </h3>
              <p className="text-gray-300 text-sm mt-1">
                Signalez immédiatement tout accident, situation dangereuse ou presqu'accident.
              </p>
            </div>
            <button
              onClick={() => navigate("/incidents")}
              className="px-5 py-2.5 bg-white text-navy font-semibold text-sm rounded-lg hover:bg-gray-100 transition shrink-0 ml-6"
            >
              Déclarer maintenant
            </button>
          </div>

          {/* Compteurs personnels */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mes déclarations</p>
              <p className="text-3xl font-bold text-navy mt-1">{incidents.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">incidents signalés</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Formations</p>
              <p className="text-3xl font-bold text-navy mt-1">{formations.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">sessions disponibles</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Habilitations</p>
              <p className="text-3xl font-bold text-navy mt-1">{habilitations.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">certificats enregistrés</p>
            </div>
          </div>

          {/* Mes déclarations récentes */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Mes déclarations récentes</h2>
              <button
                onClick={() => navigate("/incidents")}
                className="text-xs text-navy hover:underline"
              >
                Voir tout
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Référence", "Type", "Date", "Gravité", "Statut"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      Aucune déclaration — utilisez le bouton ci-dessus pour signaler un incident
                    </td>
                  </tr>
                ) : (
                  incidents.slice(0, 5).map((inc) => (
                    <tr key={inc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-navy">{inc.numeroReference}</td>
                      <td className="px-4 py-3 text-gray-600">{inc.type}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {inc.dateDeclaration
                          ? new Date(inc.dateDeclaration).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3"><Badge variant={inc.gravite} /></td>
                      <td className="px-4 py-3"><Badge variant={inc.statut} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Formations */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Formations disponibles</h2>
            </div>
            {formations.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center text-gray-400">Aucune formation enregistrée</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {formations.slice(0, 5).map((f) => (
                  <div key={f.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{f.titre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {f.formateur ? `Par ${f.formateur}` : "Formateur non renseigné"}
                        {f.dateDebut ? ` · ${new Date(f.dateDebut).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    <Badge variant={f.statut} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Habilitations */}
          {habilitations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Mes habilitations</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {habilitations.map((h) => (
                  <div key={h.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{h.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {h.dateExpiration
                          ? `Expire le ${new Date(h.dateExpiration).toLocaleDateString("fr-FR")}`
                          : "Pas de date d'expiration"}
                      </p>
                    </div>
                    <Badge variant={h.statut ?? "VALIDE"} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </AppLayout>
  );
}

export default MonEspace;
