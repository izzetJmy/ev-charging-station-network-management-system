import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import MapView from "../../components/Map/MapView";
import StationDetailCard from "../../components/StationDetailCard";
import { STATION_STATUS_COLORS } from "../../constants/mapConstants";
import type { Station } from "../../models/Station";
import type { Vehicle } from "../../models/vehicle";
import {
  getVehicleById,
  getVehicleByUserId,
  updateVehicleCurrentLocation,
} from "../../services/firebase/vehicleService";
import { getStationsWithChargers } from "../../services/firebase/stationService";
import { useGoogleMapsLoader } from "../../services/maps/googleMapsLoader";
import {
  calculateDistanceFromCurrentLocation,
  formatDistanceLabel,
  getCurrentLocation,
  type LocationPermissionState,
  type UserCoordinates,
  watchCurrentLocation,
} from "../../services/maps/locationService";
import { reverseGeocodeCoordinates } from "../../services/maps/geocodingService";
import { getOrCreateLocalUserId } from "../../services/auth/localUser";
import { useFavoriteStations } from "../../hooks/useFavoriteStations";
import { toggleFavoriteStation } from "../../services/firebase/favoriteService";
import { isStationOpenAt } from "../../utils/stationOperatingHours";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#F6F8F4",
    backgroundImage:
      "linear-gradient(135deg, #F6F8F4 0%, #ECF5EE 48%, #F9FBF6 100%)",
    backgroundSize: "100% 100%",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "32px 18px 64px",
    overflowY: "auto",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#17231F",
    boxSizing: "border-box",
  },
  shell: {
    width: "min(1280px, 100%)",
    display: "grid",
    gridTemplateColumns: "0.92fr 1.08fr",
    borderRadius: "28px",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
    backdropFilter: "blur(14px)",
  },
  summaryPanel: {
    minHeight: "680px",
    padding: "34px",
    background:
      "linear-gradient(155deg, #10352E 0%, #1F5E4D 50%, #A9D869 145%)",
    color: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "28px",
    minWidth: 0,
    boxSizing: "border-box",
  },
  routeLayer: {
    position: "absolute",
    inset: 0,
    opacity: 0.34,
    backgroundImage:
      "linear-gradient(120deg, transparent 12%, rgba(255,255,255,0.16) 12%, rgba(255,255,255,0.16) 13%, transparent 13%, transparent 52%, rgba(255,255,255,0.14) 52%, rgba(255,255,255,0.14) 53%, transparent 53%), linear-gradient(25deg, transparent 24%, rgba(255,255,255,0.12) 24%, rgba(255,255,255,0.12) 25%, transparent 25%)",
    backgroundSize: "240px 220px, 190px 180px",
  },
  content: {
    position: "relative",
    zIndex: 1,
    minWidth: 0,
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
    margin: "34px 0 10px",
    fontSize: "38px",
    lineHeight: 1.08,
    fontWeight: 850,
    maxWidth: "360px",
  },
  summaryText: {
    margin: 0,
    maxWidth: "350px",
    color: "rgba(255,255,255,0.76)",
    fontSize: "15px",
    lineHeight: 1.7,
  },
  locationStrip: {
    marginTop: "22px",
    borderRadius: "22px",
    backgroundColor: "rgba(255,255,255,0.13)",
    border: "1px solid rgba(255,255,255,0.18)",
    padding: "16px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    alignItems: "center",
  },
  selectedRow: {
    marginTop: "14px",
    borderRadius: "18px",
    backgroundColor: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "12px 14px",
  },
  selectedLabel: {
    color: "rgba(255,255,255,0.66)",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  selectedValue: {
    marginTop: "6px",
    fontSize: "15px",
    fontWeight: 900,
    lineHeight: 1.35,
  },
  locationStatus: {
    color: "rgba(255,255,255,0.72)",
    fontSize: "11px",
    lineHeight: 1.4,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 850,
  },
  locationValue: {
    marginTop: "6px",
    fontSize: "16px",
    fontWeight: 900,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    color: "#17231F",
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 900,
    minWidth: "110px",
    textAlign: "center",
    boxShadow: "0 8px 20px rgba(0,0,0,0.16)",
  },
  filterCard: {
    marginTop: "16px",
    borderRadius: "22px",
    backgroundColor: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "16px",
  },
  filterTitle: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    fontSize: "11px",
    fontWeight: 850,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  searchInput: {
    width: "100%",
    minHeight: "44px",
    marginTop: "12px",
    padding: "10px 12px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    outline: "none",
    fontSize: "14px",
    fontWeight: 750,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "12px",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "12px",
  },
  filterGroup: {
    minWidth: 0,
  },
  filterGroupWide: {
    gridColumn: "1 / -1",
  },
  filterLabel: {
    display: "block",
    color: "rgba(255,255,255,0.68)",
    fontSize: "10px",
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "7px",
  },
  filterSelect: {
    width: "100%",
    minHeight: "40px",
    borderRadius: "13px",
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    padding: "0 10px",
    fontSize: "12px",
    fontWeight: 850,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  filterInput: {
    width: "100%",
    minHeight: "40px",
    borderRadius: "13px",
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    padding: "0 10px",
    fontSize: "12px",
    fontWeight: 850,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  priceRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  filterToggle: {
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.86)",
    minHeight: "36px",
    padding: "0 12px",
    fontSize: "12px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  filterToggleActive: {
    backgroundColor: "rgba(184,240,97,0.18)",
    borderColor: "rgba(184,240,97,0.42)",
    color: "#FFFFFF",
    boxShadow: "0 0 0 3px rgba(184,240,97,0.12)",
  },
  filterResetButton: {
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.86)",
    minHeight: "36px",
    padding: "0 12px",
    fontSize: "12px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  listCard: {
    marginTop: "16px",
    borderRadius: "22px",
    backgroundColor: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  listHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "12px",
    minWidth: 0,
  },
  listTitle: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    fontSize: "11px",
    fontWeight: 850,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  listCount: {
    color: "rgba(255,255,255,0.70)",
    fontSize: "12px",
    fontWeight: 850,
  },
  stationList: {
    marginTop: "12px",
    display: "grid",
    gap: "10px",
    minWidth: 0,
    maxWidth: "100%",
    maxHeight: "300px",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: "4px",
    boxSizing: "border-box",
  },
  listToggle: {
    marginTop: "12px",
    width: "100%",
    minHeight: "40px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.88)",
    fontSize: "12px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
  },
  chevron: {
    width: "10px",
    height: "10px",
    borderRight: "2px solid rgba(255,255,255,0.78)",
    borderBottom: "2px solid rgba(255,255,255,0.78)",
    transform: "rotate(45deg)",
  },
  chevronUp: {
    transform: "rotate(225deg)",
  },
  stationButton: {
    width: "100%",
    maxWidth: "100%",
    textAlign: "left",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: "12px 12px 11px",
    color: "#FFFFFF",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  stationCardRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "8px",
    alignItems: "center",
  },
  stationMainButton: {
    border: "none",
    background: "transparent",
    color: "inherit",
    textAlign: "left",
    padding: 0,
    cursor: "pointer",
    fontFamily: "inherit",
    minWidth: 0,
    width: "100%",
    overflow: "hidden",
  },
  favoriteIconButton: {
    minWidth: "38px",
    minHeight: "38px",
    borderRadius: "13px",
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFD7D1",
    fontSize: "20px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1,
  },
  stationButtonActive: {
    boxShadow: "0 0 0 3px rgba(184,240,97,0.14), 0 14px 28px rgba(0,0,0,0.22)",
    transform: "translateY(-1px)",
  },
  stationName: {
    display: "block",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "-0.01em",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    lineHeight: 1.3,
  },
  stationMeta: {
    display: "block",
    marginTop: "6px",
    color: "rgba(255,255,255,0.74)",
    fontSize: "12px",
    fontWeight: 750,
    lineHeight: 1.45,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  metricGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  },
  metric: {
    borderRadius: "16px",
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "14px",
  },
  metricValue: {
    fontSize: "19px",
    fontWeight: 850,
    marginBottom: "4px",
  },
  metricLabel: {
    color: "rgba(255,255,255,0.66)",
    fontSize: "11px",
    fontWeight: 750,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },
  mapPanel: {
    padding: "38px",
    minHeight: "680px",
    backgroundColor: "rgba(255,255,255,0.94)",
    display: "flex",
    flexDirection: "column",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    marginBottom: "28px",
  },
  panelTitle: {
    margin: "0 0 8px",
    color: "#17231F",
    fontSize: "30px",
    lineHeight: 1.2,
    fontWeight: 850,
  },
  subtitle: {
    margin: 0,
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.6,
    maxWidth: "430px",
  },
  statusWrap: {
    minWidth: "120px",
    textAlign: "right",
  },
  statusValue: {
    fontSize: "26px",
    fontWeight: 900,
    color: "#1F5E4D",
    lineHeight: 1,
  },
  statusLabel: {
    color: "#7A8982",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginTop: "6px",
  },
  progressTrack: {
    height: "9px",
    borderRadius: "999px",
    backgroundColor: "#E4ECE6",
    overflow: "hidden",
    marginBottom: "26px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #1F5E4D, #A4D65E)",
    transition: "width 0.25s ease",
  },
  card: {
    borderRadius: "22px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#F7FBF7",
    padding: "18px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 12px 28px rgba(31,94,77,0.06)",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: 850,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7B8A84",
    marginBottom: "14px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "18px",
  },
  infoCard: {
    borderRadius: "16px",
    padding: "14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #D8E2DB",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  infoLabel: {
    color: "#7A8982",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  infoValue: {
    marginTop: "6px",
    color: "#17231F",
    fontSize: "16px",
    fontWeight: 850,
  },
  statusLegend: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "16px",
  },
  statusPill: {
    borderRadius: "16px",
    padding: "12px 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #D8E2DB",
  },
  pillRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  pillDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    boxShadow: "0 0 0 4px rgba(31,94,77,0.08)",
  },
  pillLabel: {
    color: "#263A33",
    fontSize: "13px",
    fontWeight: 800,
    textTransform: "capitalize",
  },
  message: {
    padding: "14px 16px",
    borderRadius: "16px",
    fontSize: "13px",
    lineHeight: 1.55,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
  },
  neutralMessage: {
    backgroundColor: "#EEF6F0",
    border: "1px solid #D3E5D8",
    color: "#37594D",
  },
  errorMessage: {
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
    color: "#A63E30",
  },
  successMessage: {
    backgroundColor: "#EFF8E7",
    border: "1px solid #BFDE9B",
    color: "#2C6642",
  },
  warningCard: {
    minHeight: "420px",
    borderRadius: "24px",
    border: "1px dashed #AFCDBB",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(239,247,240,0.92))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    textAlign: "center",
  },
  warningBox: {
    maxWidth: "360px",
  },
  warningBadge: {
    width: "54px",
    height: "54px",
    margin: "0 auto 14px",
    borderRadius: "18px",
    display: "grid",
    placeItems: "center",
    backgroundColor: "#E8F4DD",
    color: "#1F5E4D",
    fontSize: "24px",
    fontWeight: 900,
  },
  warningTitle: {
    margin: "0 0 8px",
    color: "#17231F",
    fontSize: "22px",
    fontWeight: 850,
  },
  warningText: {
    margin: 0,
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.7,
  },
  mapFrame: {
    width: "100%",
    minHeight: "420px",
    height: "420px",
    borderRadius: "24px",
    overflow: "hidden",
    border: "1px solid #D8E2DB",
    backgroundColor: "#EAF2EC",
    boxShadow:
      "0 16px 32px rgba(31,94,77,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
  },
  navigationOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backgroundColor: "rgba(9, 22, 19, 0.54)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
  navigationSheet: {
    width: "min(980px, 100%)",
    maxHeight: "92vh",
    borderRadius: "24px",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.66)",
    boxShadow: "0 28px 80px rgba(6, 20, 16, 0.34)",
    display: "grid",
    gridTemplateRows: "auto minmax(360px, 1fr)",
  },
  navigationHeader: {
    padding: "18px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "16px",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottom: "1px solid #E1EAE4",
  },
  routeTitle: {
    margin: 0,
    color: "#17231F",
    fontSize: "22px",
    lineHeight: 1.2,
    fontWeight: 900,
  },
  routeSubtitle: {
    margin: "7px 0 0",
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.45,
    fontWeight: 750,
  },
  routeSummaryRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "12px",
  },
  routeSummaryPill: {
    minHeight: "34px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 12px",
    borderRadius: "999px",
    backgroundColor: "#F0F7F1",
    border: "1px solid #D7E6DA",
    color: "#245243",
    fontSize: "13px",
    fontWeight: 850,
  },
  navigationActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  navigationMapShell: {
    minHeight: "520px",
    backgroundColor: "#EAF2EC",
  },
  navigationMapFrame: {
    width: "100%",
    height: "100%",
    minHeight: "520px",
  },
  loadingShell: {
    minHeight: "420px",
    borderRadius: "24px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "22px",
  },
  skeletonHeader: {
    width: "38%",
    height: "18px",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, #E5EDE7 0%, #F5F9F5 45%, #E5EDE7 100%)",
    backgroundSize: "220px 100%",
    animation: "mapSkeleton 1.4s ease-in-out infinite",
    marginBottom: "16px",
  },
  skeletonMap: {
    width: "100%",
    height: "320px",
    borderRadius: "18px",
    background:
      "linear-gradient(135deg, #EEF4EF 0%, #F7FAF7 52%, #E5EDE7 100%)",
    position: "relative",
    overflow: "hidden",
  },
  skeletonShine: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.7) 45%, transparent 70%)",
    transform: "translateX(-100%)",
    animation: "mapShine 1.8s ease-in-out infinite",
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    marginTop: "18px",
  },
  primaryButton: {
    minHeight: "52px",
    padding: "14px 16px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    border: "none",
    borderRadius: "16px",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: 850,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(31,94,77,0.26)",
    fontFamily: "inherit",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
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
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  footer: {
    textAlign: "center",
    marginTop: "18px",
    fontSize: "12px",
    color: "#8B9993",
    fontWeight: 700,
  },
  detailWrap: {
    marginTop: "16px",
  },
};

interface RequestLocationOptions {
  persistToVehicle?: boolean;
}

interface StationMapLocationState {
  vehicleId?: string;
  stationId?: string;
}

function formatCoordinates(coords: UserCoordinates | null) {
  if (!coords) {
    return "--";
  }

  return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
}

function getStatusText(permissionState: LocationPermissionState) {
  switch (permissionState) {
    case "granted":
      return "Hazir";
    case "loading":
      return "Bekliyor";
    case "denied":
      return "Kapali";
    case "error":
      return "Error";
    default:
      return "Bos";
  }
}

function getProgressValue(
  permissionState: LocationPermissionState,
  coords: UserCoordinates | null,
  mapsLoading: boolean,
) {
  if (permissionState === "granted" && coords && !mapsLoading) {
    return 100;
  }

  if (permissionState === "loading" || mapsLoading) {
    return 58;
  }

  if (permissionState === "denied" || permissionState === "error") {
    return 18;
  }

  return 6;
}

function toggleFilterValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

function getUniqueStationValues(
  stations: Station[],
  selector: (station: Station) => string | undefined,
) {
  return Array.from(
    new Set(
      stations
        .map(selector)
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b, "tr"));
}

function getUniqueChargerValues(
  stations: Station[],
  selector: (charger: Station["chargers"][number]) => string | undefined,
) {
  return Array.from(
    new Set(
      stations
        .flatMap((station) => station.chargers ?? [])
        .map(selector)
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
}

function StationMapScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = useMemo(() => getOrCreateLocalUserId(), []);
  const { isLoaded, isLoading: mapsLoading, errorMessage: mapsError } =
    useGoogleMapsLoader();
  const {
    favoriteStationIds,
    loading: favoritesLoading,
    error: favoritesError,
  } = useFavoriteStations(userId);
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>("idle");
  const [coords, setCoords] = useState<UserCoordinates | null>(null);
  const [coordsLabel, setCoordsLabel] = useState<string>("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [locationUpdateError, setLocationUpdateError] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [locationUpdateLoading, setLocationUpdateLoading] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationSearch, setStationSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedConnectorTypes, setSelectedConnectorTypes] = useState<string[]>([]);
  const [selectedPowerOutputs, setSelectedPowerOutputs] = useState<string[]>([]);
  const [stationStatusFilter, setStationStatusFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [isNearbyExpanded, setIsNearbyExpanded] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsError, setStationsError] = useState("");
  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsError, setDirectionsError] = useState("");
  const [navigationStation, setNavigationStation] = useState<Station | null>(null);
  const [isNavigationPreviewOpen, setIsNavigationPreviewOpen] = useState(false);
  const [favoriteActionLoadingId, setFavoriteActionLoadingId] = useState("");
  const vehicleIdRef = useRef("");
  const coordsRef = useRef<UserCoordinates | null>(null);

  const stationCounts = useMemo(() => {
    const totalStations = stations.length;
    const availableStations = stations.filter((station) => {
      if (station.status !== "available") {
        return false;
      }

      return station.chargers.some((charger) => charger.status === "available");
    }).length;

    return {
      totalStations,
      availableStations,
    };
  }, [stations]);

  const connectorTypeOptions = useMemo(
    () => getUniqueChargerValues(stations, (charger) => charger.connectorType),
    [stations],
  );
  const powerOutputOptions = useMemo(
    () => getUniqueChargerValues(stations, (charger) => charger.powerOutput),
    [stations],
  );
  const stationStatusOptions = useMemo(
    () => getUniqueStationValues(stations, (station) => station.status),
    [stations],
  );

  const filteredStations = useMemo(() => {
    const query = stationSearch.trim().toLowerCase();
    const minPrice = priceMin.trim() ? Number(priceMin) : null;
    const maxPrice = priceMax.trim() ? Number(priceMax) : null;

    return stations.filter((station) => {
      if (stationStatusFilter !== "all" && station.status !== stationStatusFilter) {
        return false;
      }

      if (openNowOnly && !isStationOpenAt(station)) {
        return false;
      }

      if (onlyAvailable) {
        if (station.status !== "available") {
          return false;
        }

        const hasAvailableCharger = station.chargers.some(
          (charger) => charger.status === "available",
        );
        if (!hasAvailableCharger) {
          return false;
        }
      }

      const hasChargerFilters =
        selectedConnectorTypes.length > 0 ||
        selectedPowerOutputs.length > 0 ||
        availabilityFilter !== "all" ||
        minPrice != null ||
        maxPrice != null;

      if (hasChargerFilters) {
        const hasMatchingCharger = station.chargers.some((charger) => {
          if (
            selectedConnectorTypes.length > 0 &&
            !selectedConnectorTypes.includes(charger.connectorType)
          ) {
            return false;
          }

          if (
            selectedPowerOutputs.length > 0 &&
            !selectedPowerOutputs.includes(charger.powerOutput)
          ) {
            return false;
          }

          if (availabilityFilter === "available" && charger.status !== "available") {
            return false;
          }

          if (availabilityFilter === "busy" && charger.status !== "occupied") {
            return false;
          }

          if (availabilityFilter === "offline" && charger.status !== "offline") {
            return false;
          }

          if (minPrice != null && Number.isFinite(minPrice) && charger.pricePerKwh < minPrice) {
            return false;
          }

          if (maxPrice != null && Number.isFinite(maxPrice) && charger.pricePerKwh > maxPrice) {
            return false;
          }

          return true;
        });

        if (!hasMatchingCharger) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const name = station.name?.toLowerCase() ?? "";
      const address = station.address?.toLowerCase() ?? "";
      return name.includes(query) || address.includes(query);
    });
  }, [
    availabilityFilter,
    onlyAvailable,
    openNowOnly,
    priceMax,
    priceMin,
    selectedConnectorTypes,
    selectedPowerOutputs,
    stationSearch,
    stationStatusFilter,
    stations,
  ]);

  const resetFilters = () => {
    setStationSearch("");
    setOnlyAvailable(false);
    setSelectedConnectorTypes([]);
    setSelectedPowerOutputs([]);
    setStationStatusFilter("all");
    setAvailabilityFilter("all");
    setPriceMin("");
    setPriceMax("");
    setOpenNowOnly(false);
  };

  const nearbyStations = useMemo(() => {
    const withDistance = filteredStations.map((station) => {
      if (!coords) {
        return { station, distanceKm: null as number | null };
      }

      return {
        station,
        distanceKm: calculateDistanceFromCurrentLocation(coords, station),
      };
    });

    withDistance.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) {
        return a.station.name.localeCompare(b.station.name);
      }
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return withDistance.slice(0, 8);
  }, [coords, filteredStations]);

  const visibleNearbyStations = useMemo(() => {
    if (isNearbyExpanded) {
      return nearbyStations;
    }

    return nearbyStations.slice(0, 3);
  }, [isNearbyExpanded, nearbyStations]);

  useEffect(() => {
    if (!selectedStation) return;
    if (filteredStations.some((station) => station.id === selectedStation.id)) return;
    setSelectedStation(null);
  }, [filteredStations, selectedStation]);

  useEffect(() => {
    let cancelled = false;
    getStationsWithChargers()
      .then((result) => {
        if (cancelled) return;
        setStations(result);
        setStationsError(
          result.length
            ? ""
            : "Station data could not be found. You can seed stations/chargers from the admin panel.",
        );
      })
      .catch(() => {
        if (cancelled) return;
        setStationsError("Station data could not be loaded. Check the Firestore connection.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const routeState = location.state as StationMapLocationState | null;
    const requestedStationId = routeState?.stationId;

    if (!requestedStationId || stations.length === 0) {
      return;
    }

    const station = stations.find((candidate) => candidate.id === requestedStationId);
    const timerId = window.setTimeout(() => {
      if (station) {
        setSelectedStation(station);
      }
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [location.state, stations]);

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const routeState = location.state as StationMapLocationState | null;
        const selectedVehicleId = routeState?.vehicleId;

        const vehicle = selectedVehicleId
          ? await getVehicleById(selectedVehicleId)
          : await getVehicleByUserId(userId);

        setVehicle(vehicle);
        setVehicleId(vehicle?.id ?? "");
        if (vehicle?.currentLocation) {
          setCoords({
            lat: vehicle.currentLocation.latitude,
            lng: vehicle.currentLocation.longitude,
          });
          setPermissionState("granted");
          setMessage("Saved currentLocation data is being used.");
        }
      } catch {
        setVehicle(null);
        setVehicleId("");
      }
    };

    void loadVehicle();
  }, [location.state, userId]);

  useEffect(() => {
    vehicleIdRef.current = vehicleId;
  }, [vehicleId]);

  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  useEffect(() => {
    let isCancelled = false;

    const resolveAddress = async () => {
      if (!coords) {
        setCoordsLabel("");
        return;
      }

      setCoordsLabel("Resolving location...");
      const result = await reverseGeocodeCoordinates(coords);
      if (isCancelled) return;

      setCoordsLabel(result?.label ?? "");
    };

    void resolveAddress();

    return () => {
      isCancelled = true;
    };
  }, [coords]);

  const requestLocation = useCallback(
    async ({ persistToVehicle = false }: RequestLocationOptions = {}) => {
      setPermissionState("loading");
      setMessage("Requesting location permission and trying to get the current location.");
      setLocationUpdateError("");
      setSuccessMessage("");

      if (persistToVehicle) {
        setLocationUpdateLoading(true);
      }

      const result = await getCurrentLocation();
      setPermissionState(result.permissionState);
      setCoords(result.coords);
      setMessage(result.message);

      if (!persistToVehicle) {
        return;
      }

      if (!result.currentLocation) {
        setLocationUpdateLoading(false);
        setLocationUpdateError(
          result.permissionState === "denied"
            ? "Location permission was denied. Vehicle location could not be updated."
            : result.message,
        );
        return;
      }

      if (!vehicleIdRef.current) {
        setLocationUpdateLoading(false);
        setLocationUpdateError(
          "Location was received, but no vehicle record was found to update.",
        );
        return;
      }

      try {
        await updateVehicleCurrentLocation(
          vehicleIdRef.current,
          result.currentLocation,
        );
        setSuccessMessage(
          "Location updated, the map was centered, and Firestore was updated.",
        );
      } catch {
        setLocationUpdateError("An error occurred while saving the location to Firestore.");
      } finally {
        setLocationUpdateLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void requestLocation();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [requestLocation]);

  useEffect(() => {
    if (permissionState === "denied" || permissionState === "error") {
      return undefined;
    }

    return watchCurrentLocation({
      onChange: (result) => {
        setPermissionState(result.permissionState);
        setCoords(result.coords);
        setMessage(result.message);
      },
      onError: (result) => {
        if (coordsRef.current) {
          return;
        }
        setPermissionState(result.permissionState);
        setMessage(result.message);
      },
    });
  }, [permissionState]);

  const progressValue = getProgressValue(
    permissionState,
    coords,
    mapsLoading,
  );

  const statusSummary = useMemo(
    () => [
      { label: "available", color: STATION_STATUS_COLORS.available },
      { label: "occupied", color: STATION_STATUS_COLORS.occupied },
      { label: "offline", color: STATION_STATUS_COLORS.offline },
    ],
    [],
  );

  const shouldShowLoadingState =
    permissionState === "loading" || (permissionState === "granted" && mapsLoading);
  const shouldShowMap =
    permissionState === "granted" && !!coords && isLoaded && !mapsError;
  const shouldShowError =
    permissionState === "error" || (permissionState === "granted" && !!mapsError);
  const directionsLeg = directionsResult?.routes[0]?.legs[0] ?? null;
  const navigationOriginLabel =
    coordsLabel && coordsLabel !== "Resolving location..."
      ? coordsLabel
      : "Locationunuz";

  const handleSelectStation = (station: Station) => {
    setSelectedStation(station);
    setDirectionsError("");
    setSuccessMessage("");
  };

  const handleCloseStationCard = () => {
    setSelectedStation(null);
    setDirectionsError("");
  };

  const handleGetDirections = async () => {
    if (!selectedStation) {
      setDirectionsError("Select a station first to draw a route.");
      return;
    }

    if (!isLoaded || mapsError) {
      setDirectionsError(
        mapsError || "The route cannot be drawn because Google Maps is not ready.",
      );
      return;
    }

    setDirectionsLoading(true);
    setDirectionsError("");
    setDirectionsResult(null);
    setNavigationStation(null);
    setIsNavigationPreviewOpen(false);
    setMessage("Getting current location for the route.");

    const locationResult = await getCurrentLocation();
    setPermissionState(locationResult.permissionState);
    setCoords(locationResult.coords);
    setMessage(locationResult.message);

    if (!locationResult.coords) {
      setDirectionsLoading(false);
      setDirectionsError(
        locationResult.permissionState === "denied"
          ? "Location permission was denied. Allow location permission in the browser to draw a route."
          : locationResult.message,
      );
      return;
    }

    try {
      const directionsService = new google.maps.DirectionsService();
      const destination = {
        lat: selectedStation.latitude,
        lng: selectedStation.longitude,
      };

      directionsService.route(
        {
          origin: locationResult.coords,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          setDirectionsLoading(false);

          if (status !== google.maps.DirectionsStatus.OK || !result) {
            setDirectionsError(
              "Google Maps could not create route details. Please try again later.",
            );
            return;
          }

          setDirectionsResult(result);
          setNavigationStation(selectedStation);
          setIsNavigationPreviewOpen(true);
          setSelectedStation(null);
          setSuccessMessage("Route drawn on the map.");
        },
      );
    } catch {
      setDirectionsLoading(false);
      setDirectionsError(
        "An error occurred while starting DirectionsService. The app is still running.",
      );
    }
  };

  const handleCloseNavigationPreview = () => {
    setIsNavigationPreviewOpen(false);
  };

  const handleOpenGoogleMaps = () => {
    if (!navigationStation) {
      return;
    }

    const destination = `${navigationStation.latitude},${navigationStation.longitude}`;
    const origin = coords ? `${coords.lat},${coords.lng}` : "";
    const url = new URL("https://www.google.com/maps/dir/");

    if (origin) {
      url.searchParams.set("api", "1");
      url.searchParams.set("origin", origin);
      url.searchParams.set("destination", destination);
      url.searchParams.set("travelmode", "driving");
    } else {
      url.searchParams.set("api", "1");
      url.searchParams.set("destination", destination);
    }

    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const handleToggleFavorite = async (station: Station) => {
    setFavoriteActionLoadingId(station.id);
    setLocationUpdateError("");

    try {
      await toggleFavoriteStation(
        userId,
        station.id,
        station.name,
        favoriteStationIds.has(station.id),
      );
    } catch {
      setLocationUpdateError("Favorite action could not be saved. Please try again.");
    } finally {
      setFavoriteActionLoadingId("");
    }
  };

  return (
    <div style={styles.page}>
      <main className="station-map-shell" style={styles.shell}>
        <section style={styles.summaryPanel} aria-label="Station map summary">
          <div style={styles.routeLayer} />

          <div style={styles.content}>
            <div style={styles.eyebrow}>
              <span style={styles.signalDot} />
              EV Network
            </div>

            <h1 style={styles.title}>Station Map Focused on Your Location</h1>
            <p style={styles.summaryText}>
              When location permission is granted, the system detects your current location,
              opens Google Maps, and shows nearby station markers in the same view.
              ekranda gosterir.
            </p>

            <div style={styles.locationStrip}>
                <div>
                  <div style={styles.locationStatus}>Current location</div>
                  <div style={styles.locationValue}>
                    {coords
                      ? coordsLabel && coordsLabel !== "Resolving location..."
                        ? coordsLabel
                        : formatCoordinates(coords)
                      : "Waiting for location"}
                  </div>
                </div>
                <div style={styles.chip}>{getStatusText(permissionState)}</div>
              </div>

            {selectedStation && (
              <div style={styles.selectedRow}>
                <div style={styles.selectedLabel}>Selected station</div>
                <div style={styles.selectedValue}>{selectedStation.name}</div>
              </div>
            )}

            <div style={styles.filterCard}>
              <p style={styles.filterTitle}>Searchma ve Filtre</p>
              <input
                value={stationSearch}
                onChange={(event) => setStationSearch(event.target.value)}
                placeholder="Station name veya adres ara..."
                style={styles.searchInput}
              />

              <div className="station-filter-grid" style={styles.filterGrid}>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Station status</label>
                  <select
                    value={stationStatusFilter}
                    onChange={(event) => setStationStatusFilter(event.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="all">Tum durumlar</option>
                    {stationStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Availability</label>
                  <select
                    value={availabilityFilter}
                    onChange={(event) => setAvailabilityFilter(event.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="all">Tum charger'lar</option>
                    <option value="available">Uygun charger</option>
                    <option value="busy">Dolu charger</option>
                    <option value="offline">Offline charger</option>
                  </select>
                </div>

                <div style={{ ...styles.filterGroup, ...styles.filterGroupWide }}>
                  <label style={styles.filterLabel}>Connector type</label>
                  <div style={styles.filterRow}>
                    {connectorTypeOptions.map((connectorType) => (
                      <button
                        key={connectorType}
                        type="button"
                        style={{
                          ...styles.filterToggle,
                          ...(selectedConnectorTypes.includes(connectorType)
                            ? styles.filterToggleActive
                            : {}),
                        }}
                        onClick={() =>
                          setSelectedConnectorTypes((current) =>
                            toggleFilterValue(current, connectorType),
                          )
                        }
                      >
                        {connectorType}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ ...styles.filterGroup, ...styles.filterGroupWide }}>
                  <label style={styles.filterLabel}>Power output</label>
                  <div style={styles.filterRow}>
                    {powerOutputOptions.map((powerOutput) => (
                      <button
                        key={powerOutput}
                        type="button"
                        style={{
                          ...styles.filterToggle,
                          ...(selectedPowerOutputs.includes(powerOutput)
                            ? styles.filterToggleActive
                            : {}),
                        }}
                        onClick={() =>
                          setSelectedPowerOutputs((current) =>
                            toggleFilterValue(current, powerOutput),
                          )
                        }
                      >
                        {powerOutput}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ ...styles.filterGroup, ...styles.filterGroupWide }}>
                  <label style={styles.filterLabel}>Price range TL/kWh</label>
                  <div className="price-filter-row" style={styles.priceRow}>
                    <input
                      value={priceMin}
                      onChange={(event) => setPriceMin(event.target.value)}
                      placeholder="Min"
                      inputMode="decimal"
                      style={styles.filterInput}
                    />
                    <input
                      value={priceMax}
                      onChange={(event) => setPriceMax(event.target.value)}
                      placeholder="Max"
                      inputMode="decimal"
                      style={styles.filterInput}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.filterRow}>
                <button
                  type="button"
                  style={{
                    ...styles.filterToggle,
                    ...(onlyAvailable ? styles.filterToggleActive : {}),
                  }}
                  onClick={() => setOnlyAvailable((current) => !current)}
                >
                  Available only
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.filterToggle,
                    ...(openNowOnly ? styles.filterToggleActive : {}),
                  }}
                  onClick={() => setOpenNowOnly((current) => !current)}
                >
                  Open now
                </button>
                <button
                  type="button"
                  style={styles.filterResetButton}
                  onClick={resetFilters}
                >
                  Filtreleri temizle
                </button>
              </div>
            </div>

            <div style={styles.listCard}>
              <div style={styles.listHeader}>
                <p style={styles.listTitle}>Yakinimdakiler</p>
                <div style={styles.listCount}>{filteredStations.length} stations</div>
              </div>

              <div style={styles.stationList}>
                {visibleNearbyStations.map(({ station, distanceKm }) => {
                  const isActive = station.id === selectedStation?.id;
                  const distanceLabel =
                    distanceKm == null
                      ? "No location"
                      : formatDistanceLabel(distanceKm);

                  return (
                    <div
                      key={station.id}
                      style={{
                        ...styles.stationButton,
                        ...styles.stationCardRow,
                        ...(isActive ? styles.stationButtonActive : {}),
                      }}
                    >
                      <button
                        type="button"
                        style={styles.stationMainButton}
                        onClick={() => handleSelectStation(station)}
                      >
                      <span style={styles.stationName}>{station.name}</span>
                      <span style={styles.stationMeta}>
                        {distanceLabel} - {station.status}
                      </span>
                      </button>
                      <button
                        type="button"
                        style={styles.favoriteIconButton}
                        onClick={() => void handleToggleFavorite(station)}
                        disabled={favoriteActionLoadingId === station.id}
                        aria-label={
                          favoriteStationIds.has(station.id)
                            ? "Favorilerden cikar"
                            : "Favorilere ekle"
                        }
                        title={
                          favoriteStationIds.has(station.id)
                            ? "Favorilerden cikar"
                            : "Favorilere ekle"
                        }
                      >
                        {favoriteStationIds.has(station.id) ? "â™¥" : "â™¡"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {nearbyStations.length > 3 && (
                <button
                  type="button"
                  style={styles.listToggle}
                  onClick={() => setIsNearbyExpanded((current) => !current)}
                >
                  <span>{isNearbyExpanded ? "Show less" : "Show all"}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      ...styles.chevron,
                      ...(isNearbyExpanded ? styles.chevronUp : {}),
                    }}
                  />
                </button>
              )}
            </div>
          </div>

          <div style={styles.metricGrid}>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{coords ? "Canli" : "--"}</div>
              <div style={styles.metricLabel}>Location</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{stationCounts.totalStations}</div>
              <div style={styles.metricLabel}>Station</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{stationCounts.availableStations}</div>
              <div style={styles.metricLabel}>Uygun</div>
            </div>
          </div>
        </section>

        <section style={styles.mapPanel}>
          <div style={styles.topBar}>
            <div>
              <h2 style={styles.panelTitle}>Station Map</h2>
              <p style={styles.subtitle}>
                The user location is shown with a blue marker, and station statuses are shown with colored
                markers. If location permission is missing, the same area appears instead of the map.
                tasarim dilinde bilgilendirme karti gorunur.
              </p>
            </div>

            <div style={styles.statusWrap}>
              <div style={styles.statusValue}>{progressValue}%</div>
              <div style={styles.statusLabel}>Map durumu</div>
            </div>
          </div>

          <div style={styles.progressTrack} aria-hidden="true">
            <div
              style={{
                ...styles.progressFill,
                width: `${progressValue}%`,
              }}
            />
          </div>

          <div style={styles.sectionLabel}>Location and Marker Status</div>

          <div style={styles.card}>
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Izin</div>
                <div style={styles.infoValue}>{getStatusText(permissionState)}</div>
              </div>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Location</div>
                <div style={styles.infoValue}>
                  {coords
                    ? coordsLabel && coordsLabel !== "Resolving location..."
                      ? coordsLabel
                      : formatCoordinates(coords)
                    : "--"}
                </div>
              </div>
              </div>

            <div style={styles.statusLegend}>
              {statusSummary.map((status) => (
                <div key={status.label} style={styles.statusPill}>
                  <div style={styles.pillRow}>
                    <span
                      style={{
                        ...styles.pillDot,
                        backgroundColor: status.color,
                      }}
                    />
                    <span style={styles.pillLabel}>{status.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {message && (
              <div style={{ ...styles.message, ...styles.neutralMessage }}>
                <span>i</span>
                <span>{message}</span>
              </div>
            )}

            {successMessage && (
              <div style={{ ...styles.message, ...styles.successMessage }}>
                <span>OK</span>
                <span>{successMessage}</span>
              </div>
            )}

            {shouldShowError && (
              <div style={{ ...styles.message, ...styles.errorMessage }}>
                <span>!</span>
                <span>{mapsError || message}</span>
              </div>
            )}

            {locationUpdateError && (
              <div style={{ ...styles.message, ...styles.errorMessage }}>
                <span>!</span>
                <span>{locationUpdateError}</span>
              </div>
            )}

            {stationsError && (
              <div style={{ ...styles.message, ...styles.errorMessage }}>
                <span>!</span>
                <span>{stationsError}</span>
              </div>
            )}

            {favoritesError && (
              <div style={{ ...styles.message, ...styles.errorMessage }}>
                <span>!</span>
                <span>{favoritesError}</span>
              </div>
            )}

            {shouldShowMap ? (
              <div style={styles.mapFrame}>
                <MapView
                  userLocation={coords}
                  stations={filteredStations}
                  selectedStationId={selectedStation?.id ?? null}
                  directionsResult={directionsResult}
                  onSelectStation={handleSelectStation}
                />
              </div>
            ) : shouldShowLoadingState ? (
              <div style={styles.loadingShell}>
                <div style={styles.skeletonHeader} />
                <div style={styles.skeletonMap}>
                  <div style={styles.skeletonShine} />
                </div>
              </div>
            ) : (
              <div style={styles.warningCard}>
                <div style={styles.warningBox}>
                  <div style={styles.warningBadge}>!</div>
                  <h3 style={styles.warningTitle}>Map kullanilamiyor</h3>
                  <p style={styles.warningText}>
                    {permissionState === "denied"
                      ? "The map cannot be displayed without location permission."
                      : mapsError || "Map is not ready right now."}
                  </p>
                </div>
              </div>
            )}

            {selectedStation && (
              <div style={styles.detailWrap}>
                <StationDetailCard
                  station={selectedStation}
                  vehicle={vehicle}
                  currentLocation={coords}
                  directionsLoading={directionsLoading}
                  directionsError={directionsError}
                  isFavorite={favoriteStationIds.has(selectedStation.id)}
                  favoriteLoading={
                    favoritesLoading || favoriteActionLoadingId === selectedStation.id
                  }
                  onGetDirections={handleGetDirections}
                  onToggleFavorite={() => void handleToggleFavorite(selectedStation)}
                  onClose={handleCloseStationCard}
                />
              </div>
            )}

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={() => void requestLocation({ persistToVehicle: true })}
                style={styles.primaryButton}
                disabled={locationUpdateLoading}
              >
                {locationUpdateLoading ? "Updating..." : "Update My Location"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/app")}
                style={styles.secondaryButton}
                disabled={locationUpdateLoading}
              >
                Back to Vehicle Profile
              </button>

              <button
                type="button"
                onClick={() => navigate("/favorites")}
                style={styles.secondaryButton}
                disabled={locationUpdateLoading}
              >
                Favoriler
              </button>
            </div>
          </div>
        </section>
      </main>

      {isNavigationPreviewOpen && navigationStation && coords && directionsResult && (
        <div
          className="navigation-preview-overlay"
          style={styles.navigationOverlay}
          onClick={handleCloseNavigationPreview}
        >
          <section
            className="navigation-preview-sheet"
            style={styles.navigationSheet}
            aria-label="Navigation preview"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.navigationHeader}>
              <div>
                <h3 style={styles.routeTitle}>
                  Locationunuz to {navigationStation.name}
                </h3>
                <p style={styles.routeSubtitle}>
                  {navigationOriginLabel} route from your location to the selected charging station.
                </p>
                <div style={styles.routeSummaryRow}>
                  <span style={styles.routeSummaryPill}>
                    {directionsLeg?.duration?.text ?? "Sure hesaplanamadi"}
                  </span>
                  <span style={styles.routeSummaryPill}>
                    {directionsLeg?.distance?.text ?? "Mesafe hesaplanamadi"}
                  </span>
                  <span style={styles.routeSummaryPill}>Driving</span>
                </div>
              </div>

              <div style={styles.navigationActions}>
                <button
                  type="button"
                  onClick={handleOpenGoogleMaps}
                  style={styles.primaryButton}
                >
                  Google Maps'te Ac
                </button>
                <button
                  type="button"
                  onClick={handleCloseNavigationPreview}
                  style={styles.secondaryButton}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={styles.navigationMapShell}>
              <div style={styles.navigationMapFrame}>
                <MapView
                  userLocation={coords}
                  stations={[navigationStation]}
                  selectedStationId={navigationStation.id}
                  directionsResult={directionsResult}
                  onSelectStation={handleSelectStation}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      <style>{`
        @keyframes mapSkeleton {
          0% { background-position: 220px 0; }
          100% { background-position: -220px 0; }
        }

        @keyframes mapShine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .station-map-shell button:hover {
          transform: translateY(-1px);
        }

        .station-map-shell button:active {
          transform: translateY(0);
        }

        .station-map-shell select option {
          color: #17231F;
          background: #FFFFFF;
        }

        .station-map-shell input::placeholder {
          color: rgba(255,255,255,0.56);
        }

        @media (hover: hover) {
          .station-map-shell button:hover {
            box-shadow: 0 16px 30px rgba(31,94,77,0.18);
          }
        }

        @media (max-width: 920px) {
          .station-map-shell {
            grid-template-columns: 1fr !important;
          }

          .station-map-shell > section:first-child {
            min-height: auto !important;
          }
        }

        @media (max-width: 640px) {
          .station-map-shell {
            border-radius: 20px !important;
          }

          .station-map-shell > section {
            padding: 24px !important;
          }

          .station-map-shell .map-status-grid {
            grid-template-columns: 1fr !important;
          }

          .station-filter-grid,
          .station-map-shell .price-filter-row {
            grid-template-columns: 1fr !important;
          }

          .navigation-preview-sheet {
            grid-template-rows: auto minmax(300px, 1fr) !important;
          }

          .navigation-preview-sheet > div:first-child {
            grid-template-columns: 1fr !important;
          }

          .navigation-preview-sheet > div:last-child,
          .navigation-preview-sheet > div:last-child > div {
            min-height: 360px !important;
          }
        }

        @media (max-width: 560px) {
          .station-map-shell button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default StationMapScreen;
