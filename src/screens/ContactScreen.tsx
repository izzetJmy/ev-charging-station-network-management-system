import { type CSSProperties, useState } from "react";
import SiteHeader from "../components/SiteHeader";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#FFFFFF",
    position: "relative",
    overflowX: "hidden",
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
      "radial-gradient(circle at 25% 18%, rgba(16,53,46,0.18), transparent 40%), radial-gradient(circle at 75% 28%, rgba(169,216,105,0.14), transparent 45%), linear-gradient(90deg, rgba(9, 26, 22, 0.82) 0%, rgba(9, 26, 22, 0.56) 45%, rgba(9, 26, 22, 0.22) 100%)",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    margin: 0,
    padding: "22px 28px 28px",
    boxSizing: "border-box",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  main: {
    flex: "1 1 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 0 18px",
  },
  card: {
    width: "min(1100px, 100%)",
    margin: "0 auto",
    borderRadius: "24px",
    border: "1px solid rgba(255,255,255,0.14)",
    backgroundColor: "rgba(8, 18, 15, 0.26)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 22px 70px rgba(0,0,0,0.20)",
    padding: "18px",
    textAlign: "center",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 1000,
    letterSpacing: "-0.01em",
  },
  desc: {
    margin: "10px 0 0",
    fontSize: "13px",
    fontWeight: 850,
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.78)",
    maxWidth: "820px",
  },
  grid: {
    marginTop: "16px",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "12px",
    alignItems: "start",
  },
  infoCard: {
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: "14px",
    textAlign: "left",
  },
  label: {
    fontSize: "11px",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.72)",
  },
  value: {
    marginTop: "8px",
    fontSize: "14px",
    fontWeight: 950,
    color: "rgba(255,255,255,0.92)",
    overflowWrap: "anywhere",
  },
  form: { display: "grid", gap: "10px" },
  input: {
    width: "100%",
    minHeight: "46px",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(8, 18, 15, 0.28)",
    color: "#FFFFFF",
    fontFamily: "inherit",
    fontWeight: 800,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: "110px",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(8, 18, 15, 0.28)",
    color: "#FFFFFF",
    fontFamily: "inherit",
    fontWeight: 800,
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
  },
  button: {
    minHeight: "50px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(135deg, #1B5B4B 0%, #A9D869 120%)",
    color: "#FFFFFF",
    fontFamily: "inherit",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 18px 46px rgba(0,0,0,0.22), 0 0 46px rgba(169,216,105,0.26)",
  },
  note: {
    fontSize: "11px",
    fontWeight: 850,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.55,
    textAlign: "left",
  },
};

export default function ContactScreen() {
  const [sent, setSent] = useState(false);

  return (
    <div style={styles.page}>
      <div style={styles.heroBg} aria-hidden="true" />
      <div style={styles.heroOverlay} aria-hidden="true" />

      <div style={styles.shell}>
        <SiteHeader />

        <main style={styles.main}>
          <section style={styles.card} aria-label="İletişim">
            <h1 style={styles.title}>İletişim</h1>
            <p style={styles.desc}>
              Sorularınız ve geri bildirimleriniz için bize ulaşın. Mesajınız kayıt altına alınır ve
              en kısa sürede dönüş yapılır.
            </p>

            <div className="contact-grid" style={styles.grid}>
              <div style={styles.infoCard}>
                <div style={styles.label}>E-posta</div>
                <div style={styles.value}>destek@evnetwork.example</div>

                <div style={{ height: "12px" }} />

                <div style={styles.label}>Adres</div>
                <div style={styles.value}>FSE Project • İzmir, Türkiye</div>
              </div>

              <form
                style={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
              >
                <input style={styles.input} placeholder="Ad Soyad" required />
                <input style={styles.input} placeholder="E-posta" type="email" required />
                <textarea style={styles.textarea} placeholder="Mesajınız" required />
                <button type="submit" style={styles.button}>
                  Mesaj Gönder
                </button>
                <div style={styles.note}>
                  {sent
                    ? "Mesaj alındı (demo)."
                    : "Not: Bu form şu an demo. İstersen Firestore’a bağlayabiliriz."}
                </div>
              </form>
            </div>
          </section>
        </main>

        <style>{`
          @media (max-width: 980px) {
            .contact-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
