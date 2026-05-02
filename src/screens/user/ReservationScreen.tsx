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
import {
  createReservation,
  hasActiveReservationConflict,
} from "../../services/firebase/reservationService";
import {
  getVehicleById,
  getVehicleByUserId,
} from "../../services/firebase/vehicleService";
import { TEMP_USER_ID } from "../../services/firebase/userService";

const SLOT_INTERVAL_MINUTES = 15;
const SLOT_INTERVAL_MS = SLOT_INTERVAL_MINUTES * 60 * 1000;
const MAX_RESERVATION_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_ADVANCE_MS = 24 * 60 * 60 * 1000;

interface ReservationLocationState {
  station?: Station;
  charger?: Charger;
  vehicleId?: string;
}

interface ReservationConfirmation {
  stationName: string;
  chargerName: string;
  dateTimeRange: string;
}

interface PickerOption {
  value: string;
  label: string;
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
    maxWidth: "340px",
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
    fontSize: "18px",
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
  infoMessage: {
    backgroundColor: "#EEF6F0",
    border: "1px solid #D3E5D8",
    color: "#37594D",
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
  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "10px",
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
  confirmationCard: {
    borderRadius: "16px",
    backgroundColor: "#EFF8E7",
    border: "1px solid #BFDE9B",
    padding: "14px",
    color: "#2C6642",
    marginTop: "14px",
  },
  confirmationTitle: {
    margin: "0 0 8px",
    fontSize: "16px",
    fontWeight: 850,
  },
  confirmationValue: {
    margin: "4px 0",
    fontSize: "13px",
    lineHeight: 1.55,
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

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

function formatTimeValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatDateTimeLabel(date: Date) {
  return `${formatDateLabel(date)} ${formatTimeValue(date)}`;
}

function roundUpToSlot(date: Date) {
  const roundedDate = new Date(date);
  roundedDate.setSeconds(0, 0);

  const currentMinutes = roundedDate.getMinutes();
  const minuteRemainder = currentMinutes % SLOT_INTERVAL_MINUTES;

  if (minuteRemainder !== 0) {
    roundedDate.setMinutes(
      currentMinutes + (SLOT_INTERVAL_MINUTES - minuteRemainder),
    );
  }

  if (roundedDate.getTime() < date.getTime()) {
    roundedDate.setMinutes(roundedDate.getMinutes() + SLOT_INTERVAL_MINUTES);
  }

  return roundedDate;
}

function buildDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const dateTime = new Date(`${dateValue}T${timeValue}:00`);

  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }

  return dateTime;
}

function resolveReservationDateTimes(
  dateValue: string,
  startTimeValue: string,
  endTimeValue: string,
) {
  const startDateTime = buildDateTime(dateValue, startTimeValue);
  const endDateTime = buildDateTime(dateValue, endTimeValue);

  if (!startDateTime || !endDateTime) {
    return null;
  }

  if (endDateTime.getTime() <= startDateTime.getTime()) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  return {
    startDateTime,
    endDateTime,
  };
}

function getSelectedChargerName(charger: Charger) {
  return `${charger.type} - ${charger.id}`;
}

function ReservationScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = (location.state as ReservationLocationState | null) ?? null;
  const station = locationState?.station ?? null;
  const charger = locationState?.charger ?? null;
  const selectedVehicleId = locationState?.vehicleId ?? "";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<ReservationConfirmation | null>(
    null,
  );

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const resolvedVehicle = selectedVehicleId
          ? await getVehicleById(selectedVehicleId)
          : await getVehicleByUserId(TEMP_USER_ID);

        setVehicle(resolvedVehicle);
      } catch {
        setVehicle(null);
      } finally {
        setVehicleLoading(false);
      }
    };

    void loadVehicle();
  }, [selectedVehicleId]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const nowDateTime = useMemo(() => new Date(nowTimestamp), [nowTimestamp]);
  const maxSelectableDateTime = useMemo(
    () => new Date(nowTimestamp + MAX_ADVANCE_MS),
    [nowTimestamp],
  );

  const selectableStartDateTimes = useMemo(() => {
    const firstSlotDateTime = roundUpToSlot(nowDateTime);
    const slots: Date[] = [];

    for (
      let cursor = new Date(firstSlotDateTime);
      cursor.getTime() <= maxSelectableDateTime.getTime();
      cursor = new Date(cursor.getTime() + SLOT_INTERVAL_MS)
    ) {
      slots.push(new Date(cursor));
    }

    return slots;
  }, [maxSelectableDateTime, nowDateTime]);

  const dateOptions = useMemo<PickerOption[]>(() => {
    const dateMap = new Map<string, Date>();

    selectableStartDateTimes.forEach((slotDateTime) => {
      const key = formatDateKey(slotDateTime);
      if (!dateMap.has(key)) {
        dateMap.set(key, slotDateTime);
      }
    });

    const todayKey = formatDateKey(nowDateTime);
    const tomorrowKey = formatDateKey(
      new Date(nowDateTime.getTime() + 24 * 60 * 60 * 1000),
    );

    return Array.from(dateMap.entries()).map(([key, dateTime]) => {
      const formattedDate = formatDateLabel(dateTime);

      if (key === todayKey) {
        return {
          value: key,
          label: `Bugün (${formattedDate})`,
        };
      }

      if (key === tomorrowKey) {
        return {
          value: key,
          label: `Yarın (${formattedDate})`,
        };
      }

      return {
        value: key,
        label: formattedDate,
      };
    });
  }, [nowDateTime, selectableStartDateTimes]);

  const effectiveDate = useMemo(() => {
    if (dateOptions.length === 0) {
      return "";
    }

    const isSelectedDateValid = dateOptions.some((option) => option.value === date);
    return isSelectedDateValid ? date : dateOptions[0].value;
  }, [date, dateOptions]);

  const startTimeOptions = useMemo<PickerOption[]>(() => {
    if (!effectiveDate) {
      return [];
    }

    return selectableStartDateTimes
      .filter((slotDateTime) => formatDateKey(slotDateTime) === effectiveDate)
      .map((slotDateTime) => {
        const timeValue = formatTimeValue(slotDateTime);
        return {
          value: timeValue,
          label: timeValue,
        };
      });
  }, [effectiveDate, selectableStartDateTimes]);

  const effectiveStartTime = useMemo(() => {
    const isStartTimeValid = startTimeOptions.some(
      (option) => option.value === startTime,
    );

    return isStartTimeValid ? startTime : "";
  }, [startTime, startTimeOptions]);

  const endTimeOptions = useMemo<PickerOption[]>(() => {
    if (!effectiveDate || !effectiveStartTime) {
      return [];
    }

    const startDateTime = buildDateTime(effectiveDate, effectiveStartTime);
    if (!startDateTime) {
      return [];
    }

    const maxSelectableEndDateTime = new Date(
      startDateTime.getTime() + MAX_RESERVATION_DURATION_MS,
    );
    const firstEndDateTime = new Date(startDateTime.getTime() + SLOT_INTERVAL_MS);

    if (firstEndDateTime.getTime() > maxSelectableEndDateTime.getTime()) {
      return [];
    }

    const options: PickerOption[] = [];

    for (
      let cursor = firstEndDateTime;
      cursor.getTime() <= maxSelectableEndDateTime.getTime();
      cursor = new Date(cursor.getTime() + SLOT_INTERVAL_MS)
    ) {
      const timeValue = formatTimeValue(cursor);
      const isNextDay = formatDateKey(cursor) !== effectiveDate;

      options.push({
        value: timeValue,
        label: isNextDay ? `${timeValue} (ertesi gün)` : timeValue,
      });
    }

    return options;
  }, [effectiveDate, effectiveStartTime]);

  const effectiveEndTime = useMemo(() => {
    const isEndTimeValid = endTimeOptions.some((option) => option.value === endTime);
    return isEndTimeValid ? endTime : "";
  }, [endTime, endTimeOptions]);

  const completedFields = [
    effectiveDate.trim(),
    effectiveStartTime.trim(),
    effectiveEndTime.trim(),
  ].filter(Boolean).length;
  const completionPercent = Math.round((completedFields / 3) * 100);

  const summaryConnector = useMemo(
    () => charger?.connectorType ?? "--",
    [charger],
  );

  const selectedDateTimeRange = useMemo(() => {
    if (!effectiveDate || !effectiveStartTime || !effectiveEndTime) {
      return "";
    }

    const resolvedDateTimes = resolveReservationDateTimes(
      effectiveDate,
      effectiveStartTime,
      effectiveEndTime,
    );
    if (!resolvedDateTimes) {
      return "";
    }

    return `${formatDateTimeLabel(resolvedDateTimes.startDateTime)} - ${formatDateTimeLabel(resolvedDateTimes.endDateTime)}`;
  }, [effectiveDate, effectiveEndTime, effectiveStartTime]);

  const validateReservation = () => {
    if (
      !effectiveDate.trim() ||
      !effectiveStartTime.trim() ||
      !effectiveEndTime.trim()
    ) {
      return "Lütfen tarih, başlangıç saati ve bitiş saatini eksiksiz seçin.";
    }

    const resolvedDateTimes = resolveReservationDateTimes(
      effectiveDate,
      effectiveStartTime,
      effectiveEndTime,
    );
    if (!resolvedDateTimes) {
      return "Seçilen tarih veya saat bilgisi geçersiz.";
    }

    const { startDateTime, endDateTime } = resolvedDateTimes;

    if (startDateTime.getTime() >= endDateTime.getTime()) {
      return "Başlangıç saati bitiş saatinden önce olmalıdır.";
    }

    if (
      startDateTime.getTime() < nowDateTime.getTime() ||
      endDateTime.getTime() <= nowDateTime.getTime()
    ) {
      return "Geçmiş zaman aralığı için rezervasyon oluşturulamaz.";
    }

    if (startDateTime.getTime() - nowDateTime.getTime() > MAX_ADVANCE_MS) {
      return "Rezervasyon 24 saatten daha ileri bir zamana yapılamaz.";
    }

    if (
      endDateTime.getTime() - startDateTime.getTime() >
      MAX_RESERVATION_DURATION_MS
    ) {
      return "Rezervasyon süresi en fazla 2 saat olabilir.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setWarningMessage("");
    setConfirmation(null);

    if (!station || !charger) {
      setErrorMessage("İstasyon veya şarj cihazı bilgisi eksik.");
      return;
    }

    const validationError = validateReservation();
    if (validationError) {
      setWarningMessage(validationError);
      return;
    }

    if (vehicleLoading) {
      setWarningMessage("Araç bilgileri yükleniyor. Lütfen tekrar deneyin.");
      return;
    }

    if (!vehicle?.id) {
      setWarningMessage("Rezervasyon için uygun bir araç bulunamadı.");
      return;
    }

    if (vehicle.connectorType !== charger.connectorType) {
      setWarningMessage(
        "Araç konnektör tipi seçilen şarj cihazı ile uyumlu değil.",
      );
      return;
    }

    if (charger.status !== "available") {
      setWarningMessage("Seçilen şarj cihazı şu anda uygun değil.");
      return;
    }

    if (station.status === "offline") {
      setWarningMessage("Bu istasyon şu anda çevrimdışı.");
      return;
    }

    try {
      setSaving(true);

      const hasConflict = await hasActiveReservationConflict(charger.id, {
        date: effectiveDate,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
      });

      if (hasConflict) {
        setWarningMessage(
          "Bu şarj cihazı seçilen saat aralığında zaten rezerve edilmiş.",
        );
        return;
      }

      await createReservation({
        vehicleId: vehicle.id,
        stationId: station.id,
        chargerId: charger.id,
        date: effectiveDate,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
      });

      setConfirmation({
        stationName: station.name,
        chargerName: getSelectedChargerName(charger),
        dateTimeRange: selectedDateTimeRange,
      });
    } catch {
      setErrorMessage("Rezervasyon kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (!station || !charger) {
    return (
      <div style={styles.page}>
        <div style={styles.fallbackCard}>
          <h1 style={styles.fallbackTitle}>Rezervasyon bilgisi eksik</h1>
          <p style={styles.fallbackText}>
            Lütfen önce istasyon detay kartını açıp bir şarj cihazı seçin.
          </p>
          <div style={{ ...styles.actionRow, marginTop: "18px" }}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate("/station-map")}
            >
              İstasyon Haritasına Dön
            </button>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => navigate("/")}
            >
              Araç Profiline Git
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <main className="reservation-shell" style={styles.shell}>
        <section style={styles.summaryPanel} aria-label="Rezervasyon özeti">
          <div style={styles.routeLayer} />

          <div style={styles.summaryContent}>
            <div style={styles.eyebrow}>
              <span style={styles.signalDot} />
              EV Network
            </div>

            <h1 style={styles.title}>Şarj slotunu rezerve et</h1>
            <p style={styles.summaryText}>
              İstasyon ve şarj cihazı bilgilerini kontrol edip size uygun tarih
              ve saat aralığını seçin.
            </p>

            <div style={styles.specCard}>
              <div style={styles.specGrid}>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>İstasyon adı</div>
                  <div style={styles.specValue}>{station.name}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Seçilen şarj cihazı</div>
                  <div style={styles.specValue}>{getSelectedChargerName(charger)}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Konnektör tipi</div>
                  <div style={styles.specValue}>{summaryConnector}</div>
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
                  <div style={styles.specLabel}>İstasyon durumu</div>
                  <div style={styles.specValue}>{station.status}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.metricGrid}>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{vehicleLoading ? "..." : "Hazır"}</div>
              <div style={styles.metricLabel}>Araç kontrolü</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{charger.status}</div>
              <div style={styles.metricLabel}>Şarj cihazı</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{station.status}</div>
              <div style={styles.metricLabel}>İstasyon</div>
            </div>
          </div>
        </section>

        <section style={styles.formPanel}>
          <div style={styles.topBar}>
            <div>
              <h2 style={styles.panelTitle}>Rezervasyon Formu</h2>
              <p style={styles.subtitle}>
                Tarih, başlangıç saati ve bitiş saati seçimi zorunludur.
                Rezervasyon süresi en fazla 2 saattir ve seçimler en fazla 24
                saat ileriye yapılabilir.
              </p>
            </div>

            <div style={styles.progressWrap}>
              <div style={styles.progressValue}>{completionPercent}%</div>
              <div style={styles.progressLabel}>Tamamlandı</div>
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
            <div style={styles.sectionLabel}>Rezervasyon Bilgileri</div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tarih</label>
                <select
                  value={effectiveDate}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setStartTime("");
                    setEndTime("");
                  }}
                  style={styles.input}
                  disabled={saving || dateOptions.length === 0}
                >
                  <option value="">Tarih seçin</option>
                  {dateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {dateOptions.length === 0 && (
                  <p style={styles.helperText}>
                    Şu anda seçilebilir tarih bulunmuyor.
                  </p>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Başlangıç saati</label>
                <select
                  value={effectiveStartTime}
                  onChange={(event) => {
                    setStartTime(event.target.value);
                    setEndTime("");
                  }}
                  style={styles.input}
                  disabled={saving || !effectiveDate || startTimeOptions.length === 0}
                >
                  <option value="">Başlangıç saati seçin</option>
                  {startTimeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {effectiveDate && startTimeOptions.length === 0 && (
                  <p style={styles.helperText}>
                    Bu tarih için uygun başlangıç saati bulunmuyor.
                  </p>
                )}
              </div>
            </div>

            <div style={{ ...styles.formGrid, gridTemplateColumns: "1fr" }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Bitiş saati</label>
                <select
                  value={effectiveEndTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  style={styles.input}
                  disabled={
                    saving || !effectiveStartTime || endTimeOptions.length === 0
                  }
                >
                  <option value="">Bitiş saati seçin</option>
                  {endTimeOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {effectiveStartTime && endTimeOptions.length === 0 && (
                  <p style={styles.helperText}>
                    Seçilen başlangıç saatine göre uygun bitiş saati bulunmuyor.
                  </p>
                )}
              </div>
            </div>

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

            <div style={styles.actionRow}>
              <button
                type="submit"
                style={{
                  ...styles.primaryButton,
                  ...(saving ? styles.disabledButton : {}),
                }}
                disabled={saving}
              >
                {saving ? "Kaydediliyor..." : "Rezervasyonu Onayla"}
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() =>
                  navigate("/station-map", { state: { vehicleId: selectedVehicleId } })
                }
                disabled={saving}
              >
                İstasyon Haritasına Dön
              </button>
            </div>
          </form>

          {confirmation && (
            <div style={styles.confirmationCard}>
              <h3 style={styles.confirmationTitle}>Rezervasyon onaylandı</h3>
              <p style={styles.confirmationValue}>
                İstasyon adı: {confirmation.stationName}
              </p>
              <p style={styles.confirmationValue}>
                Seçilen şarj cihazı: {confirmation.chargerName}
              </p>
              <p style={styles.confirmationValue}>
                Tarih ve saat aralığı: {confirmation.dateTimeRange}
              </p>
            </div>
          )}
        </section>
      </main>

      <style>{`
        @media (max-width: 920px) {
          .reservation-shell {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 560px) {
          .reservation-shell {
            border-radius: 20px !important;
          }

          .reservation-shell > section {
            padding: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ReservationScreen;
