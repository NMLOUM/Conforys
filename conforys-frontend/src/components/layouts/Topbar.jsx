import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";

function Topbar({ titre }) {
  const user     = useAuthStore((state) => state.user);
  const logout   = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initiales = user
    ? `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`.toUpperCase()
    : "?";

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-[#E2E8F0]">
      <h1 className="text-base font-semibold text-[#1E293B] tracking-tight">{titre}</h1>

      <div className="flex items-center gap-4">
        <span className="text-sm text-[#64748B]">
          {user ? `${user.prenom} ${user.nom}` : ""}
        </span>

        <div className="flex items-center justify-center w-8 h-8 text-xs font-semibold text-white rounded-full bg-navy select-none">
          {initiales}
        </div>

        <button
          onClick={handleLogout}
          className="text-sm text-[#64748B] hover:text-[#DC2626] transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}

export default Topbar;
