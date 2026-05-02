import { type CSSProperties } from "react";
import { STATION_STATUS_COLORS } from "../constants/mapConstants";
import type { Charger } from "../models/Charger";
import type { Station } from "../models/Station";
import type { Vehicle } from "../models/vehicle";
import { checkVehicleChargerCompatibility } from "../utils/chargerCompatibility";

interface ChargerItemProps {
  charger: Charger;
  station: Station;
  vehicle: Vehicle | null;
  onReserve?: (charger: Charger) => void;
  onReportIssue?: (charger: Charger) => void;
}

const styles: Record<string, CSSProperties> = {
  card: {
    borderRadius: "18px",
    padding: "14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #D8E2DB",
    boxShadow: "0 10px 24px rgba(31,94,77,0.06)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "12px",
  },
  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "32px",
    padding: "0 12px",
    borderRadius: "999px",
    backgroundColor: "#E8F4DD",
    color: "#1F5E4D",
    fontSize: "12px",
    fontWeight: 850,
    letterSpacing: "0.04em",
  },
  statusRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    boxShadow: "0 0 0 4px rgba(31,94,77,0.08)",
  },
  statusText: {
    color: "#465850",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "capitalize",
  },
  compatibilityBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "30px",
    padding: "0 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 850,
    marginBottom: "12px",
    border: "1px solid transparent",
  },
  compatibilityCompatible: {
    backgroundColor: "#EFF8E7",
    borderColor: "#BFDE9B",
    color: "#2C6642",
  },
  compatibilityBlocked: {
    backgroundColor: "#FFF3F1",
    borderColor: "#F4B8AE",
    color: "#A63E30",
  },
  compatibilityMuted: {
    backgroundColor: "#FFF8E8",
    borderColor: "#F0D488",
    color: "#8A6500",
  },
  specGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  specItem: {
    borderRadius: "14px",
    padding: "10px 12px",
    backgroundColor: "#F7FBF7",
    border: "1px solid #E3ECE5",
  },
  label: {
    color: "#7A8982",
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  value: {
    marginTop: "5px",
    color: "#17231F",
    fontSize: "14px",
    fontWeight: 800,
    lineHeight: 1.4,
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "12px",
  },
  reserveButton: {
    minHeight: "40px",
    padding: "10px 12px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    fontSize: "12px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  reportButton: {
    minHeight: "40px",
    padding: "10px 12px",
    border: "1px solid #AFCDBB",
    borderRadius: "12px",
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    fontSize: "12px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

function ChargerItem({
  charger,
  station,
  vehicle,
  onReserve,
  onReportIssue,
}: ChargerItemProps) {
  const compatibility = checkVehicleChargerCompatibility(
    vehicle,
    charger,
    station,
  );

  const compatibilityStyle =
    compatibility.state === "compatible"
      ? styles.compatibilityCompatible
      : compatibility.state === "not-compatible"
        ? styles.compatibilityBlocked
        : styles.compatibilityMuted;

  return (
    <article className="charger-item-card" style={styles.card}>
      <div style={styles.topRow}>
        <div style={styles.typeBadge}>{charger.type}</div>

        <div style={styles.statusRow}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: STATION_STATUS_COLORS[charger.status],
            }}
          />
          <span style={styles.statusText}>{charger.status}</span>
        </div>
      </div>

      <div style={{ ...styles.compatibilityBadge, ...compatibilityStyle }}>
        {compatibility.reason}
      </div>

      <div style={styles.specGrid}>
        <div style={styles.specItem}>
          <div style={styles.label}>Power Output</div>
          <div style={styles.value}>{charger.powerOutput}</div>
        </div>

        <div style={styles.specItem}>
          <div style={styles.label}>Connector</div>
          <div style={styles.value}>{charger.connectorType}</div>
        </div>

        <div style={styles.specItem}>
          <div style={styles.label}>Price per kWh</div>
          <div style={styles.value}>{charger.pricePerKwh.toFixed(2)} TL</div>
        </div>

        <div style={styles.specItem}>
          <div style={styles.label}>Charger ID</div>
          <div style={styles.value}>{charger.id}</div>
        </div>
      </div>

      {(onReserve || onReportIssue) && (
        <div style={styles.actionRow}>
          <button
            type="button"
            style={styles.reserveButton}
            onClick={() => onReserve?.(charger)}
            disabled={!onReserve}
          >
            Rezerve Et
          </button>
          <button
            type="button"
            style={styles.reportButton}
            onClick={() => onReportIssue?.(charger)}
            disabled={!onReportIssue}
          >
            Sorun Bildir
          </button>
        </div>
      )}

      <style>{`
        .charger-item-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(31,94,77,0.10);
        }
      `}</style>
    </article>
  );
}

export default ChargerItem;
