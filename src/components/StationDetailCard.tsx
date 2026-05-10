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

interface StationDetailCardProps {
  station: Station;
  vehicle: Vehicle | null;
  currentLocation: UserCoordinates | null;
  directionsLoading?: boolean;
  directionsError?: string;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onGetDirections?: () => void;
  onToggleFavorite?: () => void;
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
  onGetDirections,
  onToggleFavorite,
  onClose,
}: StationDetailCardProps) {
  const navigate = useNavigate();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetCharger, setReportTargetCharger] = useState<Charger | null>(
    null,
  );
  const [reportSuccessMessage, setReportSuccessMessage] = useState("");
  const [statusWarningMessage, setStatusWarningMessage] = useState("");
  const [stationLocationLabel, setStationLocationLabel] = useState<string>("");
  const isOpenNow = station.status !== "offline" && isStationOpenAt(station);

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
        ? `Sarj cihazi ${reportTargetCharger.id} icin sorun bildirimi kaydedildi.`
        : "Istasyon icin sorun bildirimi kaydedildi.",
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
            <div style={styles.eyebrow}>Secili Istasyon</div>
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
                  ? "Favorilerden cikar"
                  : "Favorilere ekle"
              }
              title={isFavorite ? "Favorilerden cikar" : "Favorilere ekle"}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
            <button
              type="button"
              onClick={onGetDirections}
              style={styles.navigateButton}
              disabled={!onGetDirections || directionsLoading}
            >
              {directionsLoading ? "Rota ciziliyor..." : "Get Directions"}
            </button>
            <button
              type="button"
              onClick={handleOpenStationReport}
              style={styles.reportButton}
            >
              Sorun Bildir
            </button>
            <button type="button" onClick={onClose} style={styles.closeButton}>
              Kapat
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
            <div style={styles.label}>Konum</div>
            <div style={styles.value}>
              {stationLocationLabel || station.address}
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.label}>Distance</div>
            <div style={styles.value}>
              {formatDistance(currentLocation, station)}
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.label}>Calisma Durumu</div>
            <div style={styles.value}>{isOpenNow ? "Acik" : "Kapali"}</div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.label}>Calisma Saatleri</div>
            <div style={styles.value}>{formatOperatingHours(station.operatingHours)}</div>
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
                  onReserve={handleReserve}
                  onReportIssue={handleOpenChargerReport}
                  onBlockedAction={handleBlockedAction}
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
