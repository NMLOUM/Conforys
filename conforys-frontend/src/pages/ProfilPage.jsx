import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Building2, LockKeyhole, Mail, MapPin, Save, Shield, UserRound } from "lucide-react";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { useAuthStore } from "../store/authStore";

const LABELS_ROLE = {
  ADMIN: "Administrateur",
  RESPONSABLE_QHSE: "Responsable QHSE",
  EMPLOYE: "Employé",
};

const inputCls =
  "w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] " +
  "placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition";

const initiales = (user) => `${user?.prenom?.[0] || ""}${user?.nom?.[0] || ""}`.toUpperCase() || "?";

function DetailCompte({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F1F5F9] last:border-0">
      <Icon size={16} className="mt-0.5 text-[#94A3B8] shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#1E293B] mt-0.5 break-words">{children || "Non renseigné"}</p>
      </div>
    </div>
  );
}

function ProfilPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [profil, setProfil] = useState(user);
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", password: "" });
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    document.title = "Mon profil";
    api.get("/users/me")
      .then((res) => {
        const data = res.data.data;
        setProfil(data);
        setUser(data);
        setForm({ prenom: data.prenom || "", nom: data.nom || "", email: data.email || "", password: "" });
      })
      .catch(() => setErreur("Impossible de charger votre profil."))
      .finally(() => setChargement(false));
    return () => { document.title = "CONFORYS"; };
  }, [setUser]);

  const modifier = (champ, valeur) => setForm((valeurs) => ({ ...valeurs, [champ]: valeur }));

  const enregistrer = async (e) => {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    try {
      const payload = { prenom: form.prenom, nom: form.nom, email: form.email };
      if (form.password) payload.password = form.password;
      const res = await api.put("/users/me", payload);
      setProfil(res.data.data);
      setUser(res.data.data);
      setForm((valeurs) => ({ ...valeurs, password: "" }));
      toast.success("Profil mis à jour");
    } catch (err) {
      const message = err.response?.data?.message || "Erreur lors de la mise à jour du profil.";
      setErreur(message);
      toast.error(message);
    } finally {
      setEnvoi(false);
    }
  };

  if (chargement) {
    return <AppLayout titre="Mon profil"><p className="text-sm text-[#64748B]">Chargement du profil…</p></AppLayout>;
  }

  return (
    <AppLayout titre="Mon profil">
      <div className="mb-6">
        <p className="text-xs text-[#94A3B8] mb-1">Compte utilisateur</p>
        <h1 className="text-2xl font-bold text-navy">Mon profil</h1>
        <p className="text-sm text-[#64748B] mt-1">Gérez vos informations personnelles et vos accès.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <form onSubmit={enregistrer} className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 px-5 sm:px-6 py-5 border-b border-[#E2E8F0] bg-[#FCFDFE]">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white bg-navy shrink-0">
              {initiales(profil)}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#1E293B] truncate">{profil?.prenom} {profil?.nom}</h2>
              <p className="text-sm text-[#64748B] truncate">{profil?.email}</p>
            </div>
            <span className="ml-auto hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold text-[#0D2B4E] bg-[#E8F0F8]">
              {LABELS_ROLE[profil?.role] || profil?.role}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {erreur && <p className="p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md">{erreur}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profil-prenom" className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Prénom</label>
                <input id="profil-prenom" value={form.prenom} onChange={(e) => modifier("prenom", e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label htmlFor="profil-nom" className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Nom</label>
                <input id="profil-nom" value={form.nom} onChange={(e) => modifier("nom", e.target.value)} className={inputCls} required />
              </div>
            </div>
            <div>
              <label htmlFor="profil-email" className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Adresse email</label>
              <input id="profil-email" type="email" value={form.email} onChange={(e) => modifier("email", e.target.value)} className={inputCls} required />
            </div>
            <div className="pt-5 border-t border-[#F1F5F9]">
              <div className="flex items-center gap-2 mb-3">
                <LockKeyhole size={16} className="text-[#64748B]" />
                <p className="text-sm font-semibold text-[#1E293B]">Changer le mot de passe</p>
              </div>
              <label htmlFor="profil-password" className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">Nouveau mot de passe</label>
              <input id="profil-password" type="password" value={form.password} onChange={(e) => modifier("password", e.target.value)} className={inputCls} placeholder="Laisser vide pour ne pas le modifier" minLength={8} />
              <p className="mt-1.5 text-xs text-[#94A3B8]">Minimum 8 caractères.</p>
            </div>
          </div>

          <div className="flex justify-end px-5 sm:px-6 py-4 border-t border-[#E2E8F0] bg-[#FCFDFE]">
            <button type="submit" disabled={envoi} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-md bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
              <Save size={15} />
              {envoi ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
          </div>
        </form>

        <aside className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={17} className="text-navy" />
            <h2 className="text-[15px] font-semibold text-[#1E293B]">Informations du compte</h2>
          </div>
          <p className="text-xs text-[#94A3B8] mb-3">Ces éléments sont gérés par votre organisation.</p>
          <DetailCompte icon={Mail} label="Email actuel">{profil?.email}</DetailCompte>
          <DetailCompte icon={Shield} label="Rôle">{LABELS_ROLE[profil?.role] || profil?.role}</DetailCompte>
          <DetailCompte icon={Building2} label="Entreprise">{profil?.entreprise?.nom}</DetailCompte>
          <DetailCompte icon={MapPin} label="Site de rattachement">{profil?.site ? `${profil.site.nom}${profil.site.ville ? `, ${profil.site.ville}` : ""}` : null}</DetailCompte>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#F1F5F9] text-xs text-[#64748B]">
            <UserRound size={14} className="text-[#94A3B8]" />
            Compte actif
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}

export default ProfilPage;
