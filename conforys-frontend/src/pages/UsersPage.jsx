import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import Badge from "../components/ui/Badge";
import { useRole } from "../hooks/useRole";
import { useTable } from "../hooks/useTable";

const ROLES = [
  { value: "EMPLOYE",          label: "Employé" },
  { value: "RESPONSABLE_QHSE", label: "Responsable QHSE" },
  { value: "ADMIN",            label: "Admin" },
];

const inputCls =
  "w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] " +
  "placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition";

// ── Modale Créer utilisateur ──────────────────────────────────────────────────

function ModalCreerUser({ entreprises, onSuccess, onClose }) {
  const [form, setForm] = useState({
    prenom: "", nom: "", email: "", password: "",
    role: "EMPLOYE", entrepriseId: entreprises[0]?.id || "",
  });
  const [erreur, setErreur] = useState("");
  const [envoi,  setEnvoi]  = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const soumettre = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) { setErreur("Prénom et nom sont obligatoires."); return; }
    if (!form.email.trim())    { setErreur("L'email est obligatoire."); return; }
    if (!form.password.trim()) { setErreur("Le mot de passe est obligatoire."); return; }
    if (!form.entrepriseId)    { setErreur("Sélectionnez une entreprise."); return; }
    setErreur(""); setEnvoi(true);
    try {
      await api.post("/users", form);
      toast.success("Utilisateur créé avec succès");
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la création.";
      setErreur(msg);
      toast.error(msg);
    } finally { setEnvoi(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Nouvel utilisateur</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Prénom *</label>
              <input value={form.prenom} onChange={(e) => set("prenom", e.target.value)}
                className={inputCls} placeholder="Prénom" />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Nom *</label>
              <input value={form.nom} onChange={(e) => set("nom", e.target.value)}
                className={inputCls} placeholder="Nom" />
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Email *</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              className={inputCls} placeholder="adresse@email.com" />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Mot de passe *</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
              className={inputCls} placeholder="Minimum 8 caractères" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Rôle *</label>
              <select value={form.role} onChange={(e) => set("role", e.target.value)} className={inputCls}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Entreprise *</label>
              <select value={form.entrepriseId} onChange={(e) => set("entrepriseId", e.target.value)} className={inputCls}>
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose} disabled={envoi}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button type="button" onClick={soumettre} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-[#0D2B4E] hover:bg-[#0D2B4E]/90 disabled:opacity-50 transition-colors">
            {envoi ? "Création…" : "Créer l'utilisateur"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modale Modifier utilisateur ───────────────────────────────────────────────

function ModalModifierUser({ user, onSuccess, onClose }) {
  const [form, setForm] = useState({
    prenom: user.prenom || "",
    nom:    user.nom    || "",
    email:  user.email  || "",
    role:   user.role   || "EMPLOYE",
    password: "",
  });
  const [erreur, setErreur] = useState("");
  const [envoi,  setEnvoi]  = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const soumettre = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) { setErreur("Prénom et nom sont obligatoires."); return; }
    if (!form.email.trim()) { setErreur("L'email est obligatoire."); return; }
    setErreur(""); setEnvoi(true);
    try {
      const payload = { prenom: form.prenom, nom: form.nom, email: form.email, role: form.role };
      if (form.password.trim()) payload.password = form.password;
      await api.put(`/users/${user.id}`, payload);
      toast.success("Utilisateur modifié avec succès");
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la modification.";
      setErreur(msg);
      toast.error(msg);
    } finally { setEnvoi(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-lg border border-[#E2E8F0] mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Modifier l'utilisateur</h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition">
            &#x2715;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {erreur && (
            <p className="text-xs text-[#DC2626] p-3 bg-red-50 border border-red-200 rounded-md">{erreur}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Prénom *</label>
              <input value={form.prenom} onChange={(e) => set("prenom", e.target.value)}
                className={inputCls} placeholder="Prénom" />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Nom *</label>
              <input value={form.nom} onChange={(e) => set("nom", e.target.value)}
                className={inputCls} placeholder="Nom" />
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Email *</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              className={inputCls} placeholder="adresse@email.com" />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Rôle *</label>
            <select value={form.role} onChange={(e) => set("role", e.target.value)} className={inputCls}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">
              Nouveau mot de passe <span className="text-[#94A3B8] normal-case font-normal">(laisser vide pour ne pas changer)</span>
            </label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
              className={inputCls} placeholder="Nouveau mot de passe" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button type="button" onClick={onClose} disabled={envoi}
            className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button type="button" onClick={soumettre} disabled={envoi}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-[#0D2B4E] hover:bg-[#0D2B4E]/90 disabled:opacity-50 transition-colors">
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function UsersPage() {
  const { isAdmin } = useRole();
  const [users,       setUsers]       = useState([]);
  const [entreprises, setEntreprises] = useState([]);
  const [chargement,  setChargement]  = useState(true);
  const [modalCreer,  setModalCreer]  = useState(false);
  const [userAModifier, setUserAModifier] = useState(null);
  const [toggleIds,   setToggleIds]   = useState(new Set());
  const [suppIds,     setSuppIds]     = useState(new Set());

  const { recherche, setRecherche, page, setPage, totalPages, filtres, affiches } =
    useTable(users, ["nom", "prenom", "email"]);

  useEffect(() => {
    document.title = "Utilisateurs";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    setChargement(true);
    try {
      const [resUsers, resEntr] = await Promise.allSettled([
        api.get("/users"),
        api.get("/entreprises"),
      ]);
      if (resUsers.status === "fulfilled") setUsers(resUsers.value.data.data || []);
      if (resEntr.status  === "fulfilled") setEntreprises(resEntr.value.data.data || []);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const toggleActif = async (user) => {
    setToggleIds((prev) => new Set([...prev, user.id]));
    try {
      await api.put(`/users/${user.id}`, { actif: !user.actif });
      toast.success(user.actif ? `${user.prenom} désactivé` : `${user.prenom} réactivé`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, actif: !u.actif } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors du changement de statut.");
    } finally {
      setToggleIds((prev) => { const s = new Set(prev); s.delete(user.id); return s; });
    }
  };

  const supprimer = async (user) => {
    if (!window.confirm(`Supprimer définitivement ${user.prenom} ${user.nom} ?`)) return;
    setSuppIds((prev) => new Set([...prev, user.id]));
    try {
      await api.delete(`/users/${user.id}`);
      toast.success("Utilisateur supprimé");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression.");
    } finally {
      setSuppIds((prev) => { const s = new Set(prev); s.delete(user.id); return s; });
    }
  };

  return (
    <AppLayout titre="Utilisateurs">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Rechercher par nom, prénom, email…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]/30 focus:border-[#0D2B4E] transition" />
        </div>
        <span className="text-sm text-[#64748B] shrink-0">{filtres.length} résultat{filtres.length !== 1 ? "s" : ""}</span>
        {isAdmin && (
          <button
            onClick={() => setModalCreer(true)}
            className="ml-auto px-4 py-2 text-sm font-semibold text-white rounded-md bg-[#0D2B4E] hover:bg-[#0D2B4E]/90 transition-colors"
          >
            Nouvel utilisateur
          </button>
        )}
      </div>

      {chargement ? (
        <div className="flex items-center gap-2 text-sm text-[#64748B] py-8">
          <div className="w-4 h-4 border-2 border-[#0D2B4E] border-t-transparent rounded-full animate-spin" />
          Chargement…
        </div>
      ) : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {["Utilisateur", "Email", "Rôle", "Entreprise", "Statut", ...(isAdmin ? ["Actions"] : [])].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {affiches.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-[#94A3B8]">
                    {recherche ? "Aucun utilisateur ne correspond à la recherche." : "Aucun utilisateur"}
                  </td>
                </tr>
              ) : (
                affiches.map((u) => (
                  <tr key={u.id} className={`hover:bg-[#F8FAFC] transition-colors ${!u.actif ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 text-[11px] font-semibold text-white rounded-full bg-[#0D2B4E] shrink-0 select-none">
                          {u.prenom?.[0]}{u.nom?.[0]}
                        </div>
                        <span className="font-medium text-[#1E293B]">{u.prenom} {u.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{u.email}</td>
                    <td className="px-4 py-3"><Badge variant={u.role} /></td>
                    <td className="px-4 py-3 text-[#64748B]">{u.entreprise?.nom || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.actif ? "ACTIF_USER" : "INACTIF_USER"} label={u.actif ? "Actif" : "Inactif"} />
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setUserAModifier(u)}
                            className="px-3 py-1.5 text-xs font-medium text-[#0D2B4E] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => toggleActif(u)}
                            disabled={toggleIds.has(u.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 ${
                              u.actif
                                ? "text-[#EA580C] border-orange-200 hover:bg-orange-50"
                                : "text-[#2E7D32] border-green-200 hover:bg-green-50"
                            }`}
                          >
                            {toggleIds.has(u.id) ? "…" : u.actif ? "Désactiver" : "Réactiver"}
                          </button>
                          <button
                            onClick={() => supprimer(u)}
                            disabled={suppIds.has(u.id)}
                            className="px-3 py-1.5 text-xs font-medium text-[#DC2626] border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {suppIds.has(u.id) ? "…" : "Supprimer"}
                          </button>
                        </div>
                      </td>
                    )}
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

      {modalCreer && (
        <ModalCreerUser
          entreprises={entreprises}
          onSuccess={() => { setModalCreer(false); charger(); }}
          onClose={() => setModalCreer(false)}
        />
      )}

      {userAModifier && (
        <ModalModifierUser
          user={userAModifier}
          onSuccess={() => { setUserAModifier(null); charger(); }}
          onClose={() => setUserAModifier(null)}
        />
      )}
    </AppLayout>
  );
}

export default UsersPage;
