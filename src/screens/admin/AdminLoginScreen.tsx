import { type CSSProperties, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { adminLogin, isAdminAuthenticated } from "../../services/auth/adminAuth";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #F6F8F4 0%, #ECF5EE 48%, #F9FBF6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 18px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#17231F",
    boxSizing: "border-box",
  },
  card: {
    width: "min(520px, 100%)",
    borderRadius: "24px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
    backdropFilter: "blur(14px)",
    padding: "26px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 950,
    letterSpacing: "-0.02em",
    color: "#17231F",
  },
  subtitle: {
    margin: "10px 0 18px",
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.7,
    fontWeight: 700,
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: 850,
    color: "#263A33",
  },
  input: {
    width: "100%",
    minHeight: "46px",
    padding: "12px 14px",
    border: "1px solid #D8E2DB",
    borderRadius: "14px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    backgroundColor: "#FBFDFB",
    color: "#17231F",
    fontFamily: "inherit",
    marginBottom: "14px",
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "10px",
  },
  primaryButton: {
    minHeight: "52px",
    padding: "14px 16px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    border: "none",
    borderRadius: "16px",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: 850,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(31,94,77,0.26)",
    fontFamily: "inherit",
  },
  secondaryButton: {
    minHeight: "52px",
    padding: "14px 16px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "16px",
    color: "#1F5E4D",
    fontSize: "15px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  message: {
    marginTop: "14px",
    borderRadius: "14px",
    border: "1px solid #D3E5D8",
    backgroundColor: "#EEF6F0",
    color: "#37594D",
    padding: "12px 14px",
    fontSize: "13px",
    lineHeight: 1.55,
    fontWeight: 750,
  },
  error: {
    marginTop: "14px",
    borderRadius: "14px",
    border: "1px solid rgba(185, 28, 28, 0.25)",
    backgroundColor: "rgba(254, 242, 242, 0.9)",
    color: "#7F1D1D",
    padding: "12px 14px",
    fontSize: "13px",
    lineHeight: 1.55,
    fontWeight: 800,
  },
};

export default function AdminLoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from;
    return from && typeof from === "string" ? from : "/admin/dashboard";
  }, [location.state]);

  return (
    <div style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Admin Girişi</h1>
        <p style={styles.subtitle}>
          Yönetim paneline erişmek için giriş yapın.
        </p>

        <label style={styles.label}>Kullanıcı adı</label>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="admin"
          style={styles.input}
        />

        <label style={styles.label}>Şifre</label>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="admin"
          type="password"
          style={styles.input}
        />

        <div style={styles.actionRow}>
          <button type="button" style={styles.secondaryButton} onClick={() => navigate("/")}>
            Ana sayfa
          </button>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => {
              setError(null);
              const ok = adminLogin(username, password);
              if (!ok) {
                setError("Kullanıcı adı veya şifre hatalı. (admin / admin)");
                return;
              }
              navigate(redirectTo, {
                replace: true,
                state: { snackbar: { message: "Admin girişi başarılı.", variant: "success" } },
              });
            }}
          >
            Uygulamaya geç
          </button>
        </div>

        {isAdminAuthenticated() && (
          <div style={styles.message}>Zaten giriş yapılmış. Admin paneline yönlendirilebilirsin.</div>
        )}
        {error && <div style={styles.error}>{error}</div>}
      </section>
    </div>
  );
}
