import { NavLink } from "react-router-dom";

function Sidebar() {
  // Liste des liens du menu
  const liens = [
    { to: "/dashboard", label: "Tableau de bord" },
    { to: "/incidents", label: "Incidents" },
    { to: "/epis", label: "EPI" },
    { to: "/audits", label: "Audits" },
    { to: "/formations", label: "Formations" },
    { to: "/users", label: "Utilisateurs" },
  ];

  return (
    <aside className="fixed top-0 left-0 w-56 h-screen bg-navy">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5">
        <span className="text-lg font-bold text-white">
          CONFORYS <span className="text-vert">✓</span>
        </span>
      </div>

      {/* Menu de navigation */}
      <nav className="px-3 mt-4 space-y-1">
        {liens.map((lien) => (
          <NavLink
            key={lien.to}
            to={lien.to}
            className={({ isActive }) =>
              `block px-3 py-2 text-sm rounded transition ${
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-300 hover:bg-white/5"
              }`
            }
          >
            {lien.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;