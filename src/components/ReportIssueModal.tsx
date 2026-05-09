import { type CSSProperties, type FormEvent, useMemo, useState } from "react";
import type { Charger } from "../models/Charger";
import {
  createReport,
  type ReportIssueType,
} from "../services/firebase/reportService";

interface ReportIssueModalProps {
  stationId: string;
  stationName: string;
  charger: Charger | null;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const issueOptions: Array<{ value: ReportIssueType; label: string }> = [
  { value: "charger_not_working", label: "Sarj cihazi calismiyor" },
  { value: "wrong_price", label: "Yanlis ucret" },
  { value: "station_offline", label: "Istasyon cevrimdisi" },
  { value: "location_problem", label: "Konum sorunu" },
  { value: "payment_problem", label: "Odeme sorunu" },
  { value: "other", label: "Diger" },
];

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backgroundColor: "rgba(15, 31, 27, 0.32)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 1400,
  },
  modal: {
    width: "min(560px, 100%)",
    borderRadius: "22px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "20px",
    boxShadow: "0 16px 30px rgba(31,94,77,0.10)",
  },
  topBar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
  },
  titleWrap: {
    minWidth: 0,
  },
  eyebrow: {
    fontSize: "11px",
    fontWeight: 850,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7B8A84",
    marginBottom: "8px",
  },
  title: {
    margin: 0,
    color: "#17231F",
    fontSize: "22px",
    lineHeight: 1.2,
    fontWeight: 850,
  },
  closeButton: {
    minHeight: "40px",
    minWidth: "40px",
    padding: "0 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "14px",
    color: "#1F5E4D",
    fontSize: "14px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  contextCard: {
    borderRadius: "16px",
    padding: "14px",
    backgroundColor: "#F7FBF7",
    border: "1px solid #D8E2DB",
    marginBottom: "14px",
  },
  contextLabel: {
    color: "#7A8982",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  contextValue: {
    marginTop: "6px",
    color: "#17231F",
    fontSize: "14px",
    lineHeight: 1.5,
    fontWeight: 800,
  },
  formGroup: {
    marginBottom: "14px",
  },
  label: {
    display: "block",
    color: "#263A33",
    fontWeight: 800,
    marginBottom: "8px",
    fontSize: "13px",
  },
  input: {
    width: "100%",
    minHeight: "44px",
    padding: "10px 12px",
    border: "1px solid #D8E2DB",
    borderRadius: "12px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    backgroundColor: "#FBFDFB",
    color: "#17231F",
    fontFamily: "inherit",
  },
  textarea: {
    width: "100%",
    minHeight: "108px",
    padding: "10px 12px",
    border: "1px solid #D8E2DB",
    borderRadius: "12px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    backgroundColor: "#FBFDFB",
    color: "#17231F",
    fontFamily: "inherit",
  },
  message: {
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: 1.55,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
    color: "#A63E30",
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  submitButton: {
    minHeight: "44px",
    padding: "10px 12px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  cancelButton: {
    minHeight: "44px",
    padding: "10px 12px",
    border: "1px solid #AFCDBB",
    borderRadius: "12px",
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    fontSize: "14px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  disabledButton: {
    background: "#AEB8B2",
    cursor: "not-allowed",
  },
};

function ReportIssueModal({
  stationId,
  stationName,
  charger,
  onClose,
  onSubmitSuccess,
}: ReportIssueModalProps) {
  const [issueType, setIssueType] = useState<ReportIssueType | "">("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const issueTarget = useMemo(
    () => (charger ? `Sarj cihazi ${charger.id}` : "Istasyon seviyesi sorun"),
    [charger],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDescription = description.trim();

    if (!issueType) {
      setErrorMessage("Sorun turu secilmelidir.");
      return;
    }

    if (!trimmedDescription) {
      setErrorMessage("Aciklama alani bos birakilamaz.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      await createReport({
        stationId,
        chargerId: charger?.id ?? null,
        issueType,
        description: trimmedDescription,
      });

      setIssueType("");
      setDescription("");
      onSubmitSuccess();
      onClose();
    } catch {
      setErrorMessage("Sorun bildirimi kaydedilemedi. Lutfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <section style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.topBar}>
          <div style={styles.titleWrap}>
            <div style={styles.eyebrow}>Sorun Bildirimi</div>
            <h3 style={styles.title}>Istasyon / Sarj Cihazi Sorunu Bildir</h3>
          </div>
          <button
            type="button"
            style={styles.closeButton}
            onClick={onClose}
            disabled={saving}
          >
            Kapat
          </button>
        </div>

        <div style={styles.contextCard}>
          <div style={styles.contextLabel}>Hedef</div>
          <div style={styles.contextValue}>
            {stationName} - {issueTarget}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Sorun Turu</label>
            <select
              value={issueType}
              onChange={(event) => setIssueType(event.target.value as ReportIssueType)}
              style={styles.input}
              disabled={saving}
            >
              <option value="">Sorun turu secin</option>
              {issueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Aciklama</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              style={styles.textarea}
              placeholder="Sorunu detayli sekilde yazin..."
              disabled={saving}
            />
          </div>

          {errorMessage && (
            <div style={styles.message}>
              <span>!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div style={styles.actionRow}>
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(saving ? styles.disabledButton : {}),
              }}
              disabled={saving}
            >
              {saving ? "Gonderiliyor..." : "Gonder"}
            </button>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={onClose}
              disabled={saving}
            >
              Vazgec
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ReportIssueModal;
