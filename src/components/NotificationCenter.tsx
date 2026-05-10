import { type CSSProperties, useEffect, useState } from "react";
import { getCurrentUserSession } from "../services/auth/localUser";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type NotificationRecord,
} from "../services/firebase/notificationService";

interface NotificationCenterProps {
  variant?: "fixed" | "inline";
}

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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineContainer: {
    position: "relative",
    zIndex: 2,
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  inlineButton: {
    position: "relative",
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    border: "1px solid rgba(184,240,97,0.30)",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
    color: "#FFFFFF",
    fontSize: "17px",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow:
      "0 12px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.18)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
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

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 17H9M18 10.8C18 7.25 15.55 5 12 5S6 7.25 6 10.8C6 14.8 4.5 16.4 3.6 17.35C3.2 17.78 3.5 18.5 4.1 18.5H19.9C20.5 18.5 20.8 17.78 20.4 17.35C19.5 16.4 18 14.8 18 10.8Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20.2C10.48 20.72 11.18 21 12 21C12.82 21 13.52 20.72 14 20.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M12 5V3.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NotificationCenter({ variant = "fixed" }: NotificationCenterProps) {
  const session = getCurrentUserSession();
  const userId = session?.id ?? "";
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    if (!userId) return () => undefined;

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

  if (!session) return null;

  const handleMarkRead = async (notification: NotificationRecord) => {
    if (notification.read) return;

    try {
      await markNotificationRead(notification.id);
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
    <div style={variant === "inline" ? styles.inlineContainer : styles.container}>
      <button
        type="button"
        style={variant === "inline" ? styles.inlineButton : styles.button}
        aria-label="Bildirimler"
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
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
                  onClick={() => void handleMarkRead(notification)}
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
