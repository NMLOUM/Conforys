import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

function Login() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [erreur,     setErreur]     = useState("");
  const [chargement, setChargement] = useState(false);

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
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="w-full max-w-sm">

        {/* En-tête */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-xl font-bold text-navy tracking-wide" translate="no">CONFORYS</span>
            <span className="text-[10px] font-semibold text-vert bg-vert/15 px-1.5 py-0.5 rounded uppercase tracking-wider">QHSE</span>
          </div>
          <h1 className="text-2xl font-bold text-navy">Connexion</h1>
          <p className="mt-1.5 text-sm text-[#64748B]">Accédez à votre espace QHSE</p>
        </div>

        {/* Carte formulaire */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-7">

          {erreur && (
            <div className="mb-5 p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md">
              {erreur}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="vous@entreprise.sn"
                className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-medium text-[#64748B] uppercase tracking-wide">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
              />
            </div>

            <button
              type="submit"
              disabled={chargement}
              className="w-full py-2.5 text-sm font-semibold text-white bg-navy rounded-md hover:bg-navy/90 disabled:opacity-50 transition-colors mt-2"
            >
              {chargement ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
