import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Charger } from "../../models/Charger";
import type { Station } from "../../models/Station";
import type { Vehicle } from "../../models/vehicle";
import { getVehicleById, getVehicleByUserId } from "../../services/firebase/vehicleService";
import { getOrCreateLocalUserId } from "../../services/auth/localUser";
import { createChargingSession } from "../../services/firebase/chargingSessionService";

interface ChargingSessionLocationState {
  station?: Station;
  charger?: Charger;
  vehicleId?: string;
  reservationId?: string;
  reservationDate?: string;
  reservationStartTime?: string;
  reservationEndTime?: string;
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
    display: "grid",
    gridTemplateColumns: "0.95fr 1.05fr",
    borderRadius: "28px",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
    backdropFilter: "blur(14px)",
  },
  summaryPanel: {
    minHeight: "640px",
    padding: "34px",
    background:
      "linear-gradient(155deg, #10352E 0%, #1F5E4D 48%, #A9D869 140%)",
    color: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "24px",
  },
  routeLayer: {
    position: "absolute",
    inset: 0,
    opacity: 0.34,
    backgroundImage:
      "linear-gradient(120deg, transparent 12%, rgba(255,255,255,0.16) 12%, rgba(255,255,255,0.16) 13%, transparent 13%, transparent 52%, rgba(255,255,255,0.14) 52%, rgba(255,255,255,0.14) 53%, transparent 53%), linear-gradient(25deg, transparent 24%, rgba(255,255,255,0.12) 24%, rgba(255,255,255,0.12) 25%, transparent 25%)",
    backgroundSize: "240px 220px, 190px 180px",
  },
  summaryContent: {
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
    fontSize: "34px",
    lineHeight: 1.1,
    fontWeight: 850,
    maxWidth: "360px",
  },
  summaryText: {
    margin: 0,
    maxWidth: "360px",
    color: "rgba(255,255,255,0.76)",
    fontSize: "15px",
    lineHeight: 1.7,
  },
  specCard: {
    marginTop: "28px",
    borderRadius: "22px",
    backgroundColor: "rgba(255,255,255,0.13)",
    border: "1px solid rgba(255,255,255,0.18)",
    padding: "20px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
  },
  specGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  specItem: {
    borderRadius: "14px",
    padding: "10px 12px",
    backgroundColor: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.18)",
  },
  specLabel: {
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.74)",
  },
  specValue: {
    marginTop: "5px",
    fontSize: "14px",
    fontWeight: 850,
    color: "#FFFFFF",
    lineHeight: 1.4,
  },
  formPanel: {
    padding: "38px",
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
    gap: "14px",
  },
  formGroup: {
    marginBottom: "16px",
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
  helperText: {
    marginTop: "6px",
    color: "#7A8982",
    fontSize: "12px",
    lineHeight: 1.5,
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
  warningMessage: {
    backgroundColor: "#FFF8E8",
    border: "1px solid #F0D488",
    color: "#8A6500",
  },
  errorMessage: {
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
    color: "#A63E30",
  },
  costCard: {
    borderRadius: "16px",
    backgroundColor: "#EEF6F0",
    border: "1px solid #D3E5D8",
    padding: "14px",
    marginTop: "6px",
    color: "#37594D",
  },
  costTitle: {
    margin: "0 0 8px",
    fontSize: "13px",
    fontWeight: 900,
  },
  costRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "12px",
    fontSize: "13px",
    fontWeight: 800,
    padding: "6px 0",
    borderBottom: "1px solid rgba(55,89,77,0.12)",
  },
  costRowLast: {
    borderBottom: "none",
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
  disabledButton: {
    background: "#AEB8B2",
    boxShadow: "none",
    cursor: "not-allowed",
  },
  fallbackCard: {
    width: "min(520px, 100%)",
    borderRadius: "24px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "26px",
    boxShadow: "0 16px 34px rgba(31,94,77,0.12)",
  },
  fallbackTitle: {
    margin: "0 0 10px",
    color: "#17231F",
    fontSize: "24px",
    fontWeight: 850,
  },
  fallbackText: {
    margin: 0,
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.7,
  },
};

function clampPercent(value: number) {
  if (Number.isNaN(value)) return NaN;
  return Math.min(100, Math.max(0, value));
}

function ChargingSessionScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = useMemo(() => getOrCreateLocalUserId(), []);

  const locationState =
    (location.state as ChargingSessionLocationState | null) ?? null;
  const station = locationState?.station ?? null;
  const charger = locationState?.charger ?? null;
  const reservationId = locationState?.reservationId ?? null;
  const reservationDate = locationState?.reservationDate ?? "";
  const reservationStartTime = locationState?.reservationStartTime ?? "";
  const reservationEndTime = locationState?.reservationEndTime ?? "";
  const requestedVehicleId = locationState?.vehicleId ?? "";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [startBattery, setStartBattery] = useState("");
  const [endBattery, setEndBattery] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

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

  const batteryCapacity = vehicle?.batteryCapacity ?? 0;
  const startBatteryValue = clampPercent(Number(startBattery));
  const endBatteryValue = clampPercent(Number(endBattery));

  const consumedKwh = useMemo(() => {
    if (!batteryCapacity || batteryCapacity <= 0) {
      return null;
    }

    if (!Number.isFinite(startBatteryValue) || !Number.isFinite(endBatteryValue)) {
      return null;
    }

    if (endBatteryValue <= startBatteryValue) {
      return null;
    }

    return (batteryCapacity * (endBatteryValue - startBatteryValue)) / 100;
  }, [batteryCapacity, endBatteryValue, startBatteryValue]);

  const totalCost = useMemo(() => {
    if (consumedKwh == null || !charger) {
      return null;
    }

    return consumedKwh * charger.pricePerKwh;
  }, [charger, consumedKwh]);

  const validate = () => {
    if (!station || !charger) {
      return "İstasyon veya şarj cihazı bilgisi eksik.";
    }

    if (vehicleLoading) {
      return "Araç bilgileri yükleniyor. Lütfen tekrar deneyin.";
    }

    if (!vehicle?.id) {
      return "Şarj oturumu için uygun bir araç bulunamadı.";
    }

    if (!batteryCapacity || batteryCapacity <= 0) {
      return "Araç batarya kapasitesi bulunamadı.";
    }

    if (!startBattery.trim() || !endBattery.trim()) {
      return "Lütfen başlangıç ve bitiş batarya yüzdesini girin.";
    }

    if (!Number.isFinite(startBatteryValue) || !Number.isFinite(endBatteryValue)) {
      return "Batarya yüzdesi sayısal olmalıdır.";
    }

    if (startBatteryValue < 0 || startBatteryValue > 100) {
      return "Başlangıç batarya yüzdesi 0-100 arasında olmalıdır.";
    }

    if (endBatteryValue < 0 || endBatteryValue > 100) {
      return "Bitiş batarya yüzdesi 0-100 arasında olmalıdır.";
    }

    if (endBatteryValue <= startBatteryValue) {
      return "Bitiş batarya yüzdesi başlangıçtan büyük olmalıdır.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWarningMessage("");
    setErrorMessage("");

    const validationError = validate();
    if (validationError) {
      setWarningMessage(validationError);
      return;
    }

    if (!station || !charger || !vehicle || consumedKwh == null || totalCost == null) {
      setErrorMessage("Hesaplama yapılamadı. Lütfen alanları kontrol edin.");
      return;
    }

    try {
      setSaving(true);

      await createChargingSession({
        reservationId,
        vehicleId: vehicle.id,
        stationId: station.id,
        chargerId: charger.id,
        startBatteryPercentage: startBatteryValue,
        endBatteryPercentage: endBatteryValue,
        consumedKwh,
        pricePerKwh: charger.pricePerKwh,
        totalCost,
      });

      navigate("/app", {
        state: {
          snackbar: {
            message: "Şarj oturumu kaydedildi.",
            variant: "success",
          },
        },
      });
    } catch {
      setErrorMessage("Şarj oturumu kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  if (!station || !charger) {
    return (
      <div style={styles.page}>
        <div style={styles.fallbackCard}>
          <h1 style={styles.fallbackTitle}>Şarj oturumu bilgisi eksik</h1>
          <p style={styles.fallbackText}>
            Lütfen önce rezervasyon oluşturun ve bu ekrana rezervasyon üzerinden gelin.
          </p>
          <div style={{ ...styles.actionRow, marginTop: "18px" }}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate("/station-map")}
            >
              İstasyon Haritasına Dön
            </button>
            <button type="button" style={styles.primaryButton} onClick={() => navigate("/app")}>
              Kayıtlı Araçlara Git
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <main className="charging-session-shell" style={styles.shell}>
        <section style={styles.summaryPanel} aria-label="Şarj oturumu özeti">
          <div style={styles.routeLayer} />
          <div style={styles.summaryContent}>
            <div style={styles.eyebrow}>
              <span style={styles.signalDot} />
              EV Network
            </div>

            <h1 style={styles.title}>Şarj Oturumu</h1>
            <p style={styles.summaryText}>
              Rezervasyon detaylarını kontrol edin, batarya yüzdelerini girin ve maliyeti hesaplayın.
            </p>

            <div style={styles.specCard}>
              <div style={styles.specGrid}>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>İstasyon adı</div>
                  <div style={styles.specValue}>{station.name}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Seçilen şarj cihazı</div>
                  <div style={styles.specValue}>{charger.id}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Konnektör tipi</div>
                  <div style={styles.specValue}>{charger.connectorType}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Güç çıkışı</div>
                  <div style={styles.specValue}>{charger.powerOutput}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>kWh başına ücret</div>
                  <div style={styles.specValue}>
                    {charger.pricePerKwh.toFixed(2)} TL
                  </div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Rezervasyon</div>
                  <div style={styles.specValue}>
                    {reservationDate && reservationStartTime && reservationEndTime
                      ? `${reservationDate} ${reservationStartTime}-${reservationEndTime}`
                      : "--"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.formPanel} aria-label="Şarj oturumu formu">
          <div style={styles.topBar}>
            <div>
              <h2 style={styles.panelTitle}>Batarya ve Maliyet</h2>
              <p style={styles.subtitle}>
                Batarya yüzdeleri 0-100 aralığında olmalı ve bitiş yüzdesi başlangıçtan büyük olmalıdır.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.sectionLabel}>Batarya Yüzdesi</div>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Başlangıç (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={startBattery}
                  onChange={(event) => setStartBattery(event.target.value)}
                  style={styles.input}
                  disabled={saving}
                  placeholder="Örn. 20"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Bitiş (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={endBattery}
                  onChange={(event) => setEndBattery(event.target.value)}
                  style={styles.input}
                  disabled={saving}
                  placeholder="Örn. 75"
                />
              </div>
            </div>

            <p style={styles.helperText}>
              Araç kapasitesi: {vehicleLoading ? "..." : batteryCapacity ? `${batteryCapacity} kWh` : "--"}
            </p>

            {warningMessage && (
              <div style={{ ...styles.message, ...styles.warningMessage }}>
                <span>!</span>
                <span>{warningMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div style={{ ...styles.message, ...styles.errorMessage }}>
                <span>!</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={styles.costCard}>
              <div style={styles.costTitle}>Maliyet özeti</div>
              <div style={styles.costRow}>
                <span>Tüketilen kWh</span>
                <span>{consumedKwh == null ? "--" : consumedKwh.toFixed(2)}</span>
              </div>
              <div style={styles.costRow}>
                <span>Birim fiyat</span>
                <span>{charger.pricePerKwh.toFixed(2)} TL/kWh</span>
              </div>
              <div style={{ ...styles.costRow, ...styles.costRowLast }}>
                <span>Toplam</span>
                <span>{totalCost == null ? "--" : `${totalCost.toFixed(2)} TL`}</span>
              </div>
            </div>

            <div style={styles.actionRow}>
              <button
                type="submit"
                style={{
                  ...styles.primaryButton,
                  ...(saving ? styles.disabledButton : {}),
                }}
                disabled={saving}
              >
                {saving ? "Kaydediliyor..." : "Şarj Oturumunu Kaydet"}
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => navigate("/station-map")}
                disabled={saving}
              >
                Haritaya Dön
              </button>
            </div>
          </form>
        </section>
      </main>

      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type=number] {
          -moz-appearance: textfield;
        }

        @media (max-width: 920px) {
          .charging-session-shell {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 560px) {
          .charging-session-shell {
            border-radius: 20px !important;
          }

          .charging-session-shell > section {
            padding: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ChargingSessionScreen;
