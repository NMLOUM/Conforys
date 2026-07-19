import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

// Couleur du point selon le type de notification — mêmes règles sémantiques
// que la charte CONFORYS (rouge = urgent, orange = attention, navy = info)
export const COULEUR_TYPE_NOTIFICATION = {
  INCIDENT_CRITIQUE:   "#DC2626",
  ACTION_EN_RETARD:    "#DC2626",
  EPI_STOCK_BAS:       "#EA580C",
  HABILITATION_EXPIRE: "#EA580C",
  INCIDENT_DECLARE:    "#0D2B4E",
  AUDIT_PLANIFIE:      "#0D2B4E",
};

const INTERVALLE_POLLING_MS = 60_000;

function formatDateRelative(dateStr) {
  const d = new Date(dateStr);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1)  return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function NotificationBell() {
  const [ouvert,        setOuvert]        = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [compteur,      setCompteur]      = useState(0);
  const [chargement,    setChargement]    = useState(false);
  const conteneurRef = useRef(null);
  const navigate = useNavigate();

  const chargerCompteur = async () => {
    try {
      const res = await api.get("/notifications/non-lues/count");
      setCompteur(res.data.data.count);
    } catch {
      // silencieux — le badge reste simplement inchangé en cas d'échec ponctuel
    }
  };

  const chargerNotifications = async () => {
    setChargement(true);
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setChargement(false);
    }
  };

  // Compteur au montage + rafraîchissement léger toutes les 60s
  useEffect(() => {
    chargerCompteur();
    const id = setInterval(chargerCompteur, INTERVALLE_POLLING_MS);
    return () => clearInterval(id);
  }, []);

  // Ferme le menu au clic en dehors
  useEffect(() => {
    const handleClickDehors = (e) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) {
        setOuvert(false);
      }
    };
    document.addEventListener("mousedown", handleClickDehors);
    return () => document.removeEventListener("mousedown", handleClickDehors);
  }, []);

  const basculerMenu = () => {
    const prochainEtat = !ouvert;
    setOuvert(prochainEtat);
    if (prochainEtat) chargerNotifications();
  };

  const clicNotification = async (notif) => {
    if (!notif.lu) {
      try {
        await api.put(`/notifications/${notif.id}/lu`);
        setCompteur((c) => Math.max(0, c - 1));
        setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, lu: true } : n));
      } catch {
        // on continue quand même la navigation même si le marquage échoue
      }
    }
    setOuvert(false);
    if (notif.lien) navigate(notif.lien);
  };

  const toutMarquerLu = async () => {
    try {
      await api.put("/notifications/tout-lu");
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
      setCompteur(0);
    } catch {
      // pas de retour utilisateur bloquant — le compteur se resynchronisera au prochain polling
    }
  };

  return (
    <div className="relative" ref={conteneurRef}>
      <button
        type="button"
        onClick={basculerMenu}
        aria-label="Notifications"
        className="relative w-8 h-8 flex items-center justify-center rounded text-[#64748B] hover:bg-[#F1F5F9] transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {compteur > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-[#DC2626]">
            {compteur > 9 ? "9+" : compteur}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9]">
            <p className="text-sm font-semibold text-[#1E293B]">Notifications</p>
            {compteur > 0 && (
              <button onClick={toutMarquerLu} className="text-xs font-medium text-navy hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {chargement ? (
              <p className="px-4 py-6 text-center text-xs text-[#94A3B8]">Chargement…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#94A3B8]">Aucune notification</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => clicNotification(n)}
                  className="w-full text-left px-4 py-3 border-b border-[#F1F5F9] last:border-none hover:bg-[#F8FAFC] transition-colors flex gap-2.5"
                  style={{ backgroundColor: n.lu ? "white" : "#F8FAFC" }}
                >
                  <span
                    className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COULEUR_TYPE_NOTIFICATION[n.type] ?? "#94A3B8" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-snug ${n.lu ? "font-medium text-[#475569]" : "font-semibold text-[#1E293B]"}`}>
                      {n.titre}
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-1">{formatDateRelative(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-[#F1F5F9] bg-[#F8FAFC]">
            <button
              onClick={() => { setOuvert(false); navigate("/notifications"); }}
              className="text-xs font-medium text-navy hover:underline"
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
