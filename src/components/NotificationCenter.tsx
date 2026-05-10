import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { getOrCreateLocalUserId } from "../services/auth/localUser";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type NotificationRecord,
} from "../services/firebase/notificationService";

const styles: Record<string, CSSProperties> = {
  container: {
    position: "fixed",
    top: "18px",
    right: "18px",
    zIndex: 9999,
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  button: {
    position: "relative",
    width: "46px",
    height: "46px",
    borderRadius: "999px",
    border: "1px solid rgba(31, 94, 77, 0.22)",
    backgroundColor: "rgba(255,255,255,0.96)",
    color: "#1F5E4D",
    fontSize: "20px",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 14px 34px rgba(28, 74, 61, 0.18)",
  },
  badge: {
    position: "absolute",
    top: "-5px",
    right: "-5px",
    minWidth: "20px",
    height: "20px",
    padding: "0 6px",
    borderRadius: "999px",
    backgroundColor: "#C33F32",
    color: "#FFFFFF",
    border: "2px solid #FFFFFF",
    fontSize: "11px",
    fontWeight: 950,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  panel: {
    position: "absolute",
    top: "56px",
    right: 0,
    width: "min(380px, calc(100vw - 36px))",
    maxHeight: "520px",
    overflow: "hidden",
    borderRadius: "18px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    boxShadow: "0 22px 54px rgba(28, 74, 61, 0.22)",
  },
  panelHeader: {
    padding: "14px 14px 12px",
    borderBottom: "1px solid #E4ECE7",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  title: {
    margin: 0,
    color: "#17231F",
    fontSize: "15px",
    fontWeight: 950,
  },
  markAllButton: {
    border: "1px solid #AFCDBB",
    borderRadius: "999px",
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    minHeight: "32px",
    padding: "0 10px",
    fontSize: "12px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  list: {
    display: "grid",
    maxHeight: "438px",
    overflowY: "auto",
  },
  item: {
    border: "none",
    borderBottom: "1px solid #E8EFEA",
    backgroundColor: "#FFFFFF",
    padding: "13px 14px",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  unreadItem: {
    backgroundColor: "#F2FAF3",
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "flex-start",
  },
  itemTitle: {
    color: "#17231F",
    fontSize: "13px",
    fontWeight: 950,
    lineHeight: 1.35,
  },
  itemType: {
    color: "#1F5E4D",
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  },
  itemMessage: {
    margin: "6px 0 0",
    color: "#5F6E66",
    fontSize: "12px",
    lineHeight: 1.45,
    fontWeight: 700,
  },
  empty: {
    padding: "18px 14px",
    color: "#66756E",
    fontSize: "13px",
    lineHeight: 1.5,
    fontWeight: 700,
  },
  dot: {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "999px",
    backgroundColor: "#2E6841",
    marginRight: "8px",
  },
};

function getTypeLabel(type: NotificationRecord["type"]) {
  if (type === "reservation_confirmed") return "Reservation";
  if (type === "reservation_cancelled") return "Reservation";
  if (type === "charging_completed") return "Charging";
  if (type === "low_wallet_balance") return "Cuzdan";
  if (type === "station_availability_update") return "Station";
  return "Bildirim";
}

function NotificationCenter() {
  const userId = useMemo(() => getOrCreateLocalUserId(), []);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(
      userId,
      (nextNotifications) => {
        setNotifications(nextNotifications);
        setError("");
      },
      () => setError("Notifications could not be loaded."),
    );

    return unsubscribe;
  }, [userId]);

  const handleToggleRead = async (notification: NotificationRecord) => {
    try {
      await markNotificationRead(notification.id, !notification.read);
    } catch {
      setError("Notification status could not be updated.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(userId);
    } catch {
      setError("Bildirimler okundu olarak isaretlenemedi.");
    }
  };

  return (
    <div style={styles.container}>
      <button
        type="button"
        style={styles.button}
        aria-label="Bildirimler"
        onClick={() => setOpen((current) => !current)}
      >
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <section style={styles.panel} aria-label="Notification center">
          <div style={styles.panelHeader}>
            <h2 style={styles.title}>Bildirimler</h2>
            <button
              type="button"
              style={styles.markAllButton}
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Tumunu okundu yap
            </button>
          </div>

          <div style={styles.list}>
            {error && <div style={styles.empty}>{error}</div>}

            {!error && notifications.length === 0 && (
              <div style={styles.empty}>No notifications yet.</div>
            )}

            {!error &&
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  style={{
                    ...styles.item,
                    ...(!notification.read ? styles.unreadItem : {}),
                  }}
                  onClick={() => void handleToggleRead(notification)}
                >
                  <div style={styles.itemTop}>
                    <div style={styles.itemTitle}>
                      {!notification.read && <span style={styles.dot} />}
                      {notification.title}
                    </div>
                    <div style={styles.itemType}>
                      {getTypeLabel(notification.type)}
                    </div>
                  </div>
                  <p style={styles.itemMessage}>{notification.message}</p>
                </button>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default NotificationCenter;
