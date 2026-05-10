import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Vehicle } from "../../models/vehicle";
import { getVehiclesByUserId } from "../../services/firebase/userService";
import {
  clearCurrentUserSession,
  getCurrentUserSession,
  getOrCreateLocalUserId,
} from "../../services/auth/localUser";
import { reverseGeocodeCoordinates } from "../../services/maps/geocodingService";
import WalletPanel from "../../components/WalletPanel";
import { useI18n } from "../../i18n/I18nProvider";

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
  shell: {
    width: "min(980px, 100%)",
    borderRadius: "28px",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
    backdropFilter: "blur(14px)",
  },
  header: {
    backgroundColor: "#0E352D",
    color: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
  },
  headerTop: {
    position: "relative",
    zIndex: 2,
    padding: "22px 30px 18px",
    background:
      "linear-gradient(155deg, rgba(16,53,46,1) 0%, rgba(31,94,77,1) 70%, rgba(31,94,77,0.92) 100%)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  headerTopActions: {
    zIndex: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },
  headerMedia: {
    position: "relative",
    height: "260px",
    overflow: "hidden",
  },
  headerEyebrow: {
    position: "absolute",
    top: "18px",
    left: "18px",
    zIndex: 3,
  },
  headerArtwork: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center 58%",
    opacity: 1,
    filter: "saturate(1.08) contrast(1.02)",
    pointerEvents: "none",
  },
  headerLayer: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(12, 35, 30, 0.62) 0%, rgba(12, 35, 30, 0.34) 48%, rgba(12, 35, 30, 0.12) 100%)",
  },
  headerPattern: {
    position: "absolute",
    inset: 0,
    opacity: 0.22,
    backgroundImage:
      "linear-gradient(120deg, transparent 12%, rgba(255,255,255,0.16) 12%, rgba(255,255,255,0.16) 13%, transparent 13%, transparent 52%, rgba(255,255,255,0.14) 52%, rgba(255,255,255,0.14) 53%, transparent 53%), linear-gradient(25deg, transparent 24%, rgba(255,255,255,0.12) 24%, rgba(255,255,255,0.12) 25%, transparent 25%)",
    backgroundSize: "240px 220px, 190px 180px",
  },
  headerContent: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
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
    width: "fit-content",
  },
  signalDot: {
    width: "8px",
    height: "8px",
    borderRadius: "999px",
    backgroundColor: "#B8F061",
    boxShadow: "0 0 16px rgba(184,240,97,0.9)",
  },
  title: {
    margin: "0",
    fontSize: "34px",
    lineHeight: 1.12,
    fontWeight: 900,
    letterSpacing: "-0.02em",
    textShadow: "0 18px 34px rgba(0,0,0,0.35)",
    textAlign: "left",
  },
  subtitle: {
    margin: 0,
    maxWidth: "420px",
    color: "rgba(255,255,255,0.78)",
    fontSize: "14px",
    lineHeight: 1.7,
    textShadow: "0 14px 26px rgba(0,0,0,0.32)",
  },
  body: {
    padding: "26px 30px 30px",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  listTitleRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
  },
  listTitleRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },
  listSubtitle: {
    margin: "-6px 0 14px",
    color: "#66756E",
    fontSize: "13px",
    lineHeight: 1.6,
    maxWidth: "620px",
    textAlign: "left",
  },
  listTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#66756E",
  },
  counter: {
    fontSize: "12px",
    fontWeight: 850,
    color: "#7A8982",
  },
  userPill: {
    minHeight: "42px",
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.20)",
    borderRadius: "14px",
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 900,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  vehicleList: {
    display: "grid",
    gap: "10px",
  },
  vehicleButton: {
    width: "100%",
    textAlign: "left",
    borderRadius: "16px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "14px 14px 13px",
    color: "#17231F",
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 10px 24px rgba(31,94,77,0.06)",
    transition:
      "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
  },
  vehicleCard: {
    borderRadius: "16px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "12px",
    color: "#17231F",
    boxShadow: "0 10px 24px rgba(31,94,77,0.06)",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    alignItems: "center",
    transition:
      "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
  },
  vehicleMainButton: {
    width: "100%",
    textAlign: "left",
    border: "none",
    backgroundColor: "transparent",
    padding: "2px",
    color: "#17231F",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  vehicleButtonActive: {
    borderColor: "#1F5E4D",
    boxShadow: "0 0 0 3px rgba(31,94,77,0.14), 0 16px 30px rgba(31,94,77,0.10)",
    transform: "translateY(-1px)",
  },
  compactButton: {
    minHeight: "42px",
    padding: "10px 12px",
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
  vehicleActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },
  vehicleName: {
    display: "block",
    fontSize: "14px",
    fontWeight: 900,
    letterSpacing: "-0.01em",
  },
  vehicleMeta: {
    display: "block",
    marginTop: "6px",
    color: "#66756E",
    fontSize: "12px",
    fontWeight: 700,
  },
  emptyMessage: {
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: 1.55,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#EEF6F0",
    border: "1px solid #D3E5D8",
    color: "#37594D",
    fontWeight: 700,
  },
  footerActions: {
    marginTop: "18px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  primaryButton: {
    minHeight: "50px",
    padding: "12px 14px",
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 12px 24px rgba(31,94,77,0.22)",
  },
  secondaryButton: {
    minHeight: "50px",
    padding: "12px 14px",
    border: "1px solid #AFCDBB",
    borderRadius: "16px",
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    fontSize: "14px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backgroundColor: "rgba(15, 31, 27, 0.30)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    zIndex: 1400,
  },
  modal: {
    width: "min(720px, 100%)",
    maxHeight: "80vh",
    overflowY: "auto",
    borderRadius: "22px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "18px",
    boxShadow: "0 20px 42px rgba(31,94,77,0.16)",
  },
  modalTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 950,
    letterSpacing: "-0.01em",
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
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "12px",
  },
  infoItem: {
    borderRadius: "16px",
    padding: "14px",
    backgroundColor: "#F7FBF7",
    border: "1px solid #E3ECE5",
  },
  infoLabel: {
    color: "#7A8982",
    fontSize: "11px",
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  infoValue: {
    marginTop: "6px",
    color: "#17231F",
    fontSize: "15px",
    lineHeight: 1.5,
    fontWeight: 900,
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "14px",
  },
};

function getVehicleDisplayName(vehicle: Vehicle) {
  const name = [vehicle.brand?.trim(), vehicle.model?.trim()]
    .filter(Boolean)
    .join(" ");
  return name || "Saved vehicle";
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function VehicleHomeScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const userId = useMemo(() => getOrCreateLocalUserId(), []);
  const session = useMemo(() => getCurrentUserSession(), []);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [headerArtworkSrc, setHeaderArtworkSrc] = useState(
    "/Vehicle_Profile_Image.png",
  );
  const [selectedVehicleLocationLabel, setSelectedVehicleLocationLabel] =
    useState("");

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getVehiclesByUserId(userId);
        setVehicles(result);
        setSelectedVehicleId(result[0]?.id ?? "");
      } catch {
        setError(t("errors.vehicleListLoadFailed"));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [userId]);

  useEffect(() => {
    let isCancelled = false;

    const resolveLocationLabel = async () => {
      const location = selectedVehicle?.currentLocation ?? null;
      if (
        !location ||
        typeof location.latitude !== "number" ||
        typeof location.longitude !== "number"
      ) {
        setSelectedVehicleLocationLabel("");
        return;
      }

      setSelectedVehicleLocationLabel(t("vehicleHome.resolvingLocation"));
      const result = await reverseGeocodeCoordinates({
        lat: location.latitude,
        lng: location.longitude,
      });
      if (isCancelled) return;
      setSelectedVehicleLocationLabel(result?.label ?? "");
    };

    void resolveLocationLabel();

    return () => {
      isCancelled = true;
    };
  }, [selectedVehicle?.currentLocation, selectedVehicle?.id]);

  const handleGoToMap = () => {
    if (!selectedVehicleId) return;
    navigate("/station-map", { state: { vehicleId: selectedVehicleId } });
    setIsDetailOpen(false);
  };

  const handleEditVehicle = () => {
    if (!selectedVehicleId) return;
    navigate(`/vehicles/${selectedVehicleId}/edit`);
    setIsDetailOpen(false);
  };

  const handleOpenHistoryForVehicle = (vehicleId: string) => {
    navigate("/charging-history", { state: { vehicleId } });
  };

  const handleOpenReservations = () => {
    navigate("/my-reservations");
    setIsDetailOpen(false);
  };

  const handleOpenReservationsForVehicle = (vehicleId: string) => {
    navigate("/my-reservations", { state: { vehicleId } });
  };

  const handleCreateVehicle = () => {
    navigate("/vehicles/new");
  };

  const handleLogout = () => {
    clearCurrentUserSession();
    navigate("/");
  };

  return (
    <div style={styles.page}>
      <main className="vehicle-home-shell" style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>{t("vehicleHome.title")}</h1>
            <div style={styles.headerTopActions}>
              {session && <div style={styles.userPill}>@{session.username}</div>}
              <WalletPanel userId={userId} variant="header" />
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={handleOpenReservations}
              >
                {t("vehicleHome.myReservations")}
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={handleLogout}
              >
                {t("vehicleHome.logout")}
              </button>
            </div>
          </div>

          <div style={styles.headerMedia} aria-hidden="true">
            <div style={styles.headerEyebrow}>
              <div style={styles.eyebrow}>
                <span style={styles.signalDot} />
                {t("app.name")}
              </div>
            </div>
            <img
              src={headerArtworkSrc}
              alt=""
              aria-hidden="true"
              style={styles.headerArtwork}
              loading="lazy"
              onError={() => {
                if (headerArtworkSrc !== "/ev-charger-bg.svg") {
                  setHeaderArtworkSrc("/ev-charger-bg.svg");
                }
              }}
            />
            <div style={styles.headerLayer} aria-hidden="true" />
            <div style={styles.headerPattern} aria-hidden="true" />
          </div>
        </header>

        <section style={styles.body} aria-label={t("vehicleHome.listTitle")}>
          <div style={styles.listTitleRow}>
            <h2 style={styles.listTitle}>{t("vehicleHome.listTitle")}</h2>
            <div style={styles.listTitleRight}>
              <div style={styles.counter}>
                {loading ? t("vehicleHome.loading") : t("vehicleHome.count", { count: vehicles.length })}
              </div>
            </div>
          </div>

          <p style={styles.listSubtitle}>
            {t("vehicleHome.listSubtitle")}
          </p>

          {error && <div style={styles.emptyMessage}>{error}</div>}

          {!error && !loading && vehicles.length === 0 && (
            <div style={styles.emptyMessage}>
              {t("vehicleHome.emptyNoVehicles")}
            </div>
          )}

          <div style={styles.vehicleList}>
            {vehicles.map((vehicle) => {
              const isActive = vehicle.id === selectedVehicleId;
              return (
                <article
                  key={vehicle.id}
                  style={{
                    ...styles.vehicleCard,
                    ...(isActive ? styles.vehicleButtonActive : {}),
                  }}
                >
                  <button
                    type="button"
                    style={styles.vehicleMainButton}
                    onClick={() => {
                      setSelectedVehicleId(vehicle.id);
                      setIsDetailOpen(true);
                    }}
                  >
                  <span style={styles.vehicleName}>
                    {getVehicleDisplayName(vehicle)}
                  </span>
                  <span style={styles.vehicleMeta}>
                    {t("vehicleHome.plate")}: {vehicle.plateNumber?.trim().toUpperCase() || "--"} -{" "}
                    {t("vehicleHome.connector")}: {vehicle.connectorType || "--"}
                  </span>
                  </button>

                  <div style={styles.vehicleActions}>
                    <button
                      type="button"
                      style={styles.compactButton}
                      onClick={() => handleOpenReservationsForVehicle(vehicle.id)}
                    >
                      {t("vehicleHome.reservations")}
                    </button>
                    <button
                      type="button"
                      style={styles.compactButton}
                      onClick={() => handleOpenHistoryForVehicle(vehicle.id)}
                    >
                      {t("vehicleHome.chargingHistory")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div style={styles.footerActions}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={handleCreateVehicle}
            >
              {t("vehicleHome.newVehicle")}
            </button>
          </div>
        </section>

        {isDetailOpen && selectedVehicle && (
          <div
            style={styles.overlay}
            onClick={() => setIsDetailOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <section
              style={styles.modal}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={styles.modalTop}>
                <div>
                  <div style={{ color: "#7A8982", fontSize: "11px", fontWeight: 850, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {t("vehicleHome.selectedVehicle")}
                  </div>
                  <h3 style={styles.modalTitle}>
                    {getVehicleDisplayName(selectedVehicle)}
                  </h3>
                </div>
                <button
                  type="button"
                  style={styles.closeButton}
                  onClick={() => setIsDetailOpen(false)}
                >
                  {t("vehicleHome.close")}
                </button>
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>{t("vehicleHome.plate")}</div>
                  <div style={styles.infoValue}>
                    {selectedVehicle.plateNumber?.trim().toUpperCase() || "--"}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>{t("vehicleHome.connector")}</div>
                  <div style={styles.infoValue}>
                    {selectedVehicle.connectorType || "--"}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>{t("vehicleHome.battery")}</div>
                  <div style={styles.infoValue}>
                    {selectedVehicle.batteryCapacity
                      ? `${selectedVehicle.batteryCapacity} kWh`
                      : "--"}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>{t("vehicleHome.location")}</div>
                  <div style={styles.infoValue}>
                    {(() => {
                      const location = selectedVehicle.currentLocation;
                      if (
                        !location ||
                        typeof location.latitude !== "number" ||
                        typeof location.longitude !== "number"
                      ) {
                        return t("vehicleHome.noLocation");
                      }

                      if (
                        selectedVehicleLocationLabel &&
                        selectedVehicleLocationLabel !== t("vehicleHome.resolvingLocation")
                      ) {
                        return selectedVehicleLocationLabel;
                      }

                      return formatCoordinates(location.latitude, location.longitude);
                    })()}
                  </div>
                </div>
              </div>

              <div style={styles.actionRow}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={handleGoToMap}
                >
                  {t("vehicleHome.openMap")}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={handleEditVehicle}
                >
                  {t("vehicleHome.updateVehicle")}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default VehicleHomeScreen;
