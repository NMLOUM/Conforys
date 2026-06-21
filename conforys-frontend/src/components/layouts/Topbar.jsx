import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";

function Topbar({ titre, onOuvrirSidebar }) {
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
    <header className="flex items-center justify-between h-14 px-4 lg:px-6 bg-white border-b border-[#E2E8F0]">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile uniquement */}
        <button
          type="button"
          onClick={onOuvrirSidebar}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded text-[#64748B] hover:bg-[#F1F5F9] transition"
          aria-label="Ouvrir le menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"  />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-[#1E293B] tracking-tight">{titre}</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-sm text-[#64748B]">
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
