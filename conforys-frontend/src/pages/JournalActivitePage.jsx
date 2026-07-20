import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";

// Catégories dérivées côté backend (historiqueService.CATEGORIES_ACTION) —
// mêmes codes, pour peupler le filtre.
const OPTIONS_TYPE = [
  { value: "DECLARATION",       label: "Déclaration" },
  { value: "CHANGEMENT_STATUT", label: "Changement de statut" },
  { value: "ACTION_CORRECTIVE", label: "Action corrective" },
  { value: "PIECE_JOINTE",      label: "Pièce jointe" },
];

const formatDateHeure = (d) =>
  d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—";

const inputCls =
  "px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] " +
  "focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition";

function JournalActivitePage() {
  const [entries,    setEntries]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [chargement, setChargement] = useState(true);

  const [filtreType,   setFiltreType]   = useState("");
  const [filtreAuteur, setFiltreAuteur] = useState("");
  const [dateDebut,    setDateDebut]    = useState("");
  const [dateFin,      setDateFin]      = useState("");

  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    document.title = "CONFORYS — Journal d'activité";
    return () => { document.title = "CONFORYS"; };
  }, []);

  // charger accepte des overrides pour éviter les décalages liés aux mises à
  // jour asynchrones de l'état React (même pattern que IncidentsPage).
  const charger = async ({
    typeAction = filtreType,
    auteurId   = filtreAuteur,
    debut      = dateDebut,
    fin        = dateFin,
    pg         = page,
  } = {}) => {
    setChargement(true);
    try {
      const params = { page: pg, limit: 20 };
      if (typeAction) params.typeAction = typeAction;
      if (auteurId)   params.auteurId   = auteurId;
      if (debut)      params.dateDebut  = debut;
      if (fin)        params.dateFin    = fin;
      const res = await api.get("/historique/global", { params });
      setEntries(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      console.error("Erreur chargement journal d'activité:", e);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
    api.get("/users").then((r) => setUsers(r.data.data || [])).catch(() => {});
  }, []);

  const changerFiltre = (cle, val, setFn) => {
    setFn(val);
    setPage(1);
    charger({
      typeAction: cle === "typeAction" ? val : filtreType,
      auteurId:   cle === "auteurId"   ? val : filtreAuteur,
      debut:      cle === "debut"      ? val : dateDebut,
      fin:        cle === "fin"        ? val : dateFin,
      pg: 1,
    });
  };

  const reinitialiserFiltres = () => {
    setFiltreType(""); setFiltreAuteur(""); setDateDebut(""); setDateFin("");
    setPage(1);
    charger({ typeAction: "", auteurId: "", debut: "", fin: "", pg: 1 });
  };

  const changerPage = (pg) => {
    setPage(pg);
    charger({ pg });
  };

  const filtresActifs = filtreType || filtreAuteur || dateDebut || dateFin;

  return (
    <AppLayout titre="Journal d'activité">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-navy">Journal d'activité</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Vue agrégée, en lecture seule, de toutes les actions effectuées sur l'ensemble des incidents.
        </p>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-white border border-[#E2E8F0] rounded-lg">
        <div>
          <label className="block mb-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Type d'action</label>
          <select value={filtreType} onChange={(e) => changerFiltre("typeAction", e.target.value, setFiltreType)} className={inputCls}>
            <option value="">Tous</option>
            {OPTIONS_TYPE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Utilisateur</label>
          <select value={filtreAuteur} onChange={(e) => changerFiltre("auteurId", e.target.value, setFiltreAuteur)} className={inputCls}>
            <option value="">Tous</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Du</label>
          <input type="date" value={dateDebut} onChange={(e) => changerFiltre("debut", e.target.value, setDateDebut)} className={inputCls} />
        </div>
        <div>
          <label className="block mb-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Au</label>
          <input type="date" value={dateFin} onChange={(e) => changerFiltre("fin", e.target.value, setDateFin)} className={inputCls} />
        </div>
        {filtresActifs && (
          <button onClick={reinitialiserFiltres} className="text-xs text-[#64748B] hover:text-navy underline shrink-0">
            Réinitialiser les filtres
          </button>
        )}
        <span className="text-sm text-[#64748B] shrink-0 ml-auto">{total} résultat{total !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Tableau ── */}
      {chargement ? (
        <p className="text-sm text-[#64748B]">Chargement…</p>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  {["Date / heure", "Auteur", "Action", "Incident"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-[#94A3B8]">
                      {filtresActifs ? "Aucune activité ne correspond aux filtres sélectionnés." : "Aucune activité enregistrée."}
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{formatDateHeure(e.dateAction)}</td>
                      <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">
                        {e.auteur ? `${e.auteur.prenom} ${e.auteur.nom}` : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={e.categorie} />
                          <span className="text-[#1E293B]">{e.action}</span>
                        </div>
                        {e.details && <p className="text-xs text-[#94A3B8] mt-1">{e.details}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {e.incident ? (
                          <Link to={`/incidents/${e.incident.id}`} className="font-semibold text-navy hover:underline">
                            {e.incident.numeroReference}
                          </Link>
                        ) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <p className="text-xs text-[#64748B]">Page {page} / {totalPages} — {total} résultat(s)</p>
              <div className="flex items-center gap-2">
                <button onClick={() => changerPage(page - 1)} disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  ← Précédent
                </button>
                <button onClick={() => changerPage(page + 1)} disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default JournalActivitePage;
