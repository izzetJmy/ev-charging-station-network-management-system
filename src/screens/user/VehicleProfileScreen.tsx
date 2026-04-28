import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getVehiclesByUserId,
  TEMP_USER_ID,
  updateVehicle,
} from "../../services/firebase/userService";
import type { Location, Vehicle } from "../../models/Vehicle";

const connectorPresets = ["CCS2", "Type 2", "CHAdeMO", "Tesla"];

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
    display: "grid",
    gridTemplateColumns: "0.85fr 1.15fr",
    borderRadius: "24px",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    boxShadow: "0 24px 70px rgba(28, 74, 61, 0.14)",
  },
  summary: {
    padding: "34px",
    background: "linear-gradient(155deg, #10352E 0%, #1F5E4D 100%)",
    color: "#FFFFFF",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "28px",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: "12px",
    fontWeight: 850,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "12px 0 8px",
    fontSize: "34px",
    lineHeight: 1.12,
    fontWeight: 850,
  },
  summaryText: {
    margin: 0,
    color: "rgba(255,255,255,0.76)",
    fontSize: "14px",
    lineHeight: 1.65,
  },
  plate: {
    display: "inline-flex",
    marginTop: "26px",
    padding: "12px 16px",
    borderRadius: "10px",
    backgroundColor: "#FFFFFF",
    color: "#17231F",
    fontSize: "20px",
    fontWeight: 900,
    letterSpacing: "0.03em",
  },
  metricGrid: {
    display: "grid",
    gap: "10px",
  },
  metric: {
    borderRadius: "14px",
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "14px",
  },
  metricLabel: {
    color: "rgba(255,255,255,0.66)",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },
  metricValue: {
    marginTop: "4px",
    fontSize: "18px",
    fontWeight: 850,
  },
  panel: {
    padding: "36px",
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  panelTitle: {
    margin: "0 0 8px",
    color: "#17231F",
    fontSize: "28px",
    lineHeight: 1.2,
    fontWeight: 850,
  },
  subtitle: {
    margin: "0 0 26px",
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  formGroup: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    color: "#263A33",
    fontWeight: 800,
    marginBottom: "8px",
    fontSize: "13px",
  },
  input: {
    width: "100%",
    minHeight: "46px",
    padding: "12px 14px",
    border: "1px solid #D8E2DB",
    borderRadius: "14px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    backgroundColor: "#FBFDFB",
    color: "#17231F",
    fontFamily: "inherit",
  },
  presetRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
  },
  presetButton: {
    border: "1px solid #D8E2DB",
    borderRadius: "999px",
    padding: "7px 11px",
    backgroundColor: "#FFFFFF",
    color: "#465850",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  presetButtonActive: {
    backgroundColor: "#E8F4DD",
    borderColor: "#A4D65E",
    color: "#1F5E4D",
  },
  vehicleList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
    marginBottom: "22px",
  },
  vehicleButton: {
    minHeight: "58px",
    padding: "10px 12px",
    border: "1px solid #D8E2DB",
    borderRadius: "14px",
    backgroundColor: "#FFFFFF",
    color: "#263A33",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  vehicleButtonActive: {
    borderColor: "#1F5E4D",
    backgroundColor: "#EEF7EC",
    boxShadow: "0 0 0 3px rgba(31,94,77,0.1)",
  },
  vehicleButtonTitle: {
    display: "block",
    fontSize: "13px",
    fontWeight: 850,
    marginBottom: "4px",
  },
  vehicleButtonMeta: {
    display: "block",
    color: "#66756E",
    fontSize: "12px",
    fontWeight: 700,
  },
  locationBox: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    alignItems: "center",
    padding: "14px",
    borderRadius: "16px",
    backgroundColor: "#F1F6F2",
    border: "1px solid #DCE8DF",
    marginBottom: "16px",
  },
  locationText: {
    margin: 0,
    color: "#62736B",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  secondaryButton: {
    minHeight: "42px",
    padding: "0 16px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "999px",
    color: "#1F5E4D",
    fontSize: "13px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  message: {
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: 1.5,
    marginBottom: "14px",
  },
  error: {
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
    color: "#A63E30",
  },
  success: {
    backgroundColor: "#EFF8E7",
    border: "1px solid #BFDE9B",
    color: "#2C6642",
  },
  submitButton: {
    width: "100%",
    minHeight: "52px",
    padding: "14px 16px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    border: "none",
    borderRadius: "16px",
    color: "white",
    fontSize: "15px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  disabledButton: {
    background: "#AEB8B2",
    cursor: "not-allowed",
  },
  navigationButton: {
    width: "100%",
    minHeight: "44px",
    padding: "12px 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "14px",
    color: "#1F5E4D",
    fontSize: "14px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: "12px",
  },
};

function formatLocation(location?: Location | null) {
  if (!location) return "Konum kaydi yok";

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

function VehicleProfileScreen() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [batteryCapacity, setBatteryCapacity] = useState("");
  const [connectorType, setConnectorType] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayName =
    [brand.trim(), model.trim()].filter(Boolean).join(" ") || "Kayitli arac";
  const displayPlate = plateNumber.trim().toUpperCase() || "--";

  const estimatedRange = useMemo(() => {
    const battery = Number(batteryCapacity);
    if (!battery || battery <= 0) return "--";
    return `${Math.round(battery * 5.4)} km`;
  }, [batteryCapacity]);

  const fillVehicleForm = (vehicle: Vehicle) => {
    setVehicleId(vehicle.id);
    setBrand(vehicle.brand ?? "");
    setModel(vehicle.model ?? "");
    setBatteryCapacity(String(vehicle.batteryCapacity ?? ""));
    setConnectorType(vehicle.connectorType ?? "");
    setPlateNumber(vehicle.plateNumber ?? "");
    setCurrentLocation(vehicle.currentLocation ?? null);
  };

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setLoading(true);
        setError("");

        const userVehicles = await getVehiclesByUserId(TEMP_USER_ID);

        setVehicles(userVehicles);

        if (userVehicles.length === 0) {
          setVehicleId("");
          setError("Bu kullanici icin kayitli arac bulunamadi.");
          return;
        }

        fillVehicleForm(userVehicles[0]);
      } catch {
        setError("Arac bilgileri alinirken bir hata olustu.");
      } finally {
        setLoading(false);
      }
    };

    void loadVehicles();
  }, []);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    fillVehicleForm(vehicle);
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!brand.trim()) return "Brand alani bos birakilamaz.";
    if (!model.trim()) return "Model alani bos birakilamaz.";
    if (!batteryCapacity.trim())
      return "Battery Capacity alani bos birakilamaz.";
    if (Number(batteryCapacity) <= 0)
      return "Battery Capacity pozitif bir sayi olmalidir.";
    if (!connectorType.trim()) return "Connector Type alani bos birakilamaz.";
    if (!plateNumber.trim()) return "Plate Number alani bos birakilamaz.";
    return "";
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Tarayiciniz konum ozelligini desteklemiyor.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          updatedAt: new Date(),
        });
        setError("");
        setSuccess("Konum guncellendi. Kaydet butonu ile Firestore'a yazilir.");
        setLocationLoading(false);
      },
      () => {
        setError("Konum izni verilmedi. Mevcut konum korunacak.");
        setLocationLoading(false);
      },
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    if (!vehicleId) {
      setError("Guncellenecek arac kaydi bulunamadi.");
      setSuccess("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateVehicle(vehicleId, {
        userId: TEMP_USER_ID,
        brand: brand.trim(),
        model: model.trim(),
        batteryCapacity: Number(batteryCapacity),
        connectorType: connectorType.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        currentLocation,
      });

      setVehicles((currentVehicles) =>
        currentVehicles.map((vehicle) =>
          vehicle.id === vehicleId
            ? {
                ...vehicle,
                userId: TEMP_USER_ID,
                brand: brand.trim(),
                model: model.trim(),
                batteryCapacity: Number(batteryCapacity),
                connectorType: connectorType.trim(),
                plateNumber: plateNumber.trim().toUpperCase(),
                currentLocation,
                updatedAt: new Date(),
              }
            : vehicle,
        ),
      );
      setSuccess("Arac bilgileri guncellendi.");
    } catch {
      setError("Arac bilgileri guncellenirken bir hata olustu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <main className="vehicle-profile-shell" style={styles.shell}>
        <section style={styles.summary} aria-label="Vehicle summary">
          <div>
            <div style={styles.eyebrow}>EV Network</div>
            <h1 style={styles.title}>{displayName}</h1>
            <p style={styles.summaryText}>
              {vehicles.length} kayitli arac Firestore'dan cekildi. Secili
              aracin bilgilerini burada guncelleyebilirsiniz.
            </p>
            <div style={styles.plate}>{displayPlate}</div>
          </div>

          <div style={styles.metricGrid}>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Battery Capacity</div>
              <div style={styles.metricValue}>
                {batteryCapacity ? `${batteryCapacity} kWh` : "--"}
              </div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Connector Type</div>
              <div style={styles.metricValue}>{connectorType || "--"}</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Current Location</div>
              <div style={styles.metricValue}>
                {formatLocation(currentLocation)}
              </div>
            </div>
          </div>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Arac Profili</h2>
          <p style={styles.subtitle}>
            Brand, model, batarya, soket, plaka ve konum bilgilerini
            guncelleyin.
          </p>

          {loading ? (
            <div style={{ ...styles.message, ...styles.success }}>
              Arac bilgileri yukleniyor...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ ...styles.message, ...styles.error }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{ ...styles.message, ...styles.success }}>
                  {success}
                </div>
              )}

              {vehicles.length > 0 && (
                <div style={styles.vehicleList} aria-label="Kayitli araclar">
                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => handleSelectVehicle(vehicle)}
                      style={{
                        ...styles.vehicleButton,
                        ...(vehicle.id === vehicleId
                          ? styles.vehicleButtonActive
                          : {}),
                      }}
                    >
                      <span style={styles.vehicleButtonTitle}>
                        {[vehicle.brand, vehicle.model]
                          .filter(Boolean)
                          .join(" ") || "Isimsiz arac"}
                      </span>
                      <span style={styles.vehicleButtonMeta}>
                        {vehicle.plateNumber || "Plaka yok"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="form-grid" style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    placeholder="Tesla"
                    style={styles.input}
                    disabled={!vehicleId || saving}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder="Model 3"
                    style={styles.input}
                    disabled={!vehicleId || saving}
                  />
                </div>
              </div>

              <div className="form-grid" style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Battery Capacity</label>
                  <input
                    type="number"
                    value={batteryCapacity}
                    onChange={(event) => setBatteryCapacity(event.target.value)}
                    placeholder="75"
                    style={styles.input}
                    disabled={!vehicleId || saving}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Connector Type</label>
                  <input
                    type="text"
                    value={connectorType}
                    onChange={(event) => setConnectorType(event.target.value)}
                    placeholder="CCS2"
                    style={styles.input}
                    disabled={!vehicleId || saving}
                  />

                  <div style={styles.presetRow}>
                    {connectorPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={!vehicleId || saving}
                        onClick={() => setConnectorType(preset)}
                        style={{
                          ...styles.presetButton,
                          ...(connectorType === preset
                            ? styles.presetButtonActive
                            : {}),
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Plate Number</label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(event) => setPlateNumber(event.target.value)}
                  placeholder="35 ABC 123"
                  style={{ ...styles.input, textTransform: "uppercase" }}
                  disabled={!vehicleId || saving}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Current Location</label>
                <div style={styles.locationBox}>
                  <p style={styles.locationText}>
                    {formatLocation(currentLocation)}
                  </p>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={!vehicleId || saving || locationLoading}
                    style={styles.secondaryButton}
                  >
                    {locationLoading ? "Aliniyor..." : "Konumu Guncelle"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!vehicleId || saving}
                style={{
                  ...styles.submitButton,
                  ...(!vehicleId || saving ? styles.disabledButton : {}),
                }}
              >
                {saving ? "Guncelleniyor..." : "Arac Bilgilerini Guncelle"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/register-vehicle")}
                style={styles.navigationButton}
              >
                Arac Kaydina Git
              </button>
            </form>
          )}

          <div
            style={{ marginTop: "18px", color: "#7A8982", fontSize: "12px" }}
          >
            Tahmini menzil: {estimatedRange}
          </div>
        </section>
      </main>

      <style>{`
        input::placeholder {
          color: #AAB7B0;
          font-size: 14px;
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type=number] {
          -moz-appearance: textfield;
        }

        @media (max-width: 860px) {
          .vehicle-profile-shell {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 560px) {
          .vehicle-profile-shell {
            border-radius: 18px !important;
          }

          .vehicle-profile-shell > section {
            padding: 24px !important;
          }

          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default VehicleProfileScreen;
