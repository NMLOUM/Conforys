import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import AppLayout from "../components/layouts/AppLayout";
import { COULEUR_TYPE_NOTIFICATION } from "../components/layouts/NotificationBell";

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [chargement,     setChargement]    = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "CONFORYS — Notifications";
    return () => { document.title = "CONFORYS"; };
  }, []);

  const charger = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.data || []);
    } catch {
      toast.error("Impossible de charger les notifications.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const toutMarquerLu = async () => {
    try {
      await api.put("/notifications/tout-lu");
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch {
      toast.error("Erreur lors du marquage.");
    }
  };

  const clicNotification = async (notif) => {
    if (!notif.lu) {
      try {
        await api.put(`/notifications/${notif.id}/lu`);
        setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, lu: true } : n));
      } catch {
        // navigation quand même
      }
    }
    if (notif.lien) navigate(notif.lien);
  };

  const nonLues = notifications.filter((n) => !n.lu).length;

  return (
    <AppLayout titre="Notifications">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#64748B]">
          {chargement ? "Chargement…" : `${notifications.length} notification(s)${nonLues > 0 ? ` · ${nonLues} non lue(s)` : ""}`}
        </p>
        {nonLues > 0 && (
          <button onClick={toutMarquerLu}
            className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-navy hover:bg-navy/90 transition-colors">
            Tout marquer lu
          </button>
        )}
      </div>

      <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white divide-y divide-[#F1F5F9]">
        {chargement ? (
          <p className="px-4 py-10 text-center text-sm text-[#94A3B8]">Chargement…</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[#94A3B8]">Aucune notification</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => clicNotification(n)}
              disabled={!n.lien && n.lu}
              className="w-full text-left px-5 py-4 hover:bg-[#F8FAFC] transition-colors flex gap-3"
              style={{ backgroundColor: n.lu ? "white" : "#F8FAFC" }}
            >
              <span
                className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COULEUR_TYPE_NOTIFICATION[n.type] ?? "#94A3B8" }}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-snug ${n.lu ? "font-medium text-[#475569]" : "font-semibold text-[#1E293B]"}`}>
                  {n.titre}
                </p>
                <p className="text-xs text-[#64748B] mt-1">{n.message}</p>
                <p className="text-[11px] text-[#94A3B8] mt-1.5">
                  {new Date(n.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </AppLayout>
  );
}

export default NotificationsPage;
