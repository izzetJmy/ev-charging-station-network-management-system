import { type CSSProperties, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChargerItem from "./ChargerItem";
import ReportIssueModal from "./ReportIssueModal";
import { STATION_STATUS_COLORS } from "../constants/mapConstants";
import type { Charger } from "../models/Charger";
import type { Station } from "../models/Station";
import type { Vehicle } from "../models/vehicle";
import {
  calculateDistanceFromCurrentLocation,
  formatDistanceLabel,
  type UserCoordinates,
} from "../services/maps/locationService";
import { reverseGeocodeCoordinates } from "../services/maps/geocodingService";
import {
  formatOperatingHours,
  isStationOpenAt,
} from "../utils/stationOperatingHours";
import { useI18n } from "../i18n/I18nProvider";

interface StationDetailCardProps {
  station: Station;
  vehicle: Vehicle | null;
  currentLocation: UserCoordinates | null;
  directionsLoading?: boolean;
  directionsError?: string;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  stationRating?: number;
  stationAverageRating?: number;
  ratingLoading?: boolean;
  onGetDirections?: () => void;
  onToggleFavorite?: () => void;
  onRateStation?: (rating: number) => void;
  onClose: () => void;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backgroundColor: "rgba(15, 31, 27, 0.30)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 1200,
  },
  card: {
    width: "min(760px, 100%)",
    maxHeight: "80vh",
    borderRadius: "22px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "18px",
    boxShadow: "0 16px 30px rgba(31,94,77,0.10)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    overflowY: "auto",
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
  topActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  reportButton: {
    minHeight: "40px",
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
  favoriteButton: {
    minHeight: "40px",
    minWidth: "44px",
    padding: "0 12px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "14px",
    color: "#C94A3B",
    fontSize: "20px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  ratingWrap: {
    position: "relative",
  },
  ratingButton: {
    minHeight: "40px",
    minWidth: "44px",
    padding: "0 12px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "14px",
    color: "#D49B1E",
    fontSize: "20px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  ratingAverage: {
    color: "#6E5518",
    fontSize: "13px",
    fontWeight: 900,
    lineHeight: 1,
  },
  ratingPopover: {
    position: "absolute",
    top: "48px",
    right: 0,
    width: "178px",
    padding: "12px",
    borderRadius: "16px",
    border: "1px solid #D8E2DB",
    backgroundColor: "#FFFFFF",
    boxShadow: "0 16px 34px rgba(23,35,31,0.16)",
    zIndex: 2,
  },
  ratingTitle: {
    margin: "0 0 8px",
    color: "#17231F",
    fontSize: "12px",
    fontWeight: 900,
  },
  starRow: {
    display: "flex",
    gap: "4px",
  },
  starButton: {
    width: "28px",
    height: "28px",
    padding: 0,
    border: "none",
    backgroundColor: "transparent",
    color: "#D49B1E",
    fontSize: "23px",
    lineHeight: 1,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  navigateButton: {
    minHeight: "40px",
    padding: "0 14px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    border: "none",
    borderRadius: "14px",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
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
  },
  successMessage: {
    backgroundColor: "#EFF8E7",
    border: "1px solid #BFDE9B",
    color: "#2C6642",
  },
  errorMessage: {
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
    color: "#A63E30",
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
  const distanceInKilometers = calculateDistanceFromCurrentLocation(currentLocation, {
    latitude: station.latitude,
    longitude: station.longitude,
  });

  return formatDistanceLabel(distanceInKilometers);
}

function StationDetailCard({
  station,
  vehicle,
  currentLocation,
  directionsLoading = false,
  directionsError = "",
  isFavorite = false,
  favoriteLoading = false,
  stationRating = 0,
  stationAverageRating = 0,
  ratingLoading = false,
  onGetDirections,
  onToggleFavorite,
  onRateStation,
  onClose,
}: StationDetailCardProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetCharger, setReportTargetCharger] = useState<Charger | null>(
    null,
  );
  const [reportSuccessMessage, setReportSuccessMessage] = useState("");
  const [statusWarningMessage, setStatusWarningMessage] = useState("");
  const [stationLocationLabel, setStationLocationLabel] = useState<string>("");
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const isOpenNow = station.status !== "offline" && isStationOpenAt(station);
  const stationStatusText =
    station.status === "available"
      ? t("charger.status.available")
      : station.status === "occupied"
        ? t("charger.status.occupied")
        : t("charger.status.offline");

  const handleReserve = (charger: Charger) => {
    setStatusWarningMessage("");
    navigate("/reservation", {
      state: {
        station,
        charger,
        vehicleId: vehicle?.id ?? "",
      },
    });
  };

  const handleBlockedAction = (message: string) => {
    setStatusWarningMessage(message);
  };

  const handleOpenStationReport = () => {
    setReportSuccessMessage("");
    setReportTargetCharger(null);
    setIsReportModalOpen(true);
  };

  const handleOpenChargerReport = (charger: Charger) => {
    setReportSuccessMessage("");
    setReportTargetCharger(charger);
    setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setReportTargetCharger(null);
  };

  const handleReportSubmitSuccess = () => {
    setReportSuccessMessage(
      reportTargetCharger
        ? t("stationDetail.reportedCharger", { id: reportTargetCharger.id })
        : t("stationDetail.reportedStation"),
    );
  };

  useEffect(() => {
    let cancelled = false;

    reverseGeocodeCoordinates({ lat: station.latitude, lng: station.longitude })
      .then((result) => {
        if (cancelled) return;
        setStationLocationLabel(result?.label?.trim() ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setStationLocationLabel("");
      });

    return () => {
      cancelled = true;
    };
  }, [station.id, station.latitude, station.longitude]);

  return (
    <div className="station-detail-overlay" style={styles.overlay} onClick={onClose}>
      <section
        className="station-detail-card"
        style={styles.card}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.topBar}>
          <div style={styles.titleWrap}>
            <div style={styles.eyebrow}>{t("stationDetail.eyebrow")}</div>
            <h3 style={styles.title}>{station.name}</h3>
          </div>

          <div style={styles.topActions}>
            <button
              type="button"
              onClick={onToggleFavorite}
              style={styles.favoriteButton}
              disabled={!onToggleFavorite || favoriteLoading}
              aria-label={
                isFavorite
                  ? t("stationDetail.favoritesRemove")
                  : t("stationDetail.favoritesAdd")
              }
              title={isFavorite ? t("stationDetail.favoritesRemove") : t("stationDetail.favoritesAdd")}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
            <div style={styles.ratingWrap}>
              <button
                type="button"
                onClick={() => setIsRatingOpen((current) => !current)}
                style={styles.ratingButton}
                disabled={!onRateStation || ratingLoading}
                aria-label={t("stationDetail.rateStation")}
                title={t("stationDetail.rateStation")}
              >
                <span style={styles.ratingAverage}>
                  {stationAverageRating > 0 ? stationAverageRating.toFixed(1) : "--"}
                </span>
                <span>{stationRating > 0 ? "★" : "☆"}</span>
              </button>
              {isRatingOpen && (
                <div style={styles.ratingPopover}>
                  <p style={styles.ratingTitle}>{t("stationDetail.rateStation")}</p>
                  <div style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        style={styles.starButton}
                        onClick={() => {
                          onRateStation?.(rating);
                          setIsRatingOpen(false);
                        }}
                        disabled={ratingLoading}
                        aria-label={t("stationDetail.ratingValue", { rating })}
                        title={t("stationDetail.ratingValue", { rating })}
                      >
                        {rating <= stationRating ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onGetDirections}
              style={styles.navigateButton}
              disabled={!onGetDirections || directionsLoading}
            >
              {directionsLoading ? t("stationDetail.directionsDrawing") : t("stationDetail.directionsGet")}
            </button>
            <button
              type="button"
              onClick={handleOpenStationReport}
              style={styles.reportButton}
            >
              {t("stationDetail.report")}
            </button>
            <button type="button" onClick={onClose} style={styles.closeButton}>
              {t("stationDetail.close")}
            </button>
          </div>
        </div>

        {reportSuccessMessage && (
          <div style={{ ...styles.message, ...styles.successMessage }}>
            <span>OK</span>
            <span>{reportSuccessMessage}</span>
          </div>
        )}

        {statusWarningMessage && (
          <div style={{ ...styles.message, ...styles.errorMessage }}>
            <span>!</span>
            <span>{statusWarningMessage}</span>
          </div>
        )}

        {directionsError && (
          <div style={{ ...styles.message, ...styles.errorMessage }}>
            <span>!</span>
            <span>{directionsError}</span>
          </div>
        )}

        <div style={styles.infoGrid}>
          <div style={{ ...styles.infoCard, ...styles.infoCardWide }}>
            <div style={styles.label}>{t("stationDetail.address")}</div>
            <div style={styles.value}>{station.address}</div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.label}>{t("stationDetail.status")}</div>
            <div style={{ ...styles.value, ...styles.statusRow }}>
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor: STATION_STATUS_COLORS[station.status],
                }}
              />
              <span>{stationStatusText}</span>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.label}>{t("stationDetail.location")}</div>
            <div style={styles.value}>
              {stationLocationLabel || station.address}
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.label}>{t("stationDetail.distance")}</div>
            <div style={styles.value}>
              {formatDistance(currentLocation, station)}
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.label}>{t("stationDetail.operatingStatus")}</div>
            <div style={styles.value}>{isOpenNow ? t("stationDetail.open") : t("stationDetail.closed")}</div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.label}>{t("stationDetail.operatingHours")}</div>
            <div style={styles.value}>{formatOperatingHours(station.operatingHours)}</div>
          </div>
        </div>

        <div style={styles.chargerSection}>
          <h4 style={styles.sectionTitle}>{t("stationDetail.chargerList")}</h4>

          {station.chargers.length > 0 ? (
            <div style={styles.chargerGrid}>
              {station.chargers.map((charger) => (
                <ChargerItem
                  key={charger.id}
                  charger={charger}
                  station={station}
                  vehicle={vehicle}
                  onReserve={handleReserve}
                  onReportIssue={handleOpenChargerReport}
                  onBlockedAction={handleBlockedAction}
                />
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              {t("stationDetail.noCharger")}
            </div>
          )}
        </div>

        <style>{`
          .station-detail-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 20px 34px rgba(31,94,77,0.12);
          }
        `}</style>

        {isReportModalOpen && (
          <ReportIssueModal
            stationId={station.id}
            stationName={station.name}
            charger={reportTargetCharger}
            onClose={handleCloseReportModal}
            onSubmitSuccess={handleReportSubmitSuccess}
          />
        )}
      </section>
    </div>
  );
}

export default StationDetailCard;
