import { type CSSProperties, useState } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import { useI18n } from "../i18n/I18nProvider";
import { loginUser, registerUser } from "../services/firebase/authUserService";

type AuthMode = "login" | "register";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#FFFFFF",
    position: "relative",
    overflowX: "hidden",
    overflowY: "auto",
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    backgroundImage: "url(/FSE_Project_Web_Site_Landing_Image.png)",
    backgroundSize: "cover",
    backgroundPosition: "center 55%",
    backgroundRepeat: "no-repeat",
  },
  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 25% 18%, rgba(16,53,46,0.18), transparent 40%), radial-gradient(circle at 75% 28%, rgba(169,216,105,0.14), transparent 45%), linear-gradient(90deg, rgba(9, 26, 22, 0.78) 0%, rgba(9, 26, 22, 0.48) 45%, rgba(9, 26, 22, 0.18) 100%)",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    margin: 0,
    padding: "22px 28px 22px",
    boxSizing: "border-box",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
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
  },
  brandLogo: {
    width: "28px",
    height: "28px",
    objectFit: "contain",
    filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.35))",
  },
  brandDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    backgroundColor: "#B8F061",
    boxShadow: "0 0 16px rgba(184,240,97,0.9)",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    flex: "1 1 auto",
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
  main: {
    flex: "1 1 auto",
    display: "grid",
    gridTemplateColumns: "minmax(340px, 420px) minmax(0, 1fr)",
    gap: "72px",
    alignItems: "center",
    justifyContent: "start",
    padding: "56px 0 40px",
    width: "min(1180px, 100%)",
    margin: "0 auto",
  },
  heroCard: {
    width: "100%",
    margin: 0,
    borderRadius: "0px",
    border: "none",
    background: "transparent",
    boxShadow: "none",
    padding: 0,
  },
  heroContent: {
    maxWidth: "860px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "14px",
    paddingLeft: "6px",
    textAlign: "left",
    margin: 0,
  },
  title: {
    margin: 0,
    fontSize: "58px",
    lineHeight: 1.02,
    fontWeight: 1000,
    letterSpacing: "-0.04em",
    textShadow: "0 18px 42px rgba(0,0,0,0.45)",
  },
  subtitle: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    fontSize: "16px",
    lineHeight: 1.8,
    maxWidth: "520px",
    fontWeight: 700,
    textShadow: "0 12px 30px rgba(0,0,0,0.35)",
  },
  primaryButton: {
    marginTop: "18px",
    width: "fit-content",
    minHeight: "70px",
    padding: "0 40px",
    border: "none",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #1B5B4B 0%, #A9D869 120%)",
    color: "#FFFFFF",
    fontSize: "18px",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow:
      "0 18px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.12), 0 0 46px rgba(169,216,105,0.35)",
    transition: "transform 180ms ease, box-shadow 180ms ease, filter 180ms ease",
  },
  authCard: {
    gridColumn: "1",
    gridRow: "1",
    width: "min(420px, 100%)",
    justifySelf: "start",
    transform: "translateX(-24px)",
    borderRadius: "26px",
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.94)",
    color: "#17231F",
    padding: "22px",
    boxShadow:
      "0 24px 70px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.8)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  },
  authHeroSpacer: {
    gridColumn: "2",
    gridRow: "1",
    minHeight: "420px",
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    padding: "6px",
    borderRadius: "18px",
    backgroundColor: "#ECF4EF",
    marginBottom: "18px",
  },
  tab: {
    minHeight: "42px",
    border: "none",
    borderRadius: "14px",
    backgroundColor: "transparent",
    color: "#5F6E66",
    fontSize: "14px",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  activeTab: {
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    boxShadow: "0 10px 22px rgba(31,94,77,0.10)",
  },
  authTitle: {
    margin: "0 0 6px",
    fontSize: "25px",
    fontWeight: 950,
    letterSpacing: "-0.02em",
  },
  authHelper: {
    margin: "0 0 18px",
    color: "#66756E",
    fontSize: "13px",
    lineHeight: 1.55,
    fontWeight: 700,
  },
  formGroup: {
    marginBottom: "13px",
  },
  label: {
    display: "block",
    marginBottom: "7px",
    color: "#263A33",
    fontSize: "13px",
    fontWeight: 850,
  },
  input: {
    width: "100%",
    minHeight: "48px",
    padding: "12px 14px",
    borderRadius: "15px",
    border: "1px solid #D8E2DB",
    backgroundColor: "#FBFDFB",
    color: "#17231F",
    outline: "none",
    boxSizing: "border-box",
    fontSize: "15px",
    fontFamily: "inherit",
  },
  message: {
    padding: "11px 12px",
    borderRadius: "14px",
    margin: "10px 0 0",
    fontSize: "13px",
    lineHeight: 1.45,
    fontWeight: 750,
  },
  error: {
    color: "#A63E30",
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
  },
  submitButton: {
    width: "100%",
    minHeight: "52px",
    marginTop: "14px",
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 14px 28px rgba(31,94,77,0.24)",
  },
  disabledButton: {
    background: "#AEB8B2",
    cursor: "not-allowed",
    boxShadow: "none",
  },
  authNote: {
    margin: "14px 0 0",
    color: "#7A8982",
    fontSize: "12px",
    lineHeight: 1.5,
    fontWeight: 700,
    textAlign: "center",
  },
  footer: {
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    color: "rgba(255,255,255,0.70)",
    fontSize: "12px",
    fontWeight: 800,
    padding: "0 6px",
  },
  footerLink: {
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.90)",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "12px",
    padding: "8px 10px",
    borderRadius: "999px",
  },
};

export default function LandingPageScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>("register");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        await registerUser({ email, phone, password });
      } else {
        await loginUser({ emailOrPhone, password });
      }

      navigate("/app");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? t(authError.message)
          : t("auth.failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div className="landing-hero-bg" style={styles.heroBg} aria-hidden="true" />
      <div style={styles.heroOverlay} aria-hidden="true" />
      <div className="landing-shell" style={styles.shell}>
        <SiteHeader />

        <main className="landing-main" style={styles.main}>
          <section style={{ ...styles.heroCard, ...styles.authHeroSpacer }}>
            <div style={styles.heroContent}>
              <h1 style={styles.title}>{t("landing.title")}</h1>
              <p style={styles.subtitle}>{t("landing.subtitle")}</p>
            </div>
          </section>

          <section className="landing-auth-card" style={styles.authCard} aria-label={t("auth.aria")}>
            <div style={styles.tabs}>
              <button
                type="button"
                style={{
                  ...styles.tab,
                  ...(isRegister ? styles.activeTab : {}),
                }}
                onClick={() => handleModeChange("register")}
              >
                {t("auth.registerTab")}
              </button>
              <button
                type="button"
                style={{
                  ...styles.tab,
                  ...(!isRegister ? styles.activeTab : {}),
                }}
                onClick={() => handleModeChange("login")}
              >
                {t("auth.loginTab")}
              </button>
            </div>

            <h2 style={styles.authTitle}>
              {isRegister ? t("auth.registerTitle") : t("auth.loginTitle")}
            </h2>
            <p style={styles.authHelper}>
              {isRegister
                ? t("auth.registerHelper")
                : t("auth.loginHelper")}
            </p>

            <form onSubmit={handleSubmit}>
              {isRegister ? (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t("auth.email")}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="arda@gmail.com"
                      style={styles.input}
                      autoComplete="email"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t("auth.phone")}</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="05551234567"
                      style={styles.input}
                      autoComplete="tel"
                    />
                  </div>
                </>
              ) : (
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t("auth.emailOrPhone")}</label>
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(event) => setEmailOrPhone(event.target.value)}
                    placeholder="arda@gmail.com veya 05551234567"
                    style={styles.input}
                    autoComplete="username"
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>{t("auth.password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  style={styles.input}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                />
              </div>

              {error && (
                <div style={{ ...styles.message, ...styles.error }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  ...(loading ? styles.disabledButton : {}),
                }}
              >
                {loading
                  ? t("auth.checking")
                  : isRegister
                    ? t("auth.registerSubmit")
                    : t("auth.loginSubmit")}
              </button>
            </form>

            <p style={styles.authNote}>
              {t("auth.usernameNote")}
            </p>
          </section>
        </main>

        <footer style={styles.footer}>
          <div>(c) {new Date().getFullYear()} {t("app.name")}</div>
        </footer>
      </div>

      <style>{`
        button:focus-visible {
          outline: 2px solid rgba(184,240,97,0.8);
          outline-offset: 2px;
        }

        .landing-shell button:hover {
          filter: brightness(1.04);
        }

        .landing-shell button:active {
          transform: translateY(1px);
        }

        .landing-shell input:focus {
          border-color: #1F5E4D !important;
          box-shadow: 0 0 0 4px rgba(31,94,77,0.10);
          background-color: #FFFFFF !important;
        }

        @media (max-width: 820px) {
          .landing-shell {
            padding: 16px !important;
          }

          .landing-main {
            grid-template-columns: 1fr !important;
            justify-items: start !important;
            align-items: start !important;
            padding-top: 24px !important;
          }

          .landing-auth-card {
            grid-column: 1 !important;
            grid-row: 1 !important;
            width: min(360px, calc(100vw - 32px)) !important;
            box-sizing: border-box !important;
            transform: translateX(-6px) !important;
          }

          .landing-main > section:first-child {
            display: none !important;
          }

          .landing-hero-bg {
            background-position: 76% center !important;
          }
        }

        @media (max-width: 720px) {
          .landing-shell h1 {
            font-size: 40px !important;
          }

          .landing-shell p {
            font-size: 15px !important;
          }
        }

      `}</style>
    </div>
  );
}
