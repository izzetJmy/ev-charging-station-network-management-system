import { type CSSProperties, useEffect } from "react";

export type SnackbarVariant = "success" | "error" | "info";

export interface SnackbarProps {
  message: string;
  variant?: SnackbarVariant;
  durationMs?: number;
  onClose: () => void;
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    position: "fixed",
    left: "50%",
    bottom: "22px",
    transform: "translateX(-50%)",
    zIndex: 2000,
    width: "min(520px, calc(100% - 32px))",
    pointerEvents: "none",
  },
  bar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid transparent",
    boxShadow: "0 16px 34px rgba(15, 31, 27, 0.16)",
    pointerEvents: "auto",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
  icon: {
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: "12px",
    flex: "0 0 auto",
  },
  text: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.45,
    fontWeight: 800,
    flex: "1 1 auto",
  },
  close: {
    border: "none",
    background: "transparent",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "13px",
    padding: "6px 8px",
    borderRadius: "10px",
  },
  success: {
    backgroundColor: "rgba(239, 248, 231, 0.92)",
    borderColor: "#BFDE9B",
    color: "#2C6642",
  },
  info: {
    backgroundColor: "rgba(238, 246, 240, 0.92)",
    borderColor: "#D3E5D8",
    color: "#37594D",
  },
  error: {
    backgroundColor: "rgba(255, 243, 241, 0.92)",
    borderColor: "#F4B8AE",
    color: "#A63E30",
  },
};

function getVariantStyle(variant: SnackbarVariant) {
  if (variant === "success") return styles.success;
  if (variant === "error") return styles.error;
  return styles.info;
}

function getIcon(variant: SnackbarVariant) {
  if (variant === "success") return "OK";
  if (variant === "error") return "!";
  return "i";
}

export default function Snackbar({
  message,
  variant = "info",
  durationMs = 2600,
  onClose,
}: SnackbarProps) {
  useEffect(() => {
    const timerId = window.setTimeout(() => onClose(), durationMs);
    return () => window.clearTimeout(timerId);
  }, [durationMs, onClose]);

  return (
    <div style={styles.wrap} role="status" aria-live="polite">
      <div style={{ ...styles.bar, ...getVariantStyle(variant) }}>
        <div style={{ ...styles.icon, ...getVariantStyle(variant) }}>
          {getIcon(variant)}
        </div>
        <p style={styles.text}>{message}</p>
        <button type="button" onClick={onClose} style={styles.close}>
          Close
        </button>
      </div>
    </div>
  );
}
