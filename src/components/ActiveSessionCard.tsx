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
  livePill: {
    marginLeft: "auto",
    minHeight: "24px",
    padding: "0 9px",
    borderRadius: "999px",
    backgroundColor: "#E9F6E6",
    border: "1px solid #BFE09B",
    color: "#2E6841",
    fontSize: "11px",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
  },
  stationName: {
    margin: "8px 0 4px",
    fontSize: "16px",
    fontWeight: 850,
    color: "#1F5E4D",
    lineHeight: 1.3,
  },
  chargerLabel: {
    margin: "4px 0 10px",
    fontSize: "13px",
    color: "#66756E",
  },
  subtleText: {
    margin: "0 0 12px",
    color: "#7B8A84",
    fontSize: "12px",
    lineHeight: 1.45,
    fontWeight: 700,
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

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function formatMinutes(minutes: number | null | undefined): string {
  if (!Number.isFinite(minutes)) return "--";
  const rounded = Math.max(0, Math.ceil(minutes ?? 0));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours <= 0) return `${mins} dk`;
  return `${hours} sa ${mins} dk`;
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(2)} TL`;
}

function formatEnergy(value: number) {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(2)} kWh`;
}

function ActiveSessionCard() {
  const navigate = useNavigate();
  const { activeSession, loading } = useActiveChargingSession();
  const [station, setStation] = useState<
    (Omit<Station, "chargers"> & { chargerIds: string[] }) | null
  >(null);
  const [charger, setCharger] = useState<Charger | null>(null);
  const [hovered, setHovered] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const liveMetrics = useMemo(() => {
    if (!activeSession) {
      return {
        remainingMinutes: null,
        elapsedMinutes: null,
        progressPercentage: 0,
        currentKwh: 0,
        liveCost: 0,
      };
    }

    const startedAt =
      toDate(activeSession.startTime) ??
      toDate(activeSession.startedAt) ??
      toDate(activeSession.createdAt);
    const totalMinutes =
      activeSession.sessionLimitMinutes ??
      activeSession.estimatedTotalMinutes ??
      null;

    if (!startedAt || !totalMinutes || totalMinutes <= 0) {
      return {
        remainingMinutes: activeSession.estimatedRemainingMinutes ?? null,
        elapsedMinutes: null,
        progressPercentage: activeSession.progressPercentage ?? 0,
        currentKwh: activeSession.currentKwh ?? 0,
        liveCost: activeSession.liveCost ?? 0,
      };
    }

    const elapsedMinutes = Math.max(0, (now - startedAt.getTime()) / 60_000);
    const progressPercentage = Math.min(100, (elapsedMinutes / totalMinutes) * 100);
    const currentKwh =
      activeSession.targetKwh != null
        ? (activeSession.targetKwh * progressPercentage) / 100
        : activeSession.currentKwh ?? 0;
    const liveCost =
      activeSession.pricePerKwh != null
        ? currentKwh * activeSession.pricePerKwh
        : activeSession.liveCost ?? 0;

    return {
      remainingMinutes: Math.max(0, totalMinutes - elapsedMinutes),
      elapsedMinutes,
      progressPercentage,
      currentKwh,
      liveCost,
    };
  }, [activeSession, now]);

  const handleNavigateToSession = () => {
    if (!activeSession) return;

    navigate("/charging-session", {
      state: {
        station: {
          ...(station ?? {
            id: activeSession.stationId,
            name: "Aktif istasyon",
            address: "",
            latitude: 0,
            longitude: 0,
            status: "occupied",
            chargerIds: [],
          }),
          chargers: [],
        } as Station,
        charger:
          charger ??
          ({
            id: activeSession.chargerId,
            stationId: activeSession.stationId,
            type: "DC",
            powerOutput: "50kW",
            connectorType: "CCS",
            pricePerKwh: activeSession.pricePerKwh,
            status: "occupied",
          } as Charger),
        vehicleId: activeSession.vehicleId,
        reservationId: activeSession.reservationId,
        chargingSessionId: activeSession.id,
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

  useEffect(() => {
    if (!activeSession) return undefined;

    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 10_000);

    return () => window.clearInterval(timerId);
  }, [activeSession]);

  if (loading || !activeSession) {
    return null;
  }

  const stationName = station?.name ?? "Aktif sarj istasyonu";
  const chargerLabel = charger
    ? `${charger.connectorType} - ${charger.powerOutput}`
    : "Sarj cihazi bilgisi yukleniyor";

  return (
    <div className="active-session-card" style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.statusDot} />
          <h3 style={styles.title}>Canli Sarj Oturumu</h3>
          <span style={styles.livePill}>Aktif</span>
        </div>

        <div style={styles.stationName}>{stationName}</div>
        <div style={styles.chargerLabel}>{chargerLabel}</div>
        <p style={styles.subtleText}>
          Sayfa degistirseniz bile aktif oturum bilgileri burada gorunur.
        </p>

        <div style={styles.metricsGrid}>
          <div style={styles.metricItem}>
            <div style={styles.metricLabel}>Kalan Sure</div>
            <div style={styles.metricValue}>
              {formatMinutes(liveMetrics.remainingMinutes)}
            </div>
          </div>
          <div style={styles.metricItem}>
            <div style={styles.metricLabel}>Ilerleme</div>
            <div style={styles.metricValue}>
              {Math.round(liveMetrics.progressPercentage)}%
            </div>
          </div>
          <div style={styles.metricItem}>
            <div style={styles.metricLabel}>Gecen Sure</div>
            <div style={styles.metricValue}>
              {formatMinutes(liveMetrics.elapsedMinutes)}
            </div>
          </div>
          <div style={styles.metricItem}>
            <div style={styles.metricLabel}>Tuketim</div>
            <div style={styles.metricValue}>
              {formatEnergy(liveMetrics.currentKwh)}
            </div>
          </div>
          <div style={{ ...styles.metricItem, gridColumn: "1 / -1" }}>
            <div style={styles.metricLabel}>Anlik Tutar</div>
            <div style={styles.metricValue}>{formatMoney(liveMetrics.liveCost)}</div>
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
          .active-session-card {
            bottom: 16px !important;
            right: 12px !important;
          }

          .active-session-card > div {
            min-width: 260px !important;
            max-width: calc(100vw - 32px) !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ActiveSessionCard;
