import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function AppLayout({ titre, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar fixe à gauche */}
      <Sidebar />

      {/* Zone principale (décalée à droite de la sidebar) */}
      <div className="ml-56">
        <Topbar titre={titre} />
        {/* Contenu de la page */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;