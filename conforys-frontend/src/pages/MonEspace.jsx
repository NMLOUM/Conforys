import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useAuthStore } from "../store/authStore";

function MonEspace() {
  const navigate = useNavigate();
  const user     = useAuthStore((s) => s.user);

  const [incidents,     setIncidents]     = useState([]);
  const [formations,    setFormations]    = useState([]);
  const [habilitations, setHabilitations] = useState([]);
  const [episAffectes,  setEpisAffectes]  = useState([]);
  const [chargement,    setChargement]    = useState(true);

  useEffect(() => {
    document.title = "CONFORYS — Mon espace";
    return () => { document.title = "CONFORYS"; };
  }, []);

  useEffect(() => {
    const charger = async () => {
      try {
        const [resInc, resFrm, resHab, resEpi] = await Promise.all([
          api.get("/incidents"),
          api.get("/formations"),
          api.get("/habilitations").catch(() => ({ data: { data: [] } })),
          api.get("/affectations/mes-epis").catch(() => ({ data: { data: [] } })),
        ]);
        const tousIncidents = resInc.data.data ?? resInc.data ?? [];
        setIncidents(tousIncidents.filter((inc) => inc.declarePar?.id === user?.id));
        setFormations(resFrm.data.data ?? resFrm.data ?? []);
        const toutesHab = resHab.data.data ?? resHab.data ?? [];
        setHabilitations(toutesHab.filter((h) => h.titulaireId === user?.id));
        const tousEpisAffectes = resEpi.data.data ?? [];
        setEpisAffectes(tousEpisAffectes.filter((a) => a.statut === "ACTIVE"));
      } catch (e) {
        console.error("Erreur chargement mon espace:", e);
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, [user?.id]);

  const prenom  = user?.prenom ?? user?.nom ?? "Utilisateur";
  const dateJour = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <AppLayout titre="Mon espace">
      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <div className="space-y-6">

          {/* En-tête personnel */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#1E293B]">Bonjour, {prenom}</h2>
              <p className="text-sm text-[#64748B] mt-0.5 capitalize">{dateJour}</p>
            </div>
            <div className="text-right text-sm text-[#64748B]">
              <p className="font-medium text-[#1E293B]">{user?.email}</p>
              <p className="mt-1"><Badge variant="EMPLOYE" /></p>
            </div>
          </div>

          {/* CTA déclaration */}
          <div className="bg-navy rounded-lg p-6 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-base">Déclarer un incident</h3>
              <p className="text-white/60 text-sm mt-1">
                Signalez immédiatement tout accident, situation dangereuse ou presqu'accident.
              </p>
            </div>
            <button
              onClick={() => navigate("/incidents")}
              className="px-5 py-2.5 bg-white text-navy font-semibold text-sm rounded-md hover:bg-white/90 transition-colors shrink-0 ml-6"
            >
              Déclarer maintenant
            </button>
          </div>

          {/* Compteurs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Mes déclarations", value: incidents.length,     sub: "incidents signalés",       accent: "#0D2B4E" },
              { label: "Formations",        value: formations.length,    sub: "sessions disponibles",     accent: "#0D2B4E" },
              { label: "Habilitations",     value: habilitations.length, sub: "certificats enregistrés", accent: "#0D2B4E" },
            ].map((c) => (
              <div
                key={c.label}
                className="bg-white rounded-lg p-5 flex flex-col justify-between"
                style={{ minHeight: "108px", border: "1px solid #E2E8F0", borderLeft: `4px solid ${c.accent}` }}
              >
                <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{c.label}</p>
                <p className="text-[34px] font-bold leading-none" style={{ color: c.accent }}>{c.value}</p>
                <p className="text-[12px] text-[#94A3B8]">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Déclarations récentes */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1E293B]">Mes déclarations récentes</h2>
              <button onClick={() => navigate("/incidents")}
                className="text-xs text-navy hover:underline font-medium">
                Voir tout
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  {["Référence", "Type", "Date", "Gravité", "Statut"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#94A3B8]">
                      Aucune déclaration — utilisez le bouton ci-dessus pour signaler un incident
                    </td>
                  </tr>
                ) : (
                  incidents.slice(0, 5).map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 font-semibold text-navy text-xs">{inc.numeroReference}</td>
                      <td className="px-4 py-3 text-[#475569]">{inc.type}</td>
                      <td className="px-4 py-3 text-[#64748B]">
                        {inc.dateDeclaration ? new Date(inc.dateDeclaration).toLocaleDateString("fr-FR") : "—"}
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
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-sm font-semibold text-[#1E293B]">Formations disponibles</h2>
            </div>
            {formations.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center text-[#94A3B8]">Aucune formation enregistrée</p>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {formations.slice(0, 5).map((f) => (
                  <div key={f.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{f.titre}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">
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
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-sm font-semibold text-[#1E293B]">Mes habilitations</h2>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {habilitations.map((h) => (
                  <div key={h.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{h.type}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">
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

          {/* EPI affectés */}
          {episAffectes.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-sm font-semibold text-[#1E293B]">Mes EPI affectés</h2>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {episAffectes.map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{a.epi.designation}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {a.epi.type}{a.epi.reference ? ` · ${a.epi.reference}` : ""}
                        {a.poste ? ` · ${a.poste}` : ""}
                      </p>
                    </div>
                    <Badge variant="ACTIVE" />
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
