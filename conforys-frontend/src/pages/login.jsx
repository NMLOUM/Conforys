import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

function Login() {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [voirPassword, setVoirPassword] = useState(false);
  const [seSouvenir,   setSeSouvenir]   = useState(false);
  const [erreur,       setErreur]       = useState("");
  const [chargement,   setChargement]   = useState(false);

  const navigate = useNavigate();
  const login    = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const response      = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;
      login(token, user);
      const route =
        user.role === "ADMIN"   ? "/dashboard-admin" :
        user.role === "EMPLOYE" ? "/mon-espace"       : "/dashboard";
      navigate(route);
    } catch (err) {
      setErreur(err.response?.data?.message || "Identifiants incorrects. Réessayez.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden">
      {/* Formes décoratives en fond */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-navy/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[30%] h-[30%] rounded-full bg-[#EA580C]/5 blur-3xl" />
      </div>

      {/* ── Colonne connexion ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">

          {/* En-tête : logo en haut, nom de l'appli en dessous */}
          <div className="mb-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-navy rounded-xl mb-4 shadow-lg">
              <ShieldCheck size={32} color="#fff" strokeWidth={2} />
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-navy tracking-tight" translate="no">CONFORYS</span>
              <span className="text-[10px] font-semibold text-vert bg-vert/15 px-1.5 py-0.5 rounded uppercase tracking-wider">QHSE</span>
            </div>
          </div>

          {/* Carte formulaire */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-8" style={{ boxShadow: "0px 10px 15px rgba(13,43,78,0.05)" }}>

            {erreur && (
              <div className="mb-5 p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md">
                {erreur}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-semibold text-navy uppercase tracking-wider">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                  <input
                    id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required autoComplete="email" placeholder="vous@entreprise.sn"
                    className="w-full pl-10 pr-4 py-3 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-xs font-semibold text-navy uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => toast("Fonctionnalité bientôt disponible.")}
                    className="text-xs font-semibold text-[#EA580C] hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                  <input
                    id="password" type={voirPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    required autoComplete="current-password" placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
                  />
                  <button
                    type="button"
                    onClick={() => setVoirPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-navy transition-colors"
                    aria-label={voirPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {voirPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Se souvenir de moi */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox" checked={seSouvenir} onChange={(e) => setSeSouvenir(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E2E8F0] text-navy focus:ring-navy/30"
                />
                <span className="text-sm text-[#64748B]">Se souvenir de moi</span>
              </label>

              <button
                type="submit"
                disabled={chargement}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white bg-navy rounded-lg shadow-md hover:bg-navy/90 disabled:opacity-50 transition-all"
              >
                {chargement ? (
                  "Connexion..."
                ) : (
                  <>
                    Se connecter
                    <LogIn size={16} strokeWidth={2.2} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;
