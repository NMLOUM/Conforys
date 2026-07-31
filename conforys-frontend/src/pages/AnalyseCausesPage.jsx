import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useRole } from "../hooks/useRole";
import AnalyseCausesRacines from "../components/incidents/AnalyseCausesRacines";

function AnalyseCausesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isQhse } = useRole();

  const [incident,   setIncident]   = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur,     setErreur]     = useState("");

  useEffect(() => {
    document.title = "Analyse des causes";
    api.get(`/incidents/${id}`)
      .then((res) => setIncident(res.data.data))
      .catch(() => setErreur("Impossible de charger l'incident."))
      .finally(() => setChargement(false));
    return () => { document.title = "CONFORYS"; };
  }, [id]);

  if (chargement) {
    return (
      <AppLayout titre="Chargement…">
        <p className="text-sm text-[#64748B]">Chargement…</p>
      </AppLayout>
    );
  }

  if (erreur || !incident) {
    return (
      <AppLayout titre="Incident introuvable">
        <p className="text-sm text-[#DC2626]">{erreur || "Incident introuvable."}</p>
        <button onClick={() => navigate("/incidents")} className="mt-4 text-sm text-[#0D2B4E] underline">
          Retour aux incidents
        </button>
      </AppLayout>
    );
  }

  return (
    <AppLayout titre="Analyse des causes">
      {/* ── Fil d'ariane ── */}
      <div className="flex items-center gap-1.5 mb-4 text-xs text-[#64748B]">
        <Link to="/incidents" className="hover:text-[#0D2B4E] transition-colors">Incidents</Link>
        <span>/</span>
        <Link to={`/incidents/${id}`} className="hover:text-[#0D2B4E] transition-colors">{incident.numeroReference}</Link>
        <span>/</span>
        <span className="text-[#1E293B] font-medium">Analyse des causes</span>
      </div>

      {/* ── En-tête ── */}
      <div className="mb-6 pb-5 border-b border-[#E2E8F0]">
        <h1 className="text-lg font-semibold text-navy">Analyse des causes racines</h1>
        <p className="text-sm text-[#64748B] mt-1">Méthodes : Ishikawa (5M) et 5 Pourquoi</p>
      </div>

      <AnalyseCausesRacines incident={incident} peutGerer={isQhse} onActionCreee={() => {}} />

      <div className="mt-6">
        <Link to={`/incidents/${id}`} className="text-sm text-[#0D2B4E] hover:underline">
          ← Retour au détail de l'incident
        </Link>
      </div>
    </AppLayout>
  );
}

export default AnalyseCausesPage;
