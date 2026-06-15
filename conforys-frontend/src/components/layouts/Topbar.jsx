import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";

function Topbar({ titre }) {
  // On récupère l'utilisateur connecté et l'action logout
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  // Déconnexion : efface la session et renvoie au login
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Initiales de l'utilisateur (ex: "Ndeye Maguette" → "NM")
  const initiales = user
    ? `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`
    : "?";

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
      {/* Titre de la page */}
      <h1 className="text-lg font-semibold text-navy">{titre}</h1>

      {/* Profil + déconnexion */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          {user ? `${user.prenom} ${user.nom}` : ""}
        </span>
        <div className="flex items-center justify-center w-8 h-8 text-xs font-semibold text-white rounded-full bg-navy">
          {initiales}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}

export default Topbar;