import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

function Login() {
  // États locaux du formulaire (email, mot de passe, erreur, chargement)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  // Pour rediriger après connexion
  const navigate = useNavigate();
  // L'action login de notre store
  const login = useAuthStore((state) => state.login);

  // Fonction appelée quand on soumet le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page
    setErreur("");
    setChargement(true);

    try {
      // Appel à l'API : POST /api/auth/login
      const response = await api.post("/auth/login", { email, password });
      // On récupère le token et l'utilisateur de la réponse
      const { token, user } = response.data;
      // On les stocke via le store
      login(token, user);
      // Redirection vers le dashboard
      navigate("/dashboard");
    } catch (err) {
      // En cas d'erreur (mauvais identifiants...)
      setErreur(
        err.response?.data?.message || "Erreur de connexion. Réessayez."
      );
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white border border-gray-200 rounded-lg">
        {/* En-tête */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-navy" translate="no">
            CONFORYS <span className="text-vert">✓</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Connectez-vous à votre espace QHSE
          </p>
        </div>

        {/* Message d'erreur */}
        {erreur && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
            {erreur}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-navy"
              placeholder="vous@entreprise.sn"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-navy"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={chargement}
            className="w-full py-2 font-medium text-white rounded bg-navy hover:bg-opacity-90 disabled:opacity-50"
          >
            {chargement ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;