import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useTable } from "../hooks/useTable";

const LABELS_SOURCE = { SESSION: "Session présentielle", MODULE_EN_LIGNE: "Module en ligne" };

function AttestationsPage() {
  const [attestations, setAttestations] = useState([]);
  const [users,        setUsers]        = useState([]);
  const [chargement,   setChargement]   = useState(true);
  const [telechargementEnCours, setTelechargementEnCours] = useState(null);

  const [showFiltres,     setShowFiltres]     = useState(false);
  const [filtreBeneficiaire, setFiltreBeneficiaire] = useState("");
  const [filtreStatut,    setFiltreStatut]    = useState("");

  useEffect(() => {
    document.title = "Attestations";
    return () => { document.title = "CONFORYS"; };
  }, []);

  useEffect(() => {
    api.get("/attestations")
      .then((r) => setAttestations(r.data.data || []))
      .catch((e) => console.error("Erreur chargement attestations:", e))
      .finally(() => setChargement(false));
    api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
  }, []);

  const attestationsFiltrees = attestations
    .filter((a) => !filtreBeneficiaire || a.beneficiaireId === filtreBeneficiaire)
    .filter((a) => !filtreStatut || a.statut === filtreStatut);

  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(attestationsFiltrees, ["titreFormation"]);

  const telecharger = async (attestation) => {
    setTelechargementEnCours(attestation.id);
    try {
      const res = await api.get(`/attestations/${attestation.id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `attestation-${attestation.titreFormation}.pdf`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Erreur lors du téléchargement de l'attestation.");
    } finally {
      setTelechargementEnCours(null);
    }
  };

  const selectCls =
    "px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#475569] focus:outline-none focus:ring-2 focus:ring-navy/30 transition";

  const filtresActifs = filtreBeneficiaire || filtreStatut;

  return (
    <AppLayout titre="Attestations">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-lg font-semibold text-navy">Attestations de formation</h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">Tableau de bord <span className="mx-1">›</span> Attestations</p>
        </div>
        <button
          onClick={() => setShowFiltres((v) => !v)}
          className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
            showFiltres ? "border-navy text-navy bg-navy/5" : "border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"
          }`}
        >
          Filtrer
        </button>
      </div>

      {showFiltres && (
        <div className="flex flex-wrap items-center gap-3 my-4 p-4 bg-white border border-[#E2E8F0] rounded-lg">
          <select value={filtreBeneficiaire} onChange={(e) => setFiltreBeneficiaire(e.target.value)} className={selectCls}>
            <option value="">Tous les employés</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
          </select>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className={selectCls}>
            <option value="">Tous les statuts</option>
            <option value="VALIDE">Valide</option>
            <option value="EXPIREE">Expirée</option>
          </select>
          {filtresActifs && (
            <button onClick={() => { setFiltreBeneficiaire(""); setFiltreStatut(""); }}
              className="text-xs text-[#64748B] hover:text-navy underline">
              Réinitialiser
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 my-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Rechercher par formation…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition" />
        </div>
        <span className="text-sm text-[#64748B] shrink-0">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
      </div>

      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement...</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  {["Bénéficiaire", "Formation", "Origine", "Obtenue le", "Expire le", "Statut", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {affiches.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-[#94A3B8]">
                    {recherche || filtresActifs ? "Aucune attestation ne correspond aux critères." : "Aucune attestation délivrée"}
                  </td></tr>
                ) : (
                  affiches.map((a) => (
                    <tr key={a.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1E293B]">{a.beneficiaire.prenom} {a.beneficiaire.nom}</td>
                      <td className="px-4 py-3 text-[#475569]">{a.titreFormation}</td>
                      <td className="px-4 py-3 text-[#64748B]">{LABELS_SOURCE[a.source] ?? a.source}</td>
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{new Date(a.dateObtention).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                        {a.dateExpiration ? new Date(a.dateExpiration).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3"><Badge variant={a.statut} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => telecharger(a)}
                          disabled={telechargementEnCours === a.id}
                          className="px-2.5 py-1 text-xs font-medium text-navy border border-[#E2E8F0] rounded-md hover:bg-[#F1F5F9] disabled:opacity-50 transition-colors"
                        >
                          {telechargementEnCours === a.id ? "..." : "Télécharger"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                ← Précédent
              </button>
              <span className="text-xs text-[#64748B]">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default AttestationsPage;
