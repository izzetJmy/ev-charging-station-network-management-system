import { type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import { getCurrentUserSession } from "../services/auth/localUser";
import NotificationCenter from "./NotificationCenter";

const styles: Record<string, CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "14px 14px",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(8, 18, 15, 0.28)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "0 18px 44px rgba(0,0,0,0.20)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: 950,
    letterSpacing: "-0.02em",
    cursor: "pointer",
  },
  brandLogo: {
    width: "28px",
    height: "28px",
    objectFit: "contain",
    filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.35))",
  },
  right: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    flex: "1 1 auto",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  navLink: {
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: "999px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    color: "rgba(255,255,255,0.92)",
  },
  navLinkActive: {
    borderColor: "rgba(184,240,97,0.55)",
    boxShadow: "0 0 0 3px rgba(184,240,97,0.12)",
  },
  adminButton: {
    border: "none",
    borderRadius: "999px",
    minHeight: "42px",
    padding: "0 14px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 12px 24px rgba(31,94,77,0.22)",
    whiteSpace: "nowrap",
  },
  authButton: {
    border: "1px solid rgba(184,240,97,0.35)",
    borderRadius: "999px",
    minHeight: "42px",
    padding: "0 14px",
    backgroundColor: "rgba(184,240,97,0.12)",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  landingNotificationSlot: {
    display: "inline-flex",
    alignItems: "center",
  },
  langButton: {
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: "999px",
    minHeight: "42px",
    padding: "0 12px",
    fontSize: "13px",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
    color: "rgba(255,255,255,0.92)",
    boxShadow: "0 12px 24px rgba(0,0,0,0.14)",
    whiteSpace: "nowrap",
  },
};

export default function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, toggleLang, t } = useI18n();
  const session = getCurrentUserSession();

  const isActive = (path: string) => location.pathname === path;
  const isLandingPage = location.pathname === "/";

  return (
    <header style={styles.header}>
      <div style={styles.brand} onClick={() => navigate("/")}>
        <img src="/fse_logo.png" alt="FSE" style={styles.brandLogo} />
        {t("app.name")}
      </div>

      <div style={styles.right}>
        <nav style={styles.nav} aria-label="Site navigation">
          <button
            type="button"
            style={{
              ...styles.navLink,
              ...(isActive("/about") ? styles.navLinkActive : {}),
            }}
            onClick={() => navigate("/about")}
          >
            {t("nav.about")}
          </button>
          <button
            type="button"
            style={{
              ...styles.navLink,
              ...(isActive("/contact") ? styles.navLinkActive : {}),
            }}
            onClick={() => navigate("/contact")}
          >
            {t("nav.contact")}
          </button>
        </nav>

        <button type="button" style={styles.langButton} onClick={() => toggleLang()} aria-label={t("nav.language")}>
          {lang === "tr" ? "TR" : "EN"}
        </button>

        {session && (
          <button type="button" style={styles.authButton} onClick={() => navigate("/app")}>
            {session.username}
          </button>
        )}

        <button type="button" style={styles.adminButton} onClick={() => navigate("/admin")}>
          {t("nav.adminLogin")}
        </button>

        {isLandingPage && session && (
          <div style={styles.landingNotificationSlot}>
            <NotificationCenter variant="inline" />
          </div>
        )}
      </div>
    </header>
  );
}
