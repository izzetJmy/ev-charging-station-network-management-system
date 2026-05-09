import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveChargingSession } from "../hooks/useActiveChargingSession";
import type { Station } from "../models/Station";
import type { Charger } from "../models/Charger";
import { getStationById } from "../services/firebase/stationService";
import { getChargerById } from "../services/firebase/chargerService";

const styles: Record<string, CSSProperties> = {
  container: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 9998,
  },
  card: {
    borderRadius: "16px",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    border: "1px solid rgba(31, 94, 77, 0.2)",
    boxShadow: "0 16px 48px rgba(28, 74, 61, 0.22)",
    backdropFilter: "blur(12px)",
    padding: "16px",
    minWidth: "280px",
    maxWidth: "360px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    backgroundColor: "#B8F061",
    boxShadow: "0 0 12px rgba(184, 240, 97, 0.8)",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    color: "#17231F",
  },
  stationName: {
    margin: "8px 0 4px",
    fontSize: "16px",
    fontWeight: 850,
    color: "#1F5E4D",
    lineHeight: 1.3,
  },
  chargerLabel: {
    margin: "4px 0 12px",
    fontSize: "13px",
    color: "#66756E",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "12px",
  },
  metricItem: {
    borderRadius: "12px",
    backgroundColor: "#F0F4F2",
    border: "1px solid rgba(31, 94, 77, 0.1)",
    padding: "10px",
  },
  metricLabel: {
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#7B8A84",
    marginBottom: "4px",
  },
  metricValue: {
    fontSize: "14px",
    fontWeight: 850,
    color: "#1F5E4D",
  },
  button: {
    width: "100%",
    minHeight: "40px",
    padding: "10px 14px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    border: "none",
    borderRadius: "12px",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 850,
    cursor: "pointer",
    boxShadow: "0 8px 16px rgba(31, 94, 77, 0.22)",
    fontFamily: "inherit",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  buttonHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 12px 24px rgba(31, 94, 77, 0.28)",
  },
};

function formatMinutes(minutes: number | null | undefined): string {
  if (!Number.isFinite(minutes)) return "--";
  const rounded = Math.max(0, Math.ceil(minutes ?? 0));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours <= 0) return `${mins} dk`;
  return `${hours} sa ${mins} dk`;
}

function ActiveSessionCard() {
  const navigate = useNavigate();
  const { activeSession, loading } = useActiveChargingSession();
  const [station, setStation] = useState<(Omit<Station, "chargers"> & { chargerIds: string[] }) | null>(null);
  const [charger, setCharger] = useState<Charger | null>(null);
  const [hovered, setHovered] = useState(false);

  const remainingTime = useMemo(() => {
    if (!activeSession) return null;
    return formatMinutes(activeSession.estimatedRemainingMinutes);
  }, [activeSession]);

  const handleNavigateToSession = () => {
    if (!activeSession || !station || !charger) return;

    navigate("/charging-session", {
      state: {
        station: {
          ...station,
          chargers: [],
        } as Station,
        charger,
        vehicleId: activeSession.vehicleId,
        reservationId: activeSession.reservationId,
      },
    });
  };

  useEffect(() => {
    if (!activeSession) {
      setStation(null);
      setCharger(null);
      return undefined;
    }

    let cancelled = false;

    const loadStationAndCharger = async () => {
      try {
        const [s, c] = await Promise.all([
          getStationById(activeSession.stationId),
          getChargerById(activeSession.chargerId),
        ]);

        if (!cancelled) {
          setStation(s);
          setCharger(c);
        }
      } catch {
        if (!cancelled) {
          setStation(null);
          setCharger(null);
        }
      }
    };

    void loadStationAndCharger();

    return () => {
      cancelled = true;
    };
  }, [activeSession]);

  if (loading || !activeSession || !station || !charger) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.statusDot} />
          <h3 style={styles.title}>Canli Sarj Oturumu</h3>
        </div>

        <div style={styles.stationName}>{station.name}</div>
        <div style={styles.chargerLabel}>
          {charger.connectorType} • {charger.powerOutput}
        </div>

        <div style={styles.metricsGrid}>
          <div style={styles.metricItem}>
            <div style={styles.metricLabel}>Kalan Sure</div>
            <div style={styles.metricValue}>{remainingTime}</div>
          </div>
          <div style={styles.metricItem}>
            <div style={styles.metricLabel}>Ilerleme</div>
            <div style={styles.metricValue}>
              {Math.round(activeSession.progressPercentage ?? 0)}%
            </div>
          </div>
        </div>

        <button
          type="button"
          style={{
            ...styles.button,
            ...(hovered ? styles.buttonHover : {}),
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={handleNavigateToSession}
        >
          Oturuma Don
        </button>
      </div>

      <style>{`
        @media (max-width: 480px) {
          [style*="position: fixed"] {
            bottom: 16px !important;
            right: 12px !important;
          }

          [style*="minWidth: 280px"] {
            min-width: 260px !important;
            max-width: calc(100vw - 32px) !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ActiveSessionCard;
