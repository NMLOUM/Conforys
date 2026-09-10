import { NavLink } from "react-router-dom";
import { useRole } from "../../hooks/useRole";

// ── Icônes SVG inline 16px ──────────────────────────────────────────────────
const IcHome = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <polyline points="9 21 9 12 15 12 15 21"/>
  </svg>
);
const IcUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IcAlert = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IcShield = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IcClipboard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const IcBook = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);
const IcUsers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IcGrid = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const IcCheckSquare = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const IcMatrice = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="1"/>
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
  </svg>
);

const IcSparkle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>
  </svg>
);

const ICONS = {
  "/dashboard-admin": <IcGrid />,
  "/dashboard":       <IcGrid />,
  "/mon-espace":      <IcUser />,
  "/incidents":       <IcAlert />,
  "/actions":         <IcCheckSquare />,
  "/epis":            <IcShield />,
  "/audits":          <IcClipboard />,
  "/formations":      <IcBook />,
  "/duerp":           <IcMatrice />,
  "/users":           <IcUsers />,
  "/assistant":       <IcSparkle />,
};

const SectionLabel = ({ label }) => (
  <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-widest select-none">
    {label}
  </p>
);

function Sidebar({ ouverte, onClose }) {
  const { isAdmin, isEmploye, isQhse } = useRole();

  const navCls = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-md transition-colors ${
      isActive
        ? "bg-white/12 text-white font-medium"
        : "text-white/60 hover:bg-white/6 hover:text-white/90"
    }`;

  const Lien = ({ to, label }) => (
    <NavLink to={to} className={navCls} onClick={onClose}>
      <span className="shrink-0">{ICONS[to]}</span>
      {label}
    </NavLink>
  );

  return (
    <aside
      className={`fixed top-0 left-0 w-56 h-screen bg-navy flex flex-col z-40
        transition-transform duration-200 ease-in-out
        ${ouverte ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
    >
      {/* Logo + bouton fermer (mobile) */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <span className="text-[15px] font-bold text-white tracking-wide" translate="no">
            CONFORYS
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 transition"
        >
          &#x2715;
        </button>
      </div>

      {/* Navigation principale */}
      <nav className="sidebar-nav flex-1 px-3 py-4 overflow-y-auto">

        {/* ── ADMIN ────────────────────────────────────────────────────── */}
        {isAdmin && (
          <>
            <SectionLabel label="Administration" />
            <Lien to="/dashboard-admin" label="Tableau de bord" />
            <Lien to="/users"           label="Utilisateurs" />

            <SectionLabel label="Consultation" />
            <Lien to="/incidents" label="Incidents" />

            <SectionLabel label="Assistant" />
            <Lien to="/assistant" label="Assistant IA" />
          </>
        )}

        {/* ── RESPONSABLE QHSE ─────────────────────────────────────────── */}
        {isQhse && (
          <>
            <SectionLabel label="Tableau de bord" />
            <Lien to="/dashboard" label="Vue d'ensemble" />

            <SectionLabel label="Modules" />
            <Lien to="/incidents" label="Incidents" />
            <Lien to="/actions"   label="Actions correctives" />
            <Lien to="/epis"      label="EPI" />
            <Lien to="/audits"    label="Audits" />
            <Lien to="/duerp"     label="DUERP" />
            <Lien to="/formations" label="Formations" />

            <SectionLabel label="Assistant" />
            <Lien to="/assistant" label="Assistant IA" />
          </>
        )}

        {/* ── EMPLOYÉ ──────────────────────────────────────────────────── */}
        {isEmploye && (
          <>
            <SectionLabel label="Mon espace" />
            <Lien to="/mon-espace"  label="Mon espace" />

            <SectionLabel label="Modules" />
            <Lien to="/incidents"  label="Incidents" />
            <Lien to="/actions"    label="Mes actions" />
            <Lien to="/duerp"      label="DUERP" />
            <Lien to="/formations" label="Formations" />
          </>
        )}
      </nav>

      {/* Footer sidebar */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[11px] text-white/25">v1.0 · Plateforme QHSE</p>
      </div>
    </aside>
  );
}

export default Sidebar;
