import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function AppLayout({ titre, children }) {
  const [sidebarOuverte, setSidebarOuverte] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar ouverte={sidebarOuverte} onClose={() => setSidebarOuverte(false)} />

      {/* Backdrop mobile — ferme la sidebar au clic */}
      {sidebarOuverte && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOuverte(false)}
        />
      )}

      <div className="lg:ml-56">
        <Topbar titre={titre} onOuvrirSidebar={() => setSidebarOuverte(true)} />
        <main className="p-4 lg:p-6 max-w-screen-xl">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;
