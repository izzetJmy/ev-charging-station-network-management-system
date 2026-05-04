import { type CSSProperties } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminLogout } from "../../services/auth/adminAuth";

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
    minHeight: "calc(100vh - 170px)",
  },
  side: {
    padding: "18px",
    borderRight: "1px solid rgba(31, 94, 77, 0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(245,250,246,0.72))",
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
  sideLink: {
    textDecoration: "none",
    borderRadius: "14px",
    padding: "12px 12px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    color: "#1F5E4D",
    fontWeight: 950,
    fontSize: "13px",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  sideLinkActive: {
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    border: "1px solid rgba(23,60,52,0.2)",
    boxShadow: "0 16px 34px rgba(31,94,77,0.18)",
  },
  mainArea: {
    padding: "22px",
  },
};

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.brand}>
            <span style={styles.dot} />
            <div style={styles.brandText}>
              <div style={styles.brandTitle}>EV Network • Admin Panel</div>
              <div style={styles.brandSub}>Rezervasyon ve şarj oturumu raporları</div>
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
                  state: { snackbar: { message: "Çıkış yapıldı.", variant: "info" } },
                });
              }}
            >
              Çıkış
            </button>
          </div>
        </header>

        <div className="admin-body" style={styles.body}>
          <aside className="admin-side" style={styles.side}>
            <div style={styles.sideCard}>
              <div style={styles.sideTitle}>Menü</div>
              <div style={styles.sideNav}>
                <NavLink
                  to="/admin/dashboard"
                  style={({ isActive }) => ({
                    ...styles.sideLink,
                    ...(isActive ? styles.sideLinkActive : {}),
                  })}
                >
                  Genel Özet
                </NavLink>
                <NavLink
                  to="/admin/revenue"
                  style={({ isActive }) => ({
                    ...styles.sideLink,
                    ...(isActive ? styles.sideLinkActive : {}),
                  })}
                >
                  Gelir Raporu
                </NavLink>
                <NavLink
                  to="/admin/stations"
                  style={({ isActive }) => ({
                    ...styles.sideLink,
                    ...(isActive ? styles.sideLinkActive : {}),
                  })}
                >
                  İstasyon İstatistikleri
                </NavLink>
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
