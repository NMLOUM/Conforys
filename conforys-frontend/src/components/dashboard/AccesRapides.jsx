import { useNavigate } from "react-router-dom";

const ACTIONS = [
  {
    label:    "Déclarer un incident",
    couleur:  "border-red-200 hover:bg-red-50 hover:border-red-300",
    textColor: "text-red-700",
    route:    "/incidents",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    label:    "Démarrer un audit",
    couleur:  "border-blue-200 hover:bg-blue-50 hover:border-blue-300",
    textColor: "text-blue-700",
    route:    "/audits",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    label:    "Commander des EPI",
    couleur:  "border-orange-200 hover:bg-orange-50 hover:border-orange-300",
    textColor: "text-orange-700",
    route:    "/epis",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      </svg>
    ),
  },
  {
    label:    "Assigner une formation",
    couleur:  "border-green-200 hover:bg-green-50 hover:border-green-300",
    textColor: "text-green-700",
    route:    "/formations",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
];

function AccesRapides() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map((action) => (
        <button
          key={action.route}
          onClick={() => navigate(action.route)}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border bg-white text-left transition ${action.couleur} ${action.textColor}`}
        >
          <span className="shrink-0">{action.icon}</span>
          <span className="text-xs font-medium leading-tight">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

export default AccesRapides;
