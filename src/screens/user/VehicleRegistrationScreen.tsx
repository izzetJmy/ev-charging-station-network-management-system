import { type CSSProperties, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase/firebaseConfig";
import { TEMP_USER_ID } from "../../services/firebase/userService";

interface VehicleLocation {
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

const connectorPresets = ["CCS2", "Type 2", "CHAdeMO", "Tesla"];

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
    display: "grid",
    gridTemplateColumns: "0.95fr 1.05fr",
    borderRadius: "28px",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
    backdropFilter: "blur(14px)",
  },
  previewPanel: {
    minHeight: "620px",
    padding: "34px",
    background:
      "linear-gradient(155deg, #10352E 0%, #1F5E4D 48%, #A9D869 140%)",
    color: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  routeLayer: {
    position: "absolute",
    inset: 0,
    opacity: 0.34,
    backgroundImage:
      "linear-gradient(120deg, transparent 12%, rgba(255,255,255,0.16) 12%, rgba(255,255,255,0.16) 13%, transparent 13%, transparent 52%, rgba(255,255,255,0.14) 52%, rgba(255,255,255,0.14) 53%, transparent 53%), linear-gradient(25deg, transparent 24%, rgba(255,255,255,0.12) 24%, rgba(255,255,255,0.12) 25%, transparent 25%)",
    backgroundSize: "240px 220px, 190px 180px",
  },
  previewContent: {
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
  previewTitle: {
    margin: "34px 0 10px",
    fontSize: "38px",
    lineHeight: 1.08,
    fontWeight: 850,
    maxWidth: "360px",
  },
  previewText: {
    margin: 0,
    maxWidth: "340px",
    color: "rgba(255,255,255,0.76)",
    fontSize: "15px",
    lineHeight: 1.7,
  },
  vehiclePlate: {
    marginTop: "38px",
    borderRadius: "22px",
    backgroundColor: "rgba(255,255,255,0.13)",
    border: "1px solid rgba(255,255,255,0.18)",
    padding: "22px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
  },
  carBody: {
    height: "88px",
    borderRadius: "42px 54px 28px 28px",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(209,238,208,0.88))",
    position: "relative",
    boxShadow: "0 18px 34px rgba(0,0,0,0.2)",
  },
  carCabin: {
    position: "absolute",
    left: "30%",
    top: "-24px",
    width: "35%",
    height: "42px",
    borderRadius: "34px 34px 10px 10px",
    background: "linear-gradient(135deg, #BFE9E2, #FFFFFF)",
    border: "3px solid rgba(255,255,255,0.9)",
  },
  carWheelLeft: {
    position: "absolute",
    left: "16%",
    bottom: "-14px",
    width: "30px",
    height: "30px",
    borderRadius: "999px",
    backgroundColor: "#17231F",
    border: "6px solid #7DA18E",
  },
  carWheelRight: {
    position: "absolute",
    right: "16%",
    bottom: "-14px",
    width: "30px",
    height: "30px",
    borderRadius: "999px",
    backgroundColor: "#17231F",
    border: "6px solid #7DA18E",
  },
  platePreview: {
    marginTop: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  plateCode: {
    backgroundColor: "#FFFFFF",
    color: "#17231F",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "18px",
    fontWeight: 900,
    minWidth: "148px",
    textAlign: "center",
    boxShadow: "0 8px 20px rgba(0,0,0,0.16)",
  },
  statusText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: "12px",
    lineHeight: 1.4,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  },
  metricGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginTop: "34px",
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
  formPanel: {
    padding: "38px",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    marginBottom: "28px",
  },
  title: {
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
  progressWrap: {
    minWidth: "92px",
    textAlign: "right",
  },
  progressValue: {
    fontSize: "26px",
    fontWeight: 900,
    color: "#1F5E4D",
    lineHeight: 1,
  },
  progressLabel: {
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
  sectionLabel: {
    fontSize: "11px",
    fontWeight: 850,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7B8A84",
    marginBottom: "14px",
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
    transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s",
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
  locationBox: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    alignItems: "center",
    padding: "14px",
    borderRadius: "18px",
    backgroundColor: "#F1F6F2",
    border: "1px solid #DCE8DF",
    marginBottom: "16px",
  },
  locationCopy: {
    margin: 0,
    color: "#62736B",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  locationButton: {
    minHeight: "42px",
    padding: "0 16px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "999px",
    color: "#1F5E4D",
    fontSize: "13px",
    fontWeight: 850,
    cursor: "pointer",
    outline: "none",
    fontFamily: "inherit",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  message: {
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    lineHeight: 1.5,
  },
  errorMessage: {
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
    color: "#A63E30",
    marginTop: "14px",
  },
  successMessage: {
    backgroundColor: "#EFF8E7",
    border: "1px solid #BFDE9B",
    color: "#2C6642",
    marginTop: "12px",
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
    outline: "none",
    marginTop: "4px",
    boxShadow: "0 12px 24px rgba(31,94,77,0.26)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    fontFamily: "inherit",
    transition: "all 0.2s",
  },
  submitButtonDisabled: {
    background: "#AEB8B2",
    cursor: "not-allowed",
    boxShadow: "none",
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
    outline: "none",
    marginTop: "12px",
    fontFamily: "inherit",
  },
  footer: {
    textAlign: "center",
    marginTop: "18px",
    fontSize: "12px",
    color: "#8B9993",
    fontWeight: 700,
  },
};

function VehicleRegistrationScreen() {
  const navigate = useNavigate();

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [batteryCapacity, setBatteryCapacity] = useState("");
  const [connectorType, setConnectorType] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [currentLocation, setCurrentLocation] =
    useState<VehicleLocation | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [locationButtonHover, setLocationButtonHover] = useState(false);
  const [submitButtonHover, setSubmitButtonHover] = useState(false);

  const completedFields = [
    brand.trim(),
    model.trim(),
    batteryCapacity.trim(),
    connectorType.trim(),
    plateNumber.trim(),
    currentLocation,
  ].filter(Boolean).length;

  const completionPercent = Math.round((completedFields / 6) * 100);

  const estimatedRange = useMemo(() => {
    const battery = Number(batteryCapacity);
    if (!battery || battery <= 0) return "--";
    return `${Math.round(battery * 5.4)} km`;
  }, [batteryCapacity]);

  const previewName =
    [brand.trim(), model.trim()].filter(Boolean).join(" ") || "Yeni EV";

  const previewPlate = plateNumber.trim().toUpperCase() || "34 EV 001";

  const getInputStyle = (field: string): CSSProperties => ({
    ...styles.input,
    borderColor: focusedField === field ? "#1F5E4D" : "#D8E2DB",
    backgroundColor: focusedField === field ? "#FFFFFF" : "#FBFDFB",
    boxShadow: focusedField === field ? "0 0 0 4px rgba(31,94,77,0.1)" : "none",
  });

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
        setLocationLoading(false);
      },
      () => {
        setError("Konum izni verilmedi. Arac konumsuz kaydedilebilir.");
        setLocationLoading(false);
      },
    );
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      await addDoc(collection(db, "vehicles"), {
        userId: TEMP_USER_ID,
        brand,
        model,
        batteryCapacity: Number(batteryCapacity),
        connectorType,
        plateNumber,
        currentLocation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate("/home");
    } catch {
      setError("Arac kaydedilirken bir hata olustu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <main className="registration-shell" style={styles.shell}>
        <section style={styles.previewPanel} aria-label="Vehicle preview">
          <div style={styles.routeLayer} />

          <div style={styles.previewContent}>
            <div style={styles.eyebrow}>
              <span style={styles.signalDot} />
              EV Network
            </div>

            <h1 style={styles.previewTitle}>
              Arac profilini akilli sarja hazirla
            </h1>
            <p style={styles.previewText}>
              Kayit tamamlandikca burada canli bir arac karti olusur. Plaka,
              batarya ve soket bilgileri istasyon eslestirmesinde kullanilir.
            </p>

            <div style={styles.vehiclePlate}>
              <div style={styles.carBody}>
                <div style={styles.carCabin} />
                <div style={styles.carWheelLeft} />
                <div style={styles.carWheelRight} />
              </div>

              <div style={styles.platePreview}>
                <div>
                  <div style={styles.statusText}>Aktif profil</div>
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "18px",
                      fontWeight: 850,
                    }}
                  >
                    {previewName}
                  </div>
                </div>
                <div style={styles.plateCode}>{previewPlate}</div>
              </div>
            </div>
          </div>

          <div style={styles.metricGrid}>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{estimatedRange}</div>
              <div style={styles.metricLabel}>Tahmini menzil</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{connectorType || "--"}</div>
              <div style={styles.metricLabel}>Soket</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricValue}>
                {currentLocation ? "Hazir" : "Opsiyonel"}
              </div>
              <div style={styles.metricLabel}>Konum</div>
            </div>
          </div>
        </section>

        <section style={styles.formPanel}>
          <div style={styles.topBar}>
            <div>
              <h2 style={styles.title}>Arac Kaydi</h2>
              <p style={styles.subtitle}>
                Elektrikli aracinizi kaydedin, uygun sarj noktalarini daha hizli
                bulun ve profilinizi tek ekrandan yonetin.
              </p>
            </div>

            <div style={styles.progressWrap}>
              <div style={styles.progressValue}>{completionPercent}%</div>
              <div style={styles.progressLabel}>Tamamlandi</div>
            </div>
          </div>

          <div style={styles.progressTrack} aria-hidden="true">
            <div
              style={{
                ...styles.progressFill,
                width: `${completionPercent}%`,
              }}
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.sectionLabel}>Arac Bilgileri</div>

            <div className="form-grid" style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="Tesla"
                  style={getInputStyle("brand")}
                  onFocus={() => setFocusedField("brand")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="Model 3"
                  style={getInputStyle("model")}
                  onFocus={() => setFocusedField("model")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            <div className="form-grid" style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Battery (kWh)</label>
                <input
                  type="number"
                  value={batteryCapacity}
                  onChange={(event) => setBatteryCapacity(event.target.value)}
                  placeholder="75"
                  style={getInputStyle("battery")}
                  onFocus={() => setFocusedField("battery")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Connector Type</label>
                <input
                  type="text"
                  value={connectorType}
                  onChange={(event) => setConnectorType(event.target.value)}
                  placeholder="CCS2"
                  style={getInputStyle("connector")}
                  onFocus={() => setFocusedField("connector")}
                  onBlur={() => setFocusedField(null)}
                />

                <div style={styles.presetRow}>
                  {connectorPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
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
                style={{
                  ...getInputStyle("plate"),
                  textTransform: "uppercase",
                }}
                onFocus={() => setFocusedField("plate")}
                onBlur={() => setFocusedField(null)}
              />
            </div>

            <div style={{ ...styles.sectionLabel, marginTop: "6px" }}>
              Konum
            </div>

            <div style={styles.locationBox}>
              <p style={styles.locationCopy}>
                Konum eklerseniz size en yakin uygun istasyonlar daha net
                onerilir.
              </p>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locationLoading}
                style={{
                  ...styles.locationButton,
                  backgroundColor:
                    locationButtonHover && !locationLoading
                      ? "#1F5E4D"
                      : "#FFFFFF",
                  color:
                    locationButtonHover && !locationLoading
                      ? "#FFFFFF"
                      : "#1F5E4D",
                  cursor: locationLoading ? "default" : "pointer",
                }}
                onMouseEnter={() => setLocationButtonHover(true)}
                onMouseLeave={() => setLocationButtonHover(false)}
              >
                {locationLoading ? "Aliniyor..." : "Konumu Al"}
              </button>
            </div>

            {currentLocation && (
              <div style={{ ...styles.message, ...styles.successMessage }}>
                <span>OK</span>
                <span>
                  Konum alindi:{" "}
                  <strong>
                    {currentLocation.latitude.toFixed(5)},{" "}
                    {currentLocation.longitude.toFixed(5)}
                  </strong>
                </span>
              </div>
            )}

            {error && (
              <div style={{ ...styles.message, ...styles.errorMessage }}>
                <span>!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonDisabled : {}),
                ...(submitButtonHover && !loading
                  ? {
                      transform: "translateY(-1px)",
                      boxShadow: "0 16px 30px rgba(31,94,77,0.32)",
                    }
                  : {}),
              }}
              onMouseEnter={() => setSubmitButtonHover(true)}
              onMouseLeave={() => setSubmitButtonHover(false)}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <span>Araci Kaydet</span>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate("/")}
            style={styles.navigationButton}
          >
            Arac Profiline Git
          </button>

          <div style={styles.footer}>
            Verileriniz EV Network altyapisinda guvenle saklanir.
          </div>
        </section>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.45);
          border-top-color: #FFFFFF;
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }

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
          .registration-shell {
            grid-template-columns: 1fr !important;
          }

          .registration-shell > section:first-child {
            min-height: auto !important;
          }
        }

        @media (max-width: 560px) {
          .registration-shell {
            border-radius: 20px !important;
          }

          .registration-shell > section {
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

export default VehicleRegistrationScreen;
