import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Charger } from "../../models/Charger";
import type { Station } from "../../models/Station";
import type { Vehicle } from "../../models/vehicle";
import { getOrCreateLocalUserId } from "../../services/auth/localUser";
import {
  getChargingSessionHistory,
  type ChargingSessionRecord,
} from "../../services/firebase/chargingSessionService";
import { getStationsWithChargers } from "../../services/firebase/stationService";
import { getVehicleById, getVehicleByUserId } from "../../services/firebase/vehicleService";

interface ChargingHistoryLocationState {
  vehicleId?: string;
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#F6F8F4",
    backgroundImage:
      "linear-gradient(90deg, rgba(21, 101, 87, 0.07) 1px, transparent 1px), linear-gradient(180deg, rgba(21, 101, 87, 0.06) 1px, transparent 1px), linear-gradient(135deg, #F6F8F4 0%, #ECF5EE 48%, #F9FBF6 100%)",
    backgroundSize: "34px 34px, 34px 34px, 100% 100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 18px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#17231F",
    boxSizing: "border-box",
  },
  shell: {
    width: "min(1040px, 100%)",
    borderRadius: "28px",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
    backdropFilter: "blur(14px)",
  },
  header: {
    padding: "28px 30px",
    background:
      "linear-gradient(155deg, #10352E 0%, #1F5E4D 48%, #A9D869 140%)",
    color: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
  },
  routeLayer: {
    position: "absolute",
    inset: 0,
    opacity: 0.34,
    backgroundImage:
      "linear-gradient(120deg, transparent 12%, rgba(255,255,255,0.16) 12%, rgba(255,255,255,0.16) 13%, transparent 13%, transparent 52%, rgba(255,255,255,0.14) 52%, rgba(255,255,255,0.14) 53%, transparent 53%), linear-gradient(25deg, transparent 24%, rgba(255,255,255,0.12) 24%, rgba(255,255,255,0.12) 25%, transparent 25%)",
    backgroundSize: "240px 220px, 190px 180px",
  },
  headerContent: { position: "relative", zIndex: 1 },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "999px",
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  signalDot: {
    width: "8px",
    height: "8px",
    borderRadius: "999px",
    backgroundColor: "#B8F061",
    boxShadow: "0 0 16px rgba(184,240,97,0.9)",
  },
  title: {
    margin: "18px 0 8px",
    fontSize: "34px",
    fontWeight: 900,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: 0,
    maxWidth: "560px",
    color: "rgba(255,255,255,0.78)",
    fontSize: "14px",
    lineHeight: 1.7,
  },
  body: { padding: "26px 30px 30px" },
  card: {
    borderRadius: "22px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "18px",
    boxShadow: "0 12px 28px rgba(31,94,77,0.06)",
  },
  vehicleInfo: {
    borderRadius: "18px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "14px",
    color: "#17231F",
    marginBottom: "14px",
  },
  vehicleLabel: {
    color: "#7A8982",
    fontSize: "11px",
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  vehicleValue: { marginTop: "6px", fontSize: "16px", fontWeight: 950 },
  list: { display: "grid", gap: "12px" },
  item: {
    borderRadius: "18px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "14px",
  },
  itemTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },
  itemTitle: { margin: 0, fontSize: "15px", fontWeight: 950 },
  itemMeta: {
    marginTop: "6px",
    color: "#66756E",
    fontSize: "13px",
    lineHeight: 1.55,
    fontWeight: 700,
  },
  badge: {
    borderRadius: "999px",
    border: "1px solid #BFDE9B",
    backgroundColor: "#EFF8E7",
    color: "#2C6642",
    padding: "8px 10px",
    fontSize: "12px",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    marginTop: "12px",
  },
  detailCell: {
    borderRadius: "14px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#F7FBF7",
    padding: "10px",
  },
  detailLabel: {
    color: "#7A8982",
    fontSize: "10px",
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  detailValue: {
    marginTop: "5px",
    color: "#17231F",
    fontSize: "13px",
    lineHeight: 1.4,
    fontWeight: 900,
  },
  empty: {
    borderRadius: "18px",
    border: "1px dashed #AFCDBB",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(239,247,240,0.92))",
    padding: "18px",
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.7,
    textAlign: "center",
  },
  actionRow: {
    marginTop: "16px",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
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
};

function formatCreatedAt(createdAt: unknown) {
  const date = (createdAt as { toDate?: () => Date } | null)?.toDate?.() ?? null;
  if (!date) return "--";

  return `${String(date.getDate()).padStart(2, "0")}.${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}.${date.getFullYear()} ${String(date.getHours()).padStart(
    2,
    "0",
  )}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatNumber(value: unknown, suffix = "") {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "--";
  return `${numeric.toFixed(2)}${suffix}`;
}

export default function ChargingHistoryScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = useMemo(() => getOrCreateLocalUserId(), []);
  const locationState = (location.state as ChargingHistoryLocationState | null) ?? null;
  const requestedVehicleId = locationState?.vehicleId ?? "";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [sessions, setSessions] = useState<ChargingSessionRecord[]>([]);
  const [stationsById, setStationsById] = useState<Record<string, Station>>({});
  const [chargersById, setChargersById] = useState<Record<string, Charger>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const resolved = requestedVehicleId
          ? await getVehicleById(requestedVehicleId)
          : await getVehicleByUserId(userId);
        setVehicle(resolved);
      } catch {
        setVehicle(null);
      } finally {
        setVehicleLoading(false);
      }
    };

    void loadVehicle();
  }, [requestedVehicleId, userId]);

  useEffect(() => {
    let cancelled = false;

    getStationsWithChargers()
      .then((stations) => {
        if (cancelled) return;
        const stationMap: Record<string, Station> = {};
        const chargerMap: Record<string, Charger> = {};
        for (const station of stations) {
          stationMap[station.id] = station;
          for (const charger of station.chargers ?? []) {
            chargerMap[charger.id] = charger;
          }
        }
        setStationsById(stationMap);
        setChargersById(chargerMap);
      })
      .catch(() => {
        if (cancelled) return;
        setStationsById({});
        setChargersById({});
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadSessions = async () => {
      if (!vehicle?.id) {
        setSessions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getChargingSessionHistory({
          userId,
          vehicleId: vehicle.id,
        });
        setSessions(result);
      } catch {
        setError("Charging history could not be loaded. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    void loadSessions();
  }, [userId, vehicle?.id]);

  const headerTitle = useMemo(() => {
    const name = [vehicle?.brand?.trim(), vehicle?.model?.trim()].filter(Boolean).join(" ");
    return name || "Charging Gecmisi";
  }, [vehicle?.brand, vehicle?.model]);

  return (
    <div style={styles.page}>
      <main style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.routeLayer} aria-hidden="true" />
          <div style={styles.headerContent}>
            <div style={styles.eyebrow}>
              <span style={styles.signalDot} />
              EV Network
            </div>
            <h1 style={styles.title}>Charging Gecmisi</h1>
            <p style={styles.subtitle}>
              Completed charging session records in Firestore are listed with station,
              energy, cost, and date details.
            </p>
          </div>
        </header>

        <section style={styles.body}>
          <div style={styles.card}>
            <div style={styles.vehicleInfo}>
              <div style={styles.vehicleLabel}>Vehicle</div>
              <div style={styles.vehicleValue}>
                {vehicleLoading ? "Loading..." : headerTitle}
              </div>
            </div>

            {error && <div style={styles.empty}>{error}</div>}

            {!error && loading && <div style={styles.empty}>Charging pasti yukleniyor...</div>}

            {!error && !loading && sessions.length === 0 && (
              <div style={styles.empty}>There are no saved charging sessions for this vehicle.</div>
            )}

            {!error && sessions.length > 0 && (
              <div style={styles.list}>
                {sessions.map((session) => {
                  const station = stationsById[session.stationId] ?? null;
                  const charger = chargersById[session.chargerId] ?? null;
                  const stationName = station?.name ?? session.stationId;
                  const stationAddress = station?.address ?? "Station address could not be found";
                  const chargerInfo = charger
                    ? `${charger.connectorType} - ${charger.powerOutput} - ${charger.type}`
                    : session.chargerId;
                  const dateLabel = formatCreatedAt(session.completedAt ?? session.createdAt);

                  return (
                    <article key={session.id} style={styles.item}>
                      <div style={styles.itemTop}>
                        <div>
                          <p style={styles.itemTitle}>{stationName}</p>
                          <div style={styles.itemMeta}>
                            Session: {session.id}
                            <br />
                            Charging cihazi: {chargerInfo}
                            <br />
                            Date: {dateLabel}
                            <br />
                            Address: {stationAddress}
                          </div>
                        </div>
                        <div style={styles.badge}>
                          {formatNumber(session.totalCost, " TL")}
                        </div>
                      </div>

                      <div
                        className="charging-history-detail-grid"
                        style={styles.detailGrid}
                      >
                        <div style={styles.detailCell}>
                          <div style={styles.detailLabel}>Energy consumed</div>
                          <div style={styles.detailValue}>
                            {formatNumber(session.consumedKwh, " kWh")}
                          </div>
                        </div>
                        <div style={styles.detailCell}>
                          <div style={styles.detailLabel}>Total cost</div>
                          <div style={styles.detailValue}>
                            {formatNumber(session.totalCost, " TL")}
                          </div>
                        </div>
                        <div style={styles.detailCell}>
                          <div style={styles.detailLabel}>Battery</div>
                          <div style={styles.detailValue}>
                            {session.startBatteryPercentage ?? "--"}% -{" "}
                            {session.endBatteryPercentage ??
                              session.targetBatteryPercentage ??
                              "--"}
                            %
                          </div>
                        </div>
                        <div style={styles.detailCell}>
                          <div style={styles.detailLabel}>Unit price</div>
                          <div style={styles.detailValue}>
                            {formatNumber(session.pricePerKwh, " TL/kWh")}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div style={styles.actionRow}>
              <button type="button" style={styles.secondaryButton} onClick={() => navigate(-1)}>
                Back
              </button>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @media (max-width: 760px) {
          .charging-history-detail-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (max-width: 520px) {
          .charging-history-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
