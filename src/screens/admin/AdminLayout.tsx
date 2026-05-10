import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminLogout } from "../../services/auth/adminAuth";

type AdminMenuItem = {
  id: string;
  to: string;
  label: string;
};

const MENU_STORAGE_KEY = "evnetwork.admin.menuOrder.v1";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #F6F8F4 0%, #ECF5EE 48%, #F9FBF6 100%)",
    padding: "28px 18px 56px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#17231F",
    overflow: "hidden",
  },
  shell: {
    width: "min(1320px, 100%)",
    margin: "0 auto",
    borderRadius: "28px",
    overflow: "hidden",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    backgroundColor: "rgba(255,255,255,0.88)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
    backdropFilter: "blur(14px)",
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 84px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "18px 20px",
    background:
      "linear-gradient(155deg, #10352E 0%, #1F5E4D 50%, #A9D869 145%)",
    color: "#FFFFFF",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: 950,
    letterSpacing: "-0.02em",
  },
  brandText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    lineHeight: 1.1,
  },
  brandTitle: {
    fontSize: "14px",
    fontWeight: 950,
    letterSpacing: "-0.01em",
  },
  brandSub: {
    fontSize: "12px",
    fontWeight: 850,
    color: "rgba(255,255,255,0.78)",
  },
  dot: {
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    backgroundColor: "#B8F061",
    boxShadow: "0 0 16px rgba(184,240,97,0.9)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoutButton: {
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    padding: "14px 18px",
    borderBottom: "1px solid rgba(31, 94, 77, 0.14)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  navLink: {
    textDecoration: "none",
    borderRadius: "999px",
    padding: "10px 12px",
    border: "1px solid rgba(31, 94, 77, 0.18)",
    color: "#1F5E4D",
    fontWeight: 900,
    fontSize: "13px",
  },
  navLinkActive: {
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    border: "1px solid rgba(23,60,52,0.2)",
    boxShadow: "0 14px 26px rgba(31,94,77,0.18)",
  },
  content: {
    padding: "18px",
  },
  body: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  side: {
    padding: "18px",
    borderRight: "1px solid rgba(31, 94, 77, 0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(245,250,246,0.72))",
    overflowY: "auto",
  },
  sideCard: {
    borderRadius: "18px",
    border: "1px solid rgba(31, 94, 77, 0.14)",
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: "14px",
    boxShadow: "0 14px 40px rgba(23,35,31,0.06)",
  },
  sideTitle: {
    fontSize: "12px",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#3F6B5E",
    marginBottom: "10px",
  },
  sideNav: {
    display: "grid",
    gap: "10px",
  },
  draggableRow: {
    position: "relative",
  },
  dragHandle: {
    borderRadius: "14px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    backgroundColor: "rgba(255,255,255,0.75)",
    color: "#1F5E4D",
    width: "36px",
    height: "36px",
    display: "grid",
    placeItems: "center",
    fontWeight: 1000,
    fontSize: "14px",
    cursor: "grab",
    userSelect: "none",
    boxShadow: "0 10px 26px rgba(23,35,31,0.06)",
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 2,
  },
  dragHandleActive: {
    cursor: "grabbing",
  },
  dropTarget: {
    outline: "3px solid rgba(184,240,97,0.26)",
    boxShadow: "0 0 0 6px rgba(184,240,97,0.12)",
  },
  sideLink: {
    textDecoration: "none",
    borderRadius: "14px",
    padding: "12px 54px 12px 12px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    color: "#1F5E4D",
    fontWeight: 950,
    fontSize: "13px",
    backgroundColor: "rgba(255,255,255,0.8)",
    display: "block",
  },
  sideLinkActive: {
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    border: "1px solid rgba(23,60,52,0.2)",
    boxShadow: "0 16px 34px rgba(31,94,77,0.18)",
  },
  mainArea: {
    padding: "22px",
    overflowY: "auto",
    minHeight: 0,
  },
};

function readMenuOrder(defaultItems: AdminMenuItem[]) {
  try {
    const raw = window.localStorage.getItem(MENU_STORAGE_KEY);
    if (!raw) return defaultItems;
    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return defaultItems;
    const asIds = ids.filter((x): x is string => typeof x === "string");
    if (!asIds.length) return defaultItems;

    const byId = new Map(defaultItems.map((i) => [i.id, i] as const));
    const ordered: AdminMenuItem[] = [];
    for (const id of asIds) {
      const item = byId.get(id);
      if (item) ordered.push(item);
    }

    for (const item of defaultItems) {
      if (!ordered.some((o) => o.id === item.id)) ordered.push(item);
    }

    return ordered;
  } catch {
    return defaultItems;
  }
}

function persistMenuOrder(items: AdminMenuItem[]) {
  try {
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(items.map((i) => i.id)));
  } catch {
    // ignore
  }
}

export default function AdminLayout() {
  const navigate = useNavigate();

  const defaultMenu = useMemo<AdminMenuItem[]>(
    () => [
      { id: "dashboard", to: "/admin/dashboard", label: "Overview" },
      { id: "reports", to: "/admin/reports", label: "Raporlar" },
      { id: "revenue", to: "/admin/revenue", label: "Gelir Raporu" },
      { id: "stations", to: "/admin/stations", label: "Station Statistics" },
      { id: "manage", to: "/admin/manage", label: "Add Station/Charger" },
    ],
    [],
  );

  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>(() => readMenuOrder(defaultMenu));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);

  useEffect(() => {
    setMenuItems((current) => readMenuOrder(current.length ? current : defaultMenu));
  }, [defaultMenu]);

  useEffect(() => {
    persistMenuOrder(menuItems);
  }, [menuItems]);

  const moveItem = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setMenuItems((current) => {
      const sourceIndex = current.findIndex((i) => i.id === sourceId);
      const targetIndex = current.findIndex((i) => i.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return current;
      const next = current.slice();
      const [removed] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, removed);
      return next;
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.brand}>
            <span style={styles.dot} />
            <div style={styles.brandText}>
              <div style={styles.brandTitle}>EV Network - Admin Panel</div>
              <div style={styles.brandSub}>Reservation and charging session reports</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <button
              type="button"
              style={styles.logoutButton}
              onClick={() => {
                adminLogout();
                navigate("/", {
                  replace: true,
                  state: { snackbar: { message: "Cikis yapildi.", variant: "info" } },
                });
              }}
            >
              Cikis
            </button>
          </div>
        </header>

        <div className="admin-body" style={styles.body}>
          <aside className="admin-side" style={styles.side}>
            <div style={styles.sideCard}>
              <div style={styles.sideTitle}>Menu</div>
              <div style={styles.sideNav}>
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      ...styles.draggableRow,
                      ...(dropOverId === item.id ? styles.dropTarget : {}),
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropOverId(item.id);
                    }}
                    onDragLeave={() => setDropOverId((current) => (current === item.id ? null : current))}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggingId) return;
                      moveItem(draggingId, item.id);
                      setDropOverId(null);
                      setDraggingId(null);
                    }}
                  >
                    <NavLink
                      to={item.to}
                      style={({ isActive }) => ({
                        ...styles.sideLink,
                        ...(isActive ? styles.sideLinkActive : {}),
                      })}
                    >
                      {item.label}
                    </NavLink>
                    <div
                      title="Drag and drop"
                      style={{
                        ...styles.dragHandle,
                        ...(draggingId === item.id ? styles.dragHandleActive : {}),
                      }}
                      draggable
                      onDragStart={(e) => {
                        setDraggingId(item.id);
                        e.dataTransfer.setData("text/plain", item.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropOverId(null);
                      }}
                    >
                      ::
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main style={styles.mainArea}>
            <Outlet />
          </main>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .admin-body {
            grid-template-columns: 1fr !important;
          }
          .admin-side {
            border-right: none !important;
            border-bottom: 1px solid rgba(31, 94, 77, 0.10) !important;
          }
        }
      `}</style>
    </div>
  );
}
