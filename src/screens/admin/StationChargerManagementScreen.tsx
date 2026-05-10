import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleMap, Marker } from "@react-google-maps/api";
import type { Charger, ChargerConnectorType, ChargerPowerOutput, ChargerStatus, ChargerType } from "../../models/Charger";
import type { Station, StationStatus } from "../../models/Station";
import { getChargersByStationId, upsertCharger } from "../../services/firebase/chargerService";
import { getStationsWithChargers, updateStationChargerIds, upsertStation } from "../../services/firebase/stationService";
import { DEFAULT_MAP_CENTER, MAP_OPTIONS } from "../../constants/mapConstants";
import { useGoogleMapsLoader } from "../../services/maps/googleMapsLoader";
import { reverseGeocodeCoordinates } from "../../services/maps/geocodingService";

const styles: Record<string, CSSProperties> = {
  headerRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 950,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#5B736A",
    fontSize: "13px",
    fontWeight: 800,
    lineHeight: 1.6,
    maxWidth: "760px",
  },
  actions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  primaryButton: {
    border: "none",
    cursor: "pointer",
    borderRadius: "999px",
    padding: "12px 16px",
    fontWeight: 950,
    fontFamily: "inherit",
    color: "#FFFFFF",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 50%, #9CE45A 160%)",
    boxShadow: "0 16px 30px rgba(31,94,77,0.22), 0 0 18px rgba(184,240,97,0.28)",
  },
  ghostButton: {
    border: "1px solid rgba(31, 94, 77, 0.20)",
    cursor: "pointer",
    borderRadius: "999px",
    padding: "12px 14px",
    fontWeight: 950,
    fontFamily: "inherit",
    color: "#1F5E4D",
    backgroundColor: "rgba(255,255,255,0.86)",
  },
  toolbar: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: "12px",
    alignItems: "end",
  },
  field: { display: "grid", gap: "8px" },
  label: {
    fontSize: "12px",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#4B6B60",
  },
  input: {
    width: "100%",
    minHeight: "44px",
    borderRadius: "14px",
    border: "1px solid rgba(31, 94, 77, 0.18)",
    backgroundColor: "rgba(255,255,255,0.86)",
    padding: "10px 12px",
    fontFamily: "inherit",
    fontWeight: 850,
    color: "#17231F",
    outline: "none",
    boxSizing: "border-box",
  },
  shell: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: "14px",
    alignItems: "start",
  },
  card: {
    borderRadius: "22px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,253,250,0.92) 100%)",
    boxShadow: "0 18px 52px rgba(23,35,31,0.08)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "14px 14px 12px",
    borderBottom: "1px solid rgba(31, 94, 77, 0.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    background:
      "radial-gradient(circle at 12% 18%, rgba(169,216,105,0.20), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58))",
  },
  cardTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#355A4E",
  },
  list: {
    display: "grid",
    gap: "10px",
    padding: "14px",
    maxHeight: "calc(100vh - 330px)",
    overflow: "auto",
  },
  stationItem: {
    borderRadius: "18px",
    border: "1px solid rgba(31, 94, 77, 0.14)",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: "12px",
    cursor: "pointer",
    transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
  },
  stationItemActive: {
    borderColor: "rgba(31, 94, 77, 0.28)",
    boxShadow: "0 18px 44px rgba(31,94,77,0.14)",
    transform: "translateY(-1px)",
  },
  stationName: { margin: 0, fontWeight: 1000, fontSize: "14px", color: "#10352E" },
  stationMeta: { marginTop: "4px", fontSize: "12px", fontWeight: 850, color: "#5B736A", lineHeight: 1.45 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "999px",
    padding: "8px 10px",
    fontSize: "12px",
    fontWeight: 950,
    border: "1px solid rgba(31, 94, 77, 0.20)",
    backgroundColor: "rgba(239, 248, 231, 0.8)",
    color: "#1F5E4D",
    whiteSpace: "nowrap",
  },
  dot: {
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    backgroundColor: "#B8F061",
    boxShadow: "0 0 16px rgba(184,240,97,0.9)",
  },
  empty: {
    padding: "18px",
    textAlign: "center",
    color: "#66756E",
    fontSize: "14px",
    fontWeight: 850,
    lineHeight: 1.6,
  },
  rightBody: { padding: "14px" },
  infoTitle: { margin: 0, fontSize: "18px", fontWeight: 1000, color: "#10352E" },
  infoText: { margin: "8px 0 0", color: "#5B736A", fontSize: "13px", lineHeight: 1.6, fontWeight: 800 },
  split: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px" },
  chargerGrid: { display: "grid", gap: "12px", marginTop: "14px" },
  chargerCard: {
    borderRadius: "20px",
    border: "1px solid rgba(31, 94, 77, 0.14)",
    backgroundColor: "rgba(255,255,255,0.90)",
    padding: "12px",
    boxShadow: "0 14px 40px rgba(23,35,31,0.06)",
  },
  chargerTop: { display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" },
  chargerTitle: { margin: 0, fontWeight: 1000, fontSize: "14px", color: "#10352E" },
  chargerMeta: { marginTop: "6px", fontSize: "12px", fontWeight: 850, color: "#5B736A", lineHeight: 1.45 },
  smallButton: {
    border: "1px solid rgba(31, 94, 77, 0.18)",
    backgroundColor: "rgba(255,255,255,0.85)",
    color: "#1F5E4D",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "12px",
    fontWeight: 950,
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
    backgroundColor: "rgba(15, 31, 27, 0.32)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 1400,
  },
  modal: {
    width: "min(640px, 100%)",
    borderRadius: "22px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "20px",
    boxShadow: "0 16px 30px rgba(31,94,77,0.10)",
  },
  modalTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
  },
  modalTitle: { margin: 0, fontSize: "20px", fontWeight: 950, color: "#17231F" },
  modalSubtitle: { margin: "6px 0 0", fontSize: "13px", color: "#5B736A", fontWeight: 800, lineHeight: 1.6 },
  modalClose: {
    minHeight: "40px",
    minWidth: "40px",
    padding: "0 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "14px",
    color: "#1F5E4D",
    fontSize: "14px",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  form: { display: "grid", gap: "12px", marginTop: "10px" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "end" },
  message: {
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: 1.55,
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
    color: "#A63E30",
    fontWeight: 850,
  },
  modalActions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px" },
  saveButton: {
    minHeight: "44px",
    padding: "10px 12px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  cancelButton: {
    minHeight: "44px",
    padding: "10px 12px",
    border: "1px solid #AFCDBB",
    borderRadius: "12px",
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    fontSize: "14px",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  mapWrap: {
    marginTop: "12px",
    borderRadius: "18px",
    overflow: "hidden",
    border: "1px solid rgba(31, 94, 77, 0.14)",
    backgroundColor: "#F4F9F5",
    boxShadow: "0 14px 40px rgba(23,35,31,0.06)",
  },
  mapHeader: {
    padding: "14px 14px 12px",
    borderBottom: "1px solid rgba(31, 94, 77, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    background:
      "radial-gradient(circle at 10% 18%, rgba(169,216,105,0.18), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))",
  },
  mapTitle: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#355A4E",
  },
  mapHint: {
    margin: "8px 12px 0",
    color: "#5B736A",
    fontSize: "12px",
    lineHeight: 1.6,
    fontWeight: 800,
  },
  tabRow: {
    display: "flex",
    gap: "10px",
    padding: "12px 14px 14px",
    backgroundColor: "rgba(255,255,255,0.66)",
    borderBottom: "1px solid rgba(31, 94, 77, 0.10)",
  },
  tab: {
    borderRadius: "999px",
    border: "1px solid rgba(31, 94, 77, 0.18)",
    backgroundColor: "rgba(255,255,255,0.86)",
    padding: "10px 12px",
    fontWeight: 950,
    color: "#1F5E4D",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "13px",
    minHeight: "44px",
    minWidth: "104px",
  },
  tabActive: {
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    border: "1px solid rgba(23,60,52,0.2)",
    boxShadow: "0 14px 26px rgba(31,94,77,0.18)",
  },
  searchWrap: {
    padding: "12px",
    borderBottom: "1px solid rgba(31, 94, 77, 0.10)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  suggestionList: {
    marginTop: "10px",
    display: "grid",
    gap: "8px",
    maxHeight: "200px",
    overflow: "auto",
  },
  suggestionItem: {
    borderRadius: "14px",
    border: "1px solid rgba(31, 94, 77, 0.14)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: "10px 12px",
    cursor: "pointer",
  },
  suggestionTitle: { margin: 0, fontWeight: 950, color: "#10352E", fontSize: "13px" },
  suggestionSub: { marginTop: "4px", fontWeight: 800, color: "#5B736A", fontSize: "12px", lineHeight: 1.4 },
};

const STATION_STATUS_OPTIONS: StationStatus[] = ["available", "offline"];
const CHARGER_TYPE_OPTIONS: ChargerType[] = ["AC", "DC"];
const CHARGER_POWER_OPTIONS: ChargerPowerOutput[] = ["22kW", "50kW", "150kW"];
const CHARGER_CONNECTOR_OPTIONS: ChargerConnectorType[] = ["Type 2", "CCS", "CHAdeMO"];
const CHARGER_STATUS_OPTIONS: ChargerStatus[] = ["available", "occupied", "offline"];

function stationStatusLabel(status: StationStatus) {
  if (status === "available") return "Available";
  if (status === "occupied") return "Occupied";
  return "Offline";
}

function chargerStatusLabel(status: ChargerStatus) {
  if (status === "available") return "Available";
  if (status === "occupied") return "Occupied";
  return "Offline";
}

type StationDraft = {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  status: StationStatus;
  operatingOpen: string;
  operatingClose: string;
  is24Hours: boolean;
};

type ChargerDraft = {
  id: string;
  type: ChargerType;
  powerOutput: ChargerPowerOutput;
  connectorType: ChargerConnectorType;
  pricePerKwh: string;
  status: ChargerStatus;
};

function makeStationDraft(station: Station | null): StationDraft {
  return {
    id: station?.id ?? "",
    name: station?.name ?? "",
    address: station?.address ?? "",
    latitude: station ? String(station.latitude) : "",
    longitude: station ? String(station.longitude) : "",
    status: station?.manualOffline ? "offline" : "available",
    operatingOpen: station?.operatingHours?.open ?? "08:00",
    operatingClose: station?.operatingHours?.close ?? "23:00",
    is24Hours: station?.operatingHours?.is24Hours ?? false,
  };
}

function makeChargerDraft(charger: Charger | null): ChargerDraft {
  return {
    id: charger?.id ?? "",
    type: charger?.type ?? "AC",
    powerOutput: charger?.powerOutput ?? "22kW",
    connectorType: charger?.connectorType ?? "Type 2",
    pricePerKwh: charger ? String(charger.pricePerKwh) : "",
    status: charger?.status ?? "offline",
  };
}

type LatLng = { lat: number; lng: number };

function safeParseLatLng(latText: string, lngText: string): LatLng | null {
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  return { lat, lng };
}

type LocationMode = "map" | "search";

export default function StationChargerManagementScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapsLoader = useGoogleMapsLoader();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);

  const [queryText, setQueryText] = useState("");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [stationModalEditingId, setStationModalEditingId] = useState<string | null>(null);
  const [stationDraft, setStationDraft] = useState<StationDraft>(makeStationDraft(null));
  const [stationSaving, setStationSaving] = useState(false);
  const [stationError, setStationError] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [pickedLatLng, setPickedLatLng] = useState<LatLng | null>(null);
  const [pickedAddressLabel, setPickedAddressLabel] = useState<string>("");
  const [pickedFullAddress, setPickedFullAddress] = useState<string>("");
  const [pickedAddressLoading, setPickedAddressLoading] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>("map");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<
    Array<{ placeId: string; primaryText: string; secondaryText: string }>
  >([]);
  const placeDebounceRef = useRef<number | null>(null);

  const [chargerModalOpen, setChargerModalOpen] = useState(false);
  const [chargerModalEditingId, setChargerModalEditingId] = useState<string | null>(null);
  const [chargerDraft, setChargerDraft] = useState<ChargerDraft>(makeChargerDraft(null));
  const [chargerSaving, setChargerSaving] = useState(false);
  const [chargerError, setChargerError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    setError(null);
    getStationsWithChargers()
      .then((items) => {
        setStations(items);
        if (!selectedStationId && items.length > 0) {
          setSelectedStationId(items[0]?.id ?? null);
        }
      })
      .catch(() => {
        setError("Veriler alinamadi. Firestore baglantisini kontrol edin.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStations = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter((s) => {
      const blob = `${s.id} ${s.name} ${s.address}`.toLowerCase();
      return blob.includes(q);
    });
  }, [queryText, stations]);

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) ?? null;
  }, [stations, selectedStationId]);

  const openNewStation = () => {
    setStationModalEditingId(null);
    setStationDraft(makeStationDraft(null));
    setStationError(null);
    setPickedLatLng(null);
    setPickedAddressLabel("");
    setPickedFullAddress("");
    setStationModalOpen(true);
  };

  const openEditStation = (station: Station) => {
    setStationModalEditingId(station.id);
    setStationDraft(makeStationDraft(station));
    setStationError(null);
    setPickedLatLng({ lat: station.latitude, lng: station.longitude });
    setPickedAddressLabel(station.address);
    setPickedFullAddress(station.address);
    setStationModalOpen(true);
  };

  const openNewCharger = () => {
    if (!selectedStation) return;
    setChargerModalEditingId(null);
    setChargerDraft(makeChargerDraft(null));
    setChargerError(null);
    setChargerModalOpen(true);
  };

  const openEditCharger = (charger: Charger) => {
    setChargerModalEditingId(charger.id);
    setChargerDraft(makeChargerDraft(charger));
    setChargerError(null);
    setChargerModalOpen(true);
  };

  useEffect(() => {
    if (!mapsLoader.isLoaded) {
      setPlaceSuggestions([]);
      return;
    }

    const q = placeQuery.trim();
    if (q.length < 3) {
      setPlaceSuggestions([]);
      return;
    }

    if (placeDebounceRef.current) {
      window.clearTimeout(placeDebounceRef.current);
    }

    placeDebounceRef.current = window.setTimeout(() => {
      try {
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input: q,
            language: "tr",
            componentRestrictions: { country: "tr" },
          },
          (predictions, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
              setPlaceSuggestions([]);
              return;
            }

            setPlaceSuggestions(
              predictions.slice(0, 8).map((p) => ({
                placeId: p.place_id,
                primaryText: p.structured_formatting?.main_text ?? p.description ?? "",
                secondaryText: p.structured_formatting?.secondary_text ?? "",
              })),
            );
          },
        );
      } catch {
        setPlaceSuggestions([]);
      }
    }, 220);

    return () => {
      if (placeDebounceRef.current) {
        window.clearTimeout(placeDebounceRef.current);
        placeDebounceRef.current = null;
      }
    };
  }, [mapsLoader.isLoaded, placeQuery]);

  const saveStation = async () => {
    setStationError(null);
    const id = stationDraft.id.trim();
    const name = stationDraft.name.trim();
    const address = stationDraft.address.trim();
    const parsed = safeParseLatLng(stationDraft.latitude, stationDraft.longitude);

    if (!id) {
      setStationError("Station ID bos birakilamaz.");
      return;
    }
    if (!name) {
      setStationError("Istasyon adi bos birakilamaz.");
      return;
    }
    if (!address) {
      setStationError("Adres bos birakilamaz.");
      return;
    }
    if (!parsed) {
      setStationError("Konum secilmelidir (harita veya arama ile).");
      return;
    }
    if (
      !stationDraft.is24Hours &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(stationDraft.operatingOpen) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(stationDraft.operatingClose))
    ) {
      setStationError("Calisma saatleri HH:mm formatinda olmalidir.");
      return;
    }

    setStationSaving(true);
    try {
      const existing = stations.find((s) => s.id === id) ?? null;
      const chargers = existing?.chargers ?? [];

      await upsertStation({
        id,
        name,
        address,
        latitude: parsed.lat,
        longitude: parsed.lng,
        status: stationDraft.status,
        operatingHours: {
          open: stationDraft.operatingOpen,
          close: stationDraft.operatingClose,
          is24Hours: stationDraft.is24Hours,
        },
        chargers,
      });

      setStationModalOpen(false);
      setSelectedStationId(id);
      refresh();

      navigate(location.pathname, {
        replace: true,
        state: { snackbar: { message: "Istasyon kaydedildi.", variant: "success" } },
      });
    } catch {
      setStationError("Istasyon kaydedilemedi.");
    } finally {
      setStationSaving(false);
    }
  };

  const saveCharger = async () => {
    if (!selectedStation) return;
    setChargerError(null);

    const id = chargerDraft.id.trim();
    if (!id) {
      setChargerError("Charger ID bos birakilamaz.");
      return;
    }

    const price = Number(chargerDraft.pricePerKwh);
    if (!Number.isFinite(price) || price < 0) {
      setChargerError("Gecerli bir kWh ucreti girin.");
      return;
    }

    setChargerSaving(true);
    try {
      const charger: Charger = {
        id,
        stationId: selectedStation.id,
        type: chargerDraft.type,
        powerOutput: chargerDraft.powerOutput,
        connectorType: chargerDraft.connectorType,
        pricePerKwh: price,
        status: chargerDraft.status,
      };

      await upsertCharger(charger);

      const chargers = await getChargersByStationId(selectedStation.id);
      const chargerIds = chargers.map((c) => c.id).sort((a, b) => a.localeCompare(b, "tr"));
      await updateStationChargerIds(selectedStation.id, chargerIds);

      setChargerModalOpen(false);
      refresh();

      navigate(location.pathname, {
        replace: true,
        state: { snackbar: { message: "Sarj cihazi kaydedildi.", variant: "success" } },
      });
    } catch {
      setChargerError("Sarj cihazi kaydedilemedi.");
    } finally {
      setChargerSaving(false);
    }
  };

  const updatePickedLocation = async (coords: LatLng) => {
    setPickedLatLng(coords);
    setPickedAddressLoading(true);
    try {
      const result = await reverseGeocodeCoordinates({ lat: coords.lat, lng: coords.lng });
      const label = result?.label?.trim() ?? "";
      const full = result?.fullAddress?.trim() ?? "";
      const fallback = label || full || "Secilen konum";

      setPickedAddressLabel(fallback);
      setPickedFullAddress(full || fallback);
    } finally {
      setPickedAddressLoading(false);
    }
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Istasyon & Sarj Cihazi Yonetimi</h2>
          <p style={styles.subtitle}>
            Istasyonlari ve sarj cihazlarini Firestore'a ekleyin/guncelleyin. Secili istasyona ait charger'lari sag panelden yonetin.
          </p>
        </div>
        <div style={styles.actions}>
          <button type="button" style={styles.ghostButton} onClick={() => refresh()}>
            Yenile
          </button>
          <button type="button" style={styles.primaryButton} onClick={() => openNewStation()}>
            Yeni Istasyon
          </button>
        </div>
      </div>

      <div className="admin-manage-toolbar" style={styles.toolbar}>
        <div style={styles.field}>
          <div style={styles.label}>Arama</div>
          <input
            style={styles.input}
            placeholder="Istasyon adi / ID / adres..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
        </div>
        <div style={styles.field}>
          <div style={styles.label}>Secili</div>
          <select
            style={styles.input}
            value={selectedStationId ?? ""}
            onChange={(e) => setSelectedStationId(e.target.value || null)}
          >
            <option value="" disabled>
              Istasyon secin
            </option>
            {filteredStations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div style={{ ...styles.card, marginTop: "14px", padding: "14px", fontWeight: 850 }}>Yukleniyor...</div>}
      {!loading && error && <div style={{ ...styles.card, marginTop: "14px", padding: "14px", fontWeight: 850 }}>{error}</div>}

      {!loading && !error && (
        <div className="admin-manage-shell" style={styles.shell}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <p style={styles.cardTitle}>Istasyonlar</p>
              <span style={styles.badge}>
                <span style={styles.dot} />
                {filteredStations.length}
              </span>
            </div>
            {filteredStations.length === 0 ? (
              <div style={styles.empty}>Kayitli istasyon yok.</div>
            ) : (
              <div style={styles.list}>
                {filteredStations.map((station) => (
                  <div
                    key={station.id}
                    style={{
                      ...styles.stationItem,
                      ...(station.id === selectedStationId ? styles.stationItemActive : {}),
                    }}
                    onClick={() => setSelectedStationId(station.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedStationId(station.id);
                    }}
                  >
                    <p style={styles.stationName}>{station.name}</p>
                    <div style={styles.stationMeta}>
                      {station.address} <br />
                      {stationStatusLabel(station.status)} - {station.chargers?.length ?? 0} charger
                    </div>
                    <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        style={styles.smallButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditStation(station);
                        }}
                      >
                        Duzenle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <p style={styles.cardTitle}>Charger'lar</p>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button type="button" style={styles.smallButton} onClick={() => openNewCharger()} disabled={!selectedStation}>
                  Yeni Charger
                </button>
              </div>
            </div>

            {!selectedStation ? (
              <div style={styles.empty}>Sag paneli kullanmak icin bir istasyon secin.</div>
            ) : (
              <div style={styles.rightBody}>
                <h3 style={styles.infoTitle}>{selectedStation.name}</h3>
                <p style={styles.infoText}>{selectedStation.address}</p>

                <div style={styles.split}>
                  <div style={{ ...styles.chargerCard, backgroundColor: "rgba(239, 248, 231, 0.55)" }}>
                    <div style={{ ...styles.label, marginBottom: "8px" }}>Istasyon Durumu</div>
                    <div style={{ fontSize: "16px", fontWeight: 1000, color: "#10352E" }}>
                      {stationStatusLabel(selectedStation.status)}
                    </div>
                  </div>
                  <div style={{ ...styles.chargerCard, backgroundColor: "rgba(239, 248, 231, 0.55)" }}>
                    <div style={{ ...styles.label, marginBottom: "8px" }}>Charger Sayisi</div>
                    <div style={{ fontSize: "16px", fontWeight: 1000, color: "#10352E" }}>
                      {selectedStation.chargers?.length ?? 0}
                    </div>
                  </div>
                </div>

                {selectedStation.chargers?.length ? (
                  <div style={styles.chargerGrid}>
                    {selectedStation.chargers.map((charger) => (
                      <div key={charger.id} style={styles.chargerCard}>
                        <div style={styles.chargerTop}>
                          <div>
                            <p style={styles.chargerTitle}>Charger {charger.id}</p>
                            <div style={styles.chargerMeta}>
                              {charger.type} - {charger.powerOutput} - {charger.connectorType} <br />
                              {chargerStatusLabel(charger.status)} - TL{charger.pricePerKwh}/kWh
                            </div>
                          </div>
                          <button type="button" style={styles.smallButton} onClick={() => openEditCharger(charger)}>
                            Duzenle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ ...styles.empty, marginTop: "14px" }}>
                    Bu istasyonda charger yok. "Yeni Charger" ile ekleyin.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {stationModalOpen && (
        <div style={styles.overlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <div style={styles.modalTop}>
              <div>
                <h3 style={styles.modalTitle}>{stationModalEditingId ? "Istasyon Duzenle" : "Yeni Istasyon"}</h3>
                <p style={styles.modalSubtitle}>Istasyon bilgilerini doldurun. ID alani dokuman ID olarak kullanilir.</p>
              </div>
              <button type="button" style={styles.modalClose} onClick={() => setStationModalOpen(false)}>
                Kapat
              </button>
            </div>

            {stationError && <div style={styles.message}>{stationError}</div>}

            <div style={styles.form}>
              <div style={styles.row2}>
                <div style={styles.field}>
                  <div style={styles.label}>Station ID</div>
                  <input
                    style={styles.input}
                    value={stationDraft.id}
                    onChange={(e) => setStationDraft((p) => ({ ...p, id: e.target.value }))}
                    placeholder="station-izmir-001"
                    disabled={Boolean(stationModalEditingId)}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Durum</div>
                  <select
                    style={styles.input}
                    value={stationDraft.status}
                    onChange={(e) => setStationDraft((p) => ({ ...p, status: e.target.value as StationStatus }))}
                  >
                    {STATION_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {stationStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: "8px", color: "#5B736A", fontSize: "12px", fontWeight: 800, lineHeight: 1.5 }}>
                    Occupied elle secilemez; tum online charger&apos;lar doluysa otomatik atanir.
                  </div>
                </div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Istasyon Adi</div>
                <input
                  style={styles.input}
                  value={stationDraft.name}
                  onChange={(e) => setStationDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Bornova EV Station"
                />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Adres</div>
                <input
                  style={styles.input}
                  value={stationDraft.address}
                  onChange={(e) => setStationDraft((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Bornova Meydani, Izmir"
                />
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <div style={styles.label}>Acilis Saati</div>
                  <input
                    type="time"
                    style={styles.input}
                    value={stationDraft.operatingOpen}
                    onChange={(e) =>
                      setStationDraft((p) => ({
                        ...p,
                        operatingOpen: e.target.value,
                      }))
                    }
                    disabled={stationDraft.is24Hours}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Kapanis Saati</div>
                  <input
                    type="time"
                    style={styles.input}
                    value={stationDraft.operatingClose}
                    onChange={(e) =>
                      setStationDraft((p) => ({
                        ...p,
                        operatingClose: e.target.value,
                      }))
                    }
                    disabled={stationDraft.is24Hours}
                  />
                </div>
              </div>

              <label style={{ display: "flex", gap: "10px", alignItems: "center", color: "#263A33", fontSize: "13px", fontWeight: 850 }}>
                <input
                  type="checkbox"
                  checked={stationDraft.is24Hours}
                  onChange={(e) =>
                    setStationDraft((p) => ({
                      ...p,
                      is24Hours: e.target.checked,
                    }))
                  }
                />
                24 saat acik
              </label>

              <div style={styles.field}>
                <button
                  type="button"
                  style={styles.ghostButton}
                  onClick={() => {
                    const parsed = safeParseLatLng(stationDraft.latitude, stationDraft.longitude);
                    if (parsed) {
                      updatePickedLocation(parsed);
                    } else {
                      setPickedLatLng(null);
                      setPickedAddressLabel(stationDraft.address.trim());
                      setPickedFullAddress(stationDraft.address.trim());
                    }
                    setLocationPickerOpen(true);
                  }}
                >
                  Konum sec (harita / arama)
                </button>
                <div style={{ marginTop: "8px", color: "#5B736A", fontSize: "12px", fontWeight: 800, lineHeight: 1.6 }}>
                  Koordinat gosterilmez. Konumu haritadan veya arama ile sectiginizde en yakin adres/semt bilgisi otomatik doldurulur.
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button type="button" style={styles.saveButton} disabled={stationSaving} onClick={() => saveStation()}>
                {stationSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button type="button" style={styles.cancelButton} onClick={() => setStationModalOpen(false)}>
                Vazgec
              </button>
            </div>
          </div>
        </div>
      )}

      {locationPickerOpen && (
        <div style={styles.overlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <div style={styles.modalTop}>
              <div>
                <h3 style={styles.modalTitle}>Konum Sec</h3>
                <p style={styles.modalSubtitle}>Harita veya arama ile secin. Secim sonrasi koordinat degil, adres/semt gosterilir.</p>
              </div>
              <button type="button" style={styles.modalClose} onClick={() => setLocationPickerOpen(false)}>
                Kapat
              </button>
            </div>

            {mapsLoader.errorMessage ? (
              <div style={styles.message}>{mapsLoader.errorMessage}</div>
            ) : (
              <div style={styles.mapWrap}>
                <div style={styles.mapHeader}>
                  <p style={styles.mapTitle}>Harita</p>
                  <span style={styles.badge}>
                    <span style={styles.dot} />
                    {pickedAddressLoading ? "Adres bulunuyor..." : pickedAddressLabel || "Konum secin"}
                  </span>
                </div>
                <div style={styles.tabRow}>
                  <button
                    type="button"
                    style={{ ...styles.tab, ...(locationMode === "map" ? styles.tabActive : {}) }}
                    onClick={() => setLocationMode("map")}
                  >
                    Harita
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.tab, ...(locationMode === "search" ? styles.tabActive : {}) }}
                    onClick={() => setLocationMode("search")}
                  >
                    Ara
                  </button>
                </div>

                {locationMode === "search" && (
                  <div style={styles.searchWrap}>
                    <div style={styles.field}>
                      <div style={styles.label}>Arama</div>
                      <input
                        style={styles.input}
                        placeholder="Ilce / semt / cadde / yer adi..."
                        value={placeQuery}
                        onChange={(e) => setPlaceQuery(e.target.value)}
                      />
                    </div>

                    {placeSuggestions.length > 0 && (
                      <div style={styles.suggestionList}>
                        {placeSuggestions.map((sug) => (
                          <div
                            key={sug.placeId}
                            style={styles.suggestionItem}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (!mapsLoader.isLoaded) return;
                              const mapDiv = document.createElement("div");
                              const service = new google.maps.places.PlacesService(mapDiv);
                              service.getDetails(
                                { placeId: sug.placeId, fields: ["geometry", "formatted_address", "name"] },
                                (place, status) => {
                                  if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
                                    return;
                                  }
                                  const lat = place.geometry.location.lat();
                                  const lng = place.geometry.location.lng();
                                  updatePickedLocation({ lat, lng });
                                  const full = place.formatted_address?.trim() ?? "";
                                  const label = (place.name?.trim() ?? "") || sug.primaryText;
                                  setPickedAddressLabel(label);
                                  setPickedFullAddress(full || label);
                                  setPlaceSuggestions([]);
                                  setPlaceQuery(label);
                                },
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              (e.currentTarget as HTMLDivElement).click();
                            }}
                          >
                            <p style={styles.suggestionTitle}>{sug.primaryText}</p>
                            <div style={styles.suggestionSub}>{sug.secondaryText}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={styles.mapHint}>
                  Ipucu: Istasyonun tam noktasini secmek icin yakinlastirin. Yanlis secimi duzeltmek icin tekrar tiklayabilirsiniz.
                </div>

                <div style={{ height: "420px" }}>
                  {mapsLoader.isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={pickedLatLng ?? safeParseLatLng(stationDraft.latitude, stationDraft.longitude) ?? DEFAULT_MAP_CENTER}
                      zoom={pickedLatLng ? 15 : 13}
                      options={MAP_OPTIONS}
                      onClick={(e) => {
                        const lat = e.latLng?.lat();
                        const lng = e.latLng?.lng();
                        if (typeof lat !== "number" || typeof lng !== "number") return;
                        updatePickedLocation({ lat, lng });
                      }}
                    >
                      {pickedLatLng && (
                        <Marker
                          position={pickedLatLng}
                          draggable
                          onDragEnd={(e) => {
                            const lat = e.latLng?.lat();
                            const lng = e.latLng?.lng();
                            if (typeof lat !== "number" || typeof lng !== "number") return;
                            updatePickedLocation({ lat, lng });
                          }}
                        />
                      )}
                    </GoogleMap>
                  ) : (
                    <div style={{ padding: "14px", fontWeight: 850, color: "#37594D" }}>
                      Harita yukleniyor...
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.saveButton}
                disabled={!pickedLatLng}
                onClick={() => {
                  if (!pickedLatLng) return;
                  setStationDraft((p) => ({
                    ...p,
                    latitude: String(pickedLatLng.lat),
                    longitude: String(pickedLatLng.lng),
                    address: pickedFullAddress || pickedAddressLabel || p.address,
                  }));
                  setLocationPickerOpen(false);
                }}
              >
                Konumu kullan
              </button>
              <button type="button" style={styles.cancelButton} onClick={() => setLocationPickerOpen(false)}>
                Vazgec
              </button>
            </div>
          </div>
        </div>
      )}

      {chargerModalOpen && selectedStation && (
        <div style={styles.overlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <div style={styles.modalTop}>
              <div>
                <h3 style={styles.modalTitle}>{chargerModalEditingId ? "Charger Duzenle" : "Yeni Charger"}</h3>
                <p style={styles.modalSubtitle}>
                  Secili istasyon: <b>{selectedStation.name}</b> ({selectedStation.id})
                </p>
              </div>
              <button type="button" style={styles.modalClose} onClick={() => setChargerModalOpen(false)}>
                Kapat
              </button>
            </div>

            {chargerError && <div style={styles.message}>{chargerError}</div>}

            <div style={styles.form}>
              <div style={styles.row2}>
                <div style={styles.field}>
                  <div style={styles.label}>Charger ID</div>
                  <input
                    style={styles.input}
                    value={chargerDraft.id}
                    onChange={(e) => setChargerDraft((p) => ({ ...p, id: e.target.value }))}
                    placeholder="charger-izmir-001"
                    disabled={Boolean(chargerModalEditingId)}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Durum</div>
                  <select
                    style={styles.input}
                    value={chargerDraft.status}
                    onChange={(e) => setChargerDraft((p) => ({ ...p, status: e.target.value as ChargerStatus }))}
                  >
                    {CHARGER_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {chargerStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <div style={styles.label}>Tip</div>
                  <select
                    style={styles.input}
                    value={chargerDraft.type}
                    onChange={(e) => setChargerDraft((p) => ({ ...p, type: e.target.value as ChargerType }))}
                  >
                    {CHARGER_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Guc</div>
                  <select
                    style={styles.input}
                    value={chargerDraft.powerOutput}
                    onChange={(e) => setChargerDraft((p) => ({ ...p, powerOutput: e.target.value as ChargerPowerOutput }))}
                  >
                    {CHARGER_POWER_OPTIONS.map((pwr) => (
                      <option key={pwr} value={pwr}>
                        {pwr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.field}>
                  <div style={styles.label}>Konnektor</div>
                  <select
                    style={styles.input}
                    value={chargerDraft.connectorType}
                    onChange={(e) => setChargerDraft((p) => ({ ...p, connectorType: e.target.value as ChargerConnectorType }))}
                  >
                    {CHARGER_CONNECTOR_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>kWh Ucreti (TL)</div>
                  <input
                    style={styles.input}
                    value={chargerDraft.pricePerKwh}
                    onChange={(e) => setChargerDraft((p) => ({ ...p, pricePerKwh: e.target.value }))}
                    placeholder="8.5"
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button type="button" style={styles.saveButton} disabled={chargerSaving} onClick={() => saveCharger()}>
                {chargerSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button type="button" style={styles.cancelButton} onClick={() => setChargerModalOpen(false)}>
                Vazgec
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1100px) {
          .admin-manage-shell {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 780px) {
          .admin-manage-toolbar {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
