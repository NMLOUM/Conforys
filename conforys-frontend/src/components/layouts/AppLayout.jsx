import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function AppLayout({ titre, children }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="ml-56">
        <Topbar titre={titre} />
        <main className="p-6 max-w-screen-xl">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;
