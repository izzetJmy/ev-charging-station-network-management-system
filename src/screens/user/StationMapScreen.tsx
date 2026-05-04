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
import mockStations from "../../data/mockStations";
import type { Station } from "../../models/Station";
import type { Vehicle } from "../../models/vehicle";
import {
  getVehicleById,
  getVehicleByUserId,
  updateVehicleCurrentLocation,
} from "../../services/firebase/vehicleService";
import { useGoogleMapsLoader } from "../../services/maps/googleMapsLoader";
import {
  getCurrentLocation,
  type LocationPermissionState,
  type UserCoordinates,
} from "../../services/maps/locationService";
import { calculateDistanceInKilometers } from "../../services/maps/locationService";
import { getOrCreateLocalUserId } from "../../services/auth/localUser";

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
    width: "min(1120px, 100%)",
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
  listCard: {
    marginTop: "16px",
    borderRadius: "22px",
    backgroundColor: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "16px",
  },
  listHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "12px",
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
    textAlign: "left",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: "12px 12px 11px",
    color: "#FFFFFF",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
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
  },
  stationMeta: {
    display: "block",
    marginTop: "6px",
    color: "rgba(255,255,255,0.74)",
    fontSize: "12px",
    fontWeight: 750,
    lineHeight: 1.45,
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
    gridTemplateColumns: "1fr 1fr",
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
      return "Hata";
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

function StationMapScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = useMemo(() => getOrCreateLocalUserId(), []);
  const { isLoaded, isLoading: mapsLoading, errorMessage: mapsError } =
    useGoogleMapsLoader();
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>("idle");
  const [coords, setCoords] = useState<UserCoordinates | null>(null);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [locationUpdateError, setLocationUpdateError] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [locationUpdateLoading, setLocationUpdateLoading] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationSearch, setStationSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [isNearbyExpanded, setIsNearbyExpanded] = useState(false);
  const vehicleIdRef = useRef("");

  const stationCounts = useMemo(() => {
    const totalStations = mockStations.length;
    const availableStations = mockStations.filter((station) => {
      if (station.status !== "available") {
        return false;
      }

      return station.chargers.some((charger) => charger.status === "available");
    }).length;

    return {
      totalStations,
      availableStations,
    };
  }, []);

  const filteredStations = useMemo(() => {
    const query = stationSearch.trim().toLowerCase();

    return mockStations.filter((station) => {
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

      if (!query) {
        return true;
      }

      const name = station.name?.toLowerCase() ?? "";
      const address = station.address?.toLowerCase() ?? "";
      return name.includes(query) || address.includes(query);
    });
  }, [onlyAvailable, stationSearch]);

  const nearbyStations = useMemo(() => {
    const withDistance = filteredStations.map((station) => {
      if (!coords) {
        return { station, distanceKm: null as number | null };
      }

      return {
        station,
        distanceKm: calculateDistanceInKilometers(coords, station),
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
    const loadVehicle = async () => {
      try {
        const routeState = location.state as StationMapLocationState | null;
        const selectedVehicleId = routeState?.vehicleId;

        const vehicle = selectedVehicleId
          ? await getVehicleById(selectedVehicleId)
          : await getVehicleByUserId(userId);

        setVehicle(vehicle);
        setVehicleId(vehicle?.id ?? "");
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

  const requestLocation = useCallback(
    async ({ persistToVehicle = false }: RequestLocationOptions = {}) => {
      setPermissionState("loading");
      setMessage("Konum izni isteniyor ve guncel konum alinmaya calisiliyor.");
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
            ? "Konum izni verilmedi. Vehicle konumu guncellenemedi."
            : result.message,
        );
        return;
      }

      if (!vehicleIdRef.current) {
        setLocationUpdateLoading(false);
        setLocationUpdateError(
          "Konum alindi ancak guncellenecek vehicle kaydi bulunamadi.",
        );
        return;
      }

      try {
        await updateVehicleCurrentLocation(
          vehicleIdRef.current,
          result.currentLocation,
        );
        setSuccessMessage(
          "Konum guncellendi, harita merkeze alindi ve Firestore'a yazildi.",
        );
      } catch {
        setLocationUpdateError("Konum Firestore'a kaydedilirken bir hata olustu.");
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

  const handleSelectStation = (station: Station) => {
    setSelectedStation(station);
  };

  const handleCloseStationCard = () => {
    setSelectedStation(null);
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

            <h1 style={styles.title}>Bulundugun noktaya odakli istasyon haritasi</h1>
            <p style={styles.summaryText}>
              Konum izni verildiginde sistem mevcut konumunu algilar, Google
              Maps haritasini acip yakindaki istasyon marker&apos;larini ayni
              ekranda gosterir.
            </p>

            <div style={styles.locationStrip}>
              <div>
                <div style={styles.locationStatus}>Guncel konum</div>
                <div style={styles.locationValue}>
                  {coords ? formatCoordinates(coords) : "Konum bekleniyor"}
                </div>
              </div>
              <div style={styles.chip}>{getStatusText(permissionState)}</div>
            </div>

            {selectedStation && (
              <div style={styles.selectedRow}>
                <div style={styles.selectedLabel}>Secili istasyon</div>
                <div style={styles.selectedValue}>{selectedStation.name}</div>
              </div>
            )}

            <div style={styles.filterCard}>
              <p style={styles.filterTitle}>Arama ve Filtre</p>
              <input
                value={stationSearch}
                onChange={(event) => setStationSearch(event.target.value)}
                placeholder="İstasyon adı veya adres ara..."
                style={styles.searchInput}
              />

              <div style={styles.filterRow}>
                <button
                  type="button"
                  style={{
                    ...styles.filterToggle,
                    ...(onlyAvailable ? styles.filterToggleActive : {}),
                  }}
                  onClick={() => setOnlyAvailable((current) => !current)}
                >
                  Sadece uygun
                </button>
              </div>
            </div>

            <div style={styles.listCard}>
              <div style={styles.listHeader}>
                <p style={styles.listTitle}>Yakınımdakiler</p>
                <div style={styles.listCount}>{filteredStations.length} istasyon</div>
              </div>

              <div style={styles.stationList}>
                {visibleNearbyStations.map(({ station, distanceKm }) => {
                  const isActive = station.id === selectedStation?.id;
                  const distanceLabel =
                    distanceKm == null
                      ? "Konum yok"
                      : distanceKm < 1
                        ? `${Math.round(distanceKm * 1000)} m`
                        : `${distanceKm.toFixed(1)} km`;

                  return (
                    <button
                      key={station.id}
                      type="button"
                      style={{
                        ...styles.stationButton,
                        ...(isActive ? styles.stationButtonActive : {}),
                      }}
                      onClick={() => setSelectedStation(station)}
                    >
                      <span style={styles.stationName}>{station.name}</span>
                      <span style={styles.stationMeta}>
                        {distanceLabel} · {station.status}
                      </span>
                    </button>
                  );
                })}
              </div>

              {nearbyStations.length > 3 && (
                <button
                  type="button"
                  style={styles.listToggle}
                  onClick={() => setIsNearbyExpanded((current) => !current)}
                >
                  <span>{isNearbyExpanded ? "Daha az goster" : "Tumunu goster"}</span>
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
              <div style={styles.metricLabel}>Konum</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{stationCounts.totalStations}</div>
              <div style={styles.metricLabel}>Istasyon</div>
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
              <h2 style={styles.panelTitle}>Istasyon Haritasi</h2>
              <p style={styles.subtitle}>
                Kullanici konumu mavi marker ile, istasyon durumlari ise renkli
                marker&apos;larla gosterilir. Konum izni yoksa harita yerine ayni
                tasarim dilinde bilgilendirme karti gorunur.
              </p>
            </div>

            <div style={styles.statusWrap}>
              <div style={styles.statusValue}>{progressValue}%</div>
              <div style={styles.statusLabel}>Harita durumu</div>
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

          <div style={styles.sectionLabel}>Konum ve Marker Durumu</div>

          <div style={styles.card}>
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Izin</div>
                <div style={styles.infoValue}>{getStatusText(permissionState)}</div>
              </div>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Koordinatlar</div>
                <div style={styles.infoValue}>{formatCoordinates(coords)}</div>
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

            {shouldShowMap ? (
              <div style={styles.mapFrame}>
                <MapView
                  userLocation={coords}
                  stations={filteredStations}
                  selectedStationId={selectedStation?.id ?? null}
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
                  <h3 style={styles.warningTitle}>Harita kullanilamiyor</h3>
                  <p style={styles.warningText}>
                    {permissionState === "denied"
                      ? "Konum izni verilmeden harita gosterilemez."
                      : mapsError || "Harita su anda hazir degil."}
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
                {locationUpdateLoading ? "Guncelleniyor..." : "Konumumu Guncelle"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                style={styles.secondaryButton}
                disabled={locationUpdateLoading}
              >
                Arac Profiline Don
              </button>
            </div>
          </div>
        </section>
      </main>

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
