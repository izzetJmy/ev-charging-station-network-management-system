import { type CSSProperties } from "react";
import ChargerItem from "./ChargerItem";
import { STATION_STATUS_COLORS } from "../constants/mapConstants";
import type { Station } from "../models/station";
import type { Vehicle } from "../models/vehicle";
import {
  calculateDistanceInKilometers,
  type UserCoordinates,
} from "../services/maps/locationService";

interface StationDetailCardProps {
  station: Station;
  vehicle: Vehicle | null;
  currentLocation: UserCoordinates | null;
  onClose: () => void;
}

const styles: Record<string, CSSProperties> = {
  card: {
    marginTop: "16px",
    borderRadius: "22px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "18px",
    boxShadow: "0 16px 30px rgba(31,94,77,0.10)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  topBar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "14px",
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
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  infoCard: {
    borderRadius: "16px",
    padding: "14px",
    backgroundColor: "#F7FBF7",
    border: "1px solid #D8E2DB",
  },
  infoCardWide: {
    gridColumn: "1 / -1",
  },
  label: {
    color: "#7A8982",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  value: {
    marginTop: "6px",
    color: "#17231F",
    fontSize: "15px",
    lineHeight: 1.55,
    fontWeight: 800,
  },
  statusRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
  },
  statusDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    boxShadow: "0 0 0 4px rgba(31,94,77,0.08)",
  },
  chargerSection: {
    marginTop: "18px",
  },
  sectionTitle: {
    margin: "0 0 12px",
    color: "#17231F",
    fontSize: "18px",
    lineHeight: 1.25,
    fontWeight: 850,
  },
  chargerGrid: {
    display: "grid",
    gap: "12px",
  },
  emptyState: {
    borderRadius: "16px",
    padding: "14px",
    backgroundColor: "#F7FBF7",
    border: "1px dashed #CFE0D4",
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.6,
  },
};

function formatDistance(
  currentLocation: UserCoordinates | null,
  station: Station,
) {
  if (!currentLocation) {
    return "--";
  }

  const distanceInKilometers = calculateDistanceInKilometers(currentLocation, {
    latitude: station.latitude,
    longitude: station.longitude,
  });

  if (distanceInKilometers < 1) {
    return `${Math.round(distanceInKilometers * 1000)} m`;
  }

  return `${distanceInKilometers.toFixed(1)} km`;
}

function StationDetailCard({
  station,
  vehicle,
  currentLocation,
  onClose,
}: StationDetailCardProps) {
  return (
    <section className="station-detail-card" style={styles.card}>
      <div style={styles.topBar}>
        <div style={styles.titleWrap}>
          <div style={styles.eyebrow}>Secili Istasyon</div>
          <h3 style={styles.title}>{station.name}</h3>
        </div>

        <button type="button" onClick={onClose} style={styles.closeButton}>
          Kapat
        </button>
      </div>

      <div style={styles.infoGrid}>
        <div style={{ ...styles.infoCard, ...styles.infoCardWide }}>
          <div style={styles.label}>Address</div>
          <div style={styles.value}>{station.address}</div>
        </div>

        <div style={styles.infoCard}>
          <div style={styles.label}>Status</div>
          <div style={{ ...styles.value, ...styles.statusRow }}>
            <span
              style={{
                ...styles.statusDot,
                backgroundColor: STATION_STATUS_COLORS[station.status],
              }}
            />
            <span style={{ textTransform: "capitalize" }}>{station.status}</span>
          </div>
        </div>

        <div style={styles.infoCard}>
          <div style={styles.label}>Coordinates</div>
          <div style={styles.value}>
            {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)}
          </div>
        </div>

        <div style={styles.infoCard}>
          <div style={styles.label}>Distance</div>
          <div style={styles.value}>
            {formatDistance(currentLocation, station)}
          </div>
        </div>
      </div>

      <div style={styles.chargerSection}>
        <h4 style={styles.sectionTitle}>Charger List</h4>

        {station.chargers.length > 0 ? (
          <div style={styles.chargerGrid}>
            {station.chargers.map((charger) => (
              <ChargerItem
                key={charger.id}
                charger={charger}
                station={station}
                vehicle={vehicle}
              />
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            Bu istasyon icin gosterilecek charger bilgisi bulunamadi.
          </div>
        )}
      </div>

      <style>{`
        .station-detail-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 34px rgba(31,94,77,0.12);
        }
      `}</style>
    </section>
  );
}

export default StationDetailCard;
