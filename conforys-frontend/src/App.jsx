import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import DashboardAdmin from "./pages/DashboardAdmin";
import MonEspace from "./pages/MonEspace";
import IncidentsPage from "./pages/IncidentsPage";
import IncidentDetailPage from "./pages/IncidentDetailPage";
import EpisPage from "./pages/EpisPage";
import AuditsPage from "./pages/AuditsPage";
import AuditDetailPage from "./pages/AuditDetailPage";
import FormationsPage from "./pages/FormationsPage";
import UsersPage from "./pages/UsersPage";
import ActionsPage from "./pages/ActionsPage";

// Redirige vers le bon dashboard selon le rôle de l'utilisateur connecté
function dashboardParRole(role) {
  if (role === "ADMIN")   return "/dashboard-admin";
  if (role === "EMPLOYE") return "/mon-espace";
  return "/dashboard";
}

// Route protégée : l'utilisateur doit être connecté ET avoir l'un des rôles autorisés
function ProtectedRoute({ element, rolesAutorises }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (rolesAutorises && !rolesAutorises.includes(user.role)) {
    return <Navigate to={dashboardParRole(user.role)} replace />;
  }
  return element;
}

// Catch-all : redirige vers le dashboard adapté si connecté, sinon vers /login
function CatchAll() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardParRole(user.role)} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Dashboard RESPONSABLE_QHSE */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              element={<Dashboard />}
              rolesAutorises={["RESPONSABLE_QHSE"]}
            />
          }
        />

        {/* Dashboard ADMIN */}
        <Route
          path="/dashboard-admin"
          element={
            <ProtectedRoute
              element={<DashboardAdmin />}
              rolesAutorises={["ADMIN"]}
            />
          }
        />

        {/* Espace EMPLOYE */}
        <Route
          path="/mon-espace"
          element={
            <ProtectedRoute
              element={<MonEspace />}
              rolesAutorises={["ADMIN", "RESPONSABLE_QHSE", "EMPLOYE"]}
            />
          }
        />

        {/* Incidents : tous les rôles */}
        <Route path="/incidents"     element={<ProtectedRoute element={<IncidentsPage />}      rolesAutorises={["ADMIN", "RESPONSABLE_QHSE", "EMPLOYE"]} />} />
        <Route path="/incidents/:id" element={<ProtectedRoute element={<IncidentDetailPage />} rolesAutorises={["ADMIN", "RESPONSABLE_QHSE", "EMPLOYE"]} />} />
        {/* Actions correctives : QHSE + EMPLOYE (ADMIN n'a pas accès au métier QHSE) */}
        <Route path="/actions"    element={<ProtectedRoute element={<ActionsPage />}    rolesAutorises={["RESPONSABLE_QHSE", "EMPLOYE"]} />} />
        {/* Modules QHSE exclusifs */}
        <Route path="/epis"       element={<ProtectedRoute element={<EpisPage />}       rolesAutorises={["RESPONSABLE_QHSE"]} />} />
        <Route path="/audits"     element={<ProtectedRoute element={<AuditsPage />}     rolesAutorises={["RESPONSABLE_QHSE"]} />} />
        <Route path="/audits/:id" element={<ProtectedRoute element={<AuditDetailPage />} rolesAutorises={["RESPONSABLE_QHSE"]} />} />
        <Route path="/formations" element={<ProtectedRoute element={<FormationsPage />} rolesAutorises={["RESPONSABLE_QHSE", "EMPLOYE"]} />} />
        {/* Utilisateurs : ADMIN (CRUD) + QHSE (lecture pour assigner des actions) */}
        <Route path="/users"      element={<ProtectedRoute element={<UsersPage />}      rolesAutorises={["ADMIN", "RESPONSABLE_QHSE"]} />} />

        <Route path="*" element={<CatchAll />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: "Inter, sans-serif",
            fontSize: "13px",
            borderRadius: "8px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            color: "#1E293B",
          },
          success: { iconTheme: { primary: "#2E7D32", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#DC2626", secondary: "#fff" } },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
