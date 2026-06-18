import { NavLink } from "react-router-dom";
import { useRole } from "../../hooks/useRole";

function Sidebar() {
  const { isAdmin, isEmploye } = useRole();

  // Lien principal du dashboard selon le rôle
  const lienDashboard = isAdmin
    ? { to: "/dashboard-admin", label: "Administration" }
    : isEmploye
    ? { to: "/mon-espace",      label: "Mon espace" }
    : { to: "/dashboard",       label: "Tableau de bord" };

  // Modules partagés (tous les rôles voient incidents ; EMPLOYE ne voit pas EPI/Audits/Users)
  const liensModules = [
    { to: "/incidents",  label: "Incidents",    visible: true },
    { to: "/epis",       label: "EPI",          visible: !isEmploye },
    { to: "/audits",     label: "Audits",        visible: !isEmploye },
    { to: "/formations", label: "Formations",   visible: true },
    { to: "/users",      label: "Utilisateurs", visible: !isEmploye },
  ].filter((l) => l.visible);

  const liens = [lienDashboard, ...liensModules];

  return (
    <aside className="fixed top-0 left-0 w-56 h-screen bg-navy">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5">
        <span className="text-lg font-bold text-white" translate="no">
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
