import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";
import ReservationManagementPanel from "../../components/ReservationManagementPanel";
import type { Vehicle } from "../../models/vehicle";
import { getOrCreateLocalUserId } from "../../services/auth/localUser";
import { getVehiclesByUserId } from "../../services/firebase/userService";

interface ReservationsLocationState {
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
    justifyContent: "center",
    padding: "32px 18px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#17231F",
    boxSizing: "border-box",
  },
  shell: {
    width: "min(1120px, 100%)",
    borderRadius: "28px",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
    backdropFilter: "blur(14px)",
  },
  header: {
    padding: "26px 30px",
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
  headerContent: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "16px",
    alignItems: "start",
  },
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
    maxWidth: "620px",
    color: "rgba(255,255,255,0.78)",
    fontSize: "14px",
    lineHeight: 1.7,
  },
  body: {
    padding: "24px 30px 30px",
  },
  topBar: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "14px",
    alignItems: "center",
    marginBottom: "18px",
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  filterButton: {
    minHeight: "42px",
    padding: "0 14px",
    border: "1px solid #D8E2DB",
    borderRadius: "14px",
    backgroundColor: "#FFFFFF",
    color: "#263A33",
    fontSize: "13px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  filterButtonActive: {
    borderColor: "#1F5E4D",
    backgroundColor: "#EAF6E7",
    color: "#1F5E4D",
    boxShadow: "0 0 0 3px rgba(31,94,77,0.12)",
  },
  backButton: {
    minHeight: "42px",
    padding: "0 16px",
    border: "1px solid #AFCDBB",
    borderRadius: "14px",
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    fontSize: "13px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  message: {
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: 1.55,
    backgroundColor: "#EEF6F0",
    border: "1px solid #D3E5D8",
    color: "#37594D",
    fontWeight: 700,
  },
  panelStack: {
    display: "grid",
    gap: "16px",
  },
};

function getVehicleDisplayName(vehicle: Vehicle) {
  const name = [vehicle.brand?.trim(), vehicle.model?.trim()]
    .filter(Boolean)
    .join(" ");
  return name || "--";
}

function getVehiclePanelDescription(vehicle: Vehicle, t: (key: string, vars?: Record<string, string | number>) => string) {
  const plate = vehicle.plateNumber?.trim().toUpperCase() || "--";
  const connector = vehicle.connectorType || "--";
  return t("userReservations.panelDescription", { plate, connector });
}

function UserReservationsScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state ?? {}) as ReservationsLocationState;
  const userId = useMemo(() => getOrCreateLocalUserId(), []);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(routeState.vehicleId ?? "all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const visibleVehicles = useMemo(() => {
    if (selectedVehicleId === "all") return vehicles;
    return vehicles.filter((vehicle) => vehicle.id === selectedVehicleId);
  }, [selectedVehicleId, vehicles]);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getVehiclesByUserId(userId);
        setVehicles(result);

        if (
          routeState.vehicleId &&
          result.some((vehicle) => vehicle.id === routeState.vehicleId)
        ) {
          setSelectedVehicleId(routeState.vehicleId);
        } else {
          setSelectedVehicleId("all");
        }
      } catch {
        setError(t("userReservations.vehicleDataLoadFailed"));
      } finally {
        setLoading(false);
      }
    };

    void loadVehicles();
  }, [routeState.vehicleId, t, userId]);

  return (
    <div style={styles.page}>
      <main className="user-reservations-shell" style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.routeLayer} aria-hidden="true" />
          <div className="user-reservations-header" style={styles.headerContent}>
            <div>
              <div style={styles.eyebrow}>
                <span style={styles.signalDot} />
                {t("userReservations.eyebrow")}
              </div>
              <h1 style={styles.title}>{t("userReservations.title")}</h1>
              <p style={styles.subtitle}>{t("userReservations.subtitle")}</p>
            </div>
            <button
              type="button"
              style={styles.backButton}
              onClick={() => navigate("/app")}
            >
              {t("userReservations.backButton")}
            </button>
          </div>
        </header>

        <section style={styles.body}>
          {loading ? (
            <div style={styles.message}>{t("userReservations.loading")}</div>
          ) : error ? (
            <div style={styles.message}>{error}</div>
          ) : vehicles.length === 0 ? (
            <div style={styles.message}>{t("userReservations.noVehicles")}</div>
          ) : (
            <>
              <div className="user-reservations-topbar" style={styles.topBar}>
                <div style={styles.filterRow} aria-label={t("userReservations.vehicleFilterAria")}>
                  <button
                    type="button"
                    style={{
                      ...styles.filterButton,
                      ...(selectedVehicleId === "all" ? styles.filterButtonActive : {}),
                    }}
                    onClick={() => setSelectedVehicleId("all")}
                  >
                    {t("userReservations.allVehicles")}
                  </button>

                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      type="button"
                      style={{
                        ...styles.filterButton,
                        ...(selectedVehicleId === vehicle.id
                          ? styles.filterButtonActive
                          : {}),
                      }}
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                    >
                      {getVehicleDisplayName(vehicle)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.panelStack}>
                {visibleVehicles.map((vehicle) => (
                  <ReservationManagementPanel
                    key={vehicle.id}
                    vehicleId={vehicle.id}
                    vehicleConnectorType={vehicle.connectorType}
                    title={t("userReservations.reservationsTitle", { vehicleName: getVehicleDisplayName(vehicle) })}
                    description={getVehiclePanelDescription(vehicle, t)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <style>{`
        @media (max-width: 760px) {
          .user-reservations-header,
          .user-reservations-topbar {
            grid-template-columns: 1fr !important;
          }

          .user-reservations-shell {
            border-radius: 18px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default UserReservationsScreen;
