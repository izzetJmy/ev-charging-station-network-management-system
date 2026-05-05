import { type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

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
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "56px 0 40px",
  },
  heroCard: {
    width: "min(1180px, 100%)",
    margin: "0 auto",
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

  return (
    <div style={styles.page}>
      <div style={styles.heroBg} aria-hidden="true" />
      <div style={styles.heroOverlay} aria-hidden="true" />
      <div className="landing-shell" style={styles.shell}>
        <SiteHeader />

        <main style={styles.main}>
          <section style={styles.heroCard}>
            <div style={styles.heroContent}>
              <h1 style={styles.title}>EV istasyonlarını tek ekrandan yönetin.</h1>
              <p style={styles.subtitle}>
                Araç profilini oluşturun, uygun istasyonları haritada görün, rezervasyon yapın ve
                şarj oturumu maliyetinizi anında hesaplayın.
              </p>

              <button
                type="button"
                className="cta-button"
                style={styles.primaryButton}
                onClick={() => navigate("/app")}
              >
                Başla
              </button>
            </div>
          </section>
        </main>

        <footer style={styles.footer}>
          <div>© {new Date().getFullYear()} EV Network</div>
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

        .cta-button {
          filter: drop-shadow(0 10px 32px rgba(169,216,105,0.22));
        }

        .cta-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 52px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.14), 0 0 70px rgba(169,216,105,0.5);
        }

        @media (max-width: 820px) {
          .landing-shell {
            padding: 16px !important;
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
