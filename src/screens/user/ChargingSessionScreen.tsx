import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TimeSeriesChart from "../../components/charts/TimeSeriesChart";
import Snackbar, { type SnackbarVariant } from "../../components/Snackbar";
import type { Charger } from "../../models/Charger";
import type { Station } from "../../models/Station";
import type { Vehicle } from "../../models/vehicle";
import { getOrCreateLocalUserId } from "../../services/auth/localUser";
import {
  completeLiveChargingSession,
  createLiveChargingSession,
  subscribeToChargingSession,
  updateLiveChargingSession,
  type ChargingSessionRecord,
} from "../../services/firebase/chargingSessionService";
import { isWithinReservationWindow } from "../../services/firebase/reservationService";
import { getVehicleById, getVehicleByUserId } from "../../services/firebase/vehicleService";
import {
  getWallet,
  InsufficientWalletBalanceError,
} from "../../services/firebase/walletService";
import { getChargerStatusBlockMessage } from "../../utils/chargerCompatibility";

interface ChargingSessionLocationState {
  station?: Station;
  charger?: Charger;
  vehicleId?: string;
  reservationId?: string;
  chargingSessionId?: string;
  reservationDate?: string;
  reservationStartTime?: string;
  reservationEndTime?: string;
}

interface TrendPoint {
  label: string;
  kwh: number;
  cost: number;
}

const LIVE_TICK_MS = 1000;
const FIRESTORE_SYNC_MS = 5000;

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
    width: "min(1100px, 100%)",
    display: "grid",
    gridTemplateColumns: "0.92fr 1.08fr",
    gridAutoRows: "auto",
    borderRadius: "28px",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
    backdropFilter: "blur(14px)",
  },
  summaryPanel: {
    minHeight: "auto",
    padding: "34px",
    background:
      "linear-gradient(155deg, #10352E 0%, #1F5E4D 48%, #A9D869 140%)",
    color: "#FFFFFF",
    position: "relative",
    overflow: "visible",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "24px",
  },
  routeLayer: {
    position: "fixed",
    inset: 0,
    opacity: 0.34,
    backgroundImage:
      "linear-gradient(120deg, transparent 12%, rgba(255,255,255,0.16) 12%, rgba(255,255,255,0.16) 13%, transparent 13%, transparent 52%, rgba(255,255,255,0.14) 52%, rgba(255,255,255,0.14) 53%, transparent 53%), linear-gradient(25deg, transparent 24%, rgba(255,255,255,0.12) 24%, rgba(255,255,255,0.12) 25%, transparent 25%)",
    backgroundSize: "240px 220px, 190px 180px",
    pointerEvents: "none",
    zIndex: 0,
  },
  summaryContent: { position: "relative", zIndex: 2 },
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
    maxWidth: "390px",
    color: "rgba(255,255,255,0.78)",
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
  livePanel: {
    position: "relative",
    zIndex: 2,
    borderRadius: "22px",
    backgroundColor: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "18px",
  },
  liveStatus: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
  },
  statusPill: {
    borderRadius: "999px",
    backgroundColor: "rgba(184,240,97,0.18)",
    border: "1px solid rgba(184,240,97,0.34)",
    padding: "8px 10px",
    color: "#F7FFE9",
    fontSize: "12px",
    fontWeight: 900,
  },
  progressTrack: {
    width: "100%",
    height: "12px",
    borderRadius: "999px",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #B8F061, #FFFFFF)",
    transition: "width 0.4s ease",
  },
  formPanel: {
    padding: "34px",
    backgroundColor: "rgba(255,255,255,0.95)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    minHeight: "100%",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
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
    maxWidth: "480px",
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
  formGroup: { marginBottom: "16px" },
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
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  metricCard: {
    borderRadius: "16px",
    backgroundColor: "#EEF6F0",
    border: "1px solid #D3E5D8",
    padding: "14px",
    color: "#37594D",
  },
  metricLabel: {
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6E8178",
  },
  metricValue: {
    marginTop: "8px",
    fontSize: "24px",
    fontWeight: 950,
    color: "#143D34",
    lineHeight: 1.1,
  },
  costCard: {
    borderRadius: "16px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #D8E2DB",
    padding: "14px",
    color: "#17231F",
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
  costRowLast: { borderBottom: "none" },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
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

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parsePowerKw(powerOutput: string) {
  const parsed = Number(powerOutput.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 22;
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

function getReservationDurationMinutes(
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

  const durationMinutes =
    (endDateTime.getTime() - startDateTime.getTime()) / 60_000;

  return durationMinutes > 0 ? durationMinutes : null;
}

function formatMinutes(minutes: number) {
  if (!Number.isFinite(minutes)) return "--";
  const rounded = Math.max(0, Math.ceil(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours <= 0) return `${mins} dk`;
  return `${hours} sa ${mins} dk`;
}

function getStatusLabel(session: ChargingSessionRecord | null, started: boolean) {
  if (session?.status === "completed") return "Tamamlandi";
  if (started) return "Canli takip active";
  return "Hazir";
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
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
  const requestedChargingSessionId = locationState?.chargingSessionId ?? null;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [startBattery, setStartBattery] = useState("");
  const [endBattery, setEndBattery] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    requestedChargingSessionId,
  );
  const [remoteSession, setRemoteSession] = useState<ChargingSessionRecord | null>(null);
  const [currentKwh, setCurrentKwh] = useState(0);
  const [estimatedRemainingMinutes, setEstimatedRemainingMinutes] = useState(0);
  const [liveCost, setLiveCost] = useState(0);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [warningMessage, setWarningMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    variant: SnackbarVariant;
  } | null>(null);

  const startedAtRef = useRef<number | null>(null);
  const lastSyncedAtRef = useRef(0);
  const completingRef = useRef(false);
  const completeChargingSessionRef = useRef<((kwh: number, progress: number, autoComplete: boolean) => Promise<void>) | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    getWallet(userId)
      .then((wallet) => {
        if (!cancelled) setWalletBalance(wallet.balance);
      })
      .catch(() => {
        if (!cancelled) setWalletBalance(null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!activeSessionId) return undefined;

    return subscribeToChargingSession(
      activeSessionId,
      (session) => {
        setRemoteSession(session);
        if (!session) return;
        setCurrentKwh(Number(session.currentKwh ?? 0));
        setLiveCost(Number(session.liveCost ?? 0));
        setEstimatedRemainingMinutes(Number(session.estimatedRemainingMinutes ?? 0));
        setStartBattery(String(session.startBatteryPercentage ?? ""));
        setEndBattery(String(session.targetBatteryPercentage ?? ""));

        const startedAt =
          toDate(session.startTime) ??
          toDate(session.startedAt) ??
          toDate(session.createdAt);
        if (startedAt) {
          startedAtRef.current = startedAt.getTime();
        }
      },
      () => {
        setSnackbar({
          message: "Live session details could not be read.",
          variant: "error",
        });
      },
    );
  }, [activeSessionId]);

  const batteryCapacity = vehicle?.batteryCapacity ?? 0;
  const startBatteryValue = clampPercent(Number(startBattery));
  const endBatteryValue = clampPercent(Number(endBattery));
  const chargerPowerKw = charger ? parsePowerKw(charger.powerOutput) : 0;
  const statusBlockMessage = useMemo(() => {
    if (!station || !charger) return "";
    if (reservationId && charger.status === "occupied" && station.status !== "offline") {
      return "";
    }
    return getChargerStatusBlockMessage(station, charger);
  }, [charger, reservationId, station]);
  const reservationWindowBlockedMessage = useMemo(() => {
    if (!reservationId) {
      return "";
    }

    if (!reservationDate || !reservationStartTime || !reservationEndTime) {
      return "Reservation time information is missing.";
    }

    const canStartNow = isWithinReservationWindow({
      date: reservationDate,
      startTime: reservationStartTime,
      endTime: reservationEndTime,
    });

    if (!canStartNow) {
      return "The charging session can only be started during the reservation time range.";
    }

    return "";
  }, [reservationDate, reservationEndTime, reservationId, reservationStartTime]);

  const targetKwh = useMemo(() => {
    if (!batteryCapacity || batteryCapacity <= 0) return null;
    if (!Number.isFinite(startBatteryValue) || !Number.isFinite(endBatteryValue)) {
      return null;
    }
    if (endBatteryValue <= startBatteryValue) return null;
    return (batteryCapacity * (endBatteryValue - startBatteryValue)) / 100;
  }, [batteryCapacity, endBatteryValue, startBatteryValue]);

  const plannedTotalCost = useMemo(() => {
    if (targetKwh == null || !charger) return null;
    return targetKwh * charger.pricePerKwh;
  }, [charger, targetKwh]);

  const reservationDurationMinutes = useMemo(
    () =>
      getReservationDurationMinutes(
        reservationDate,
        reservationStartTime,
        reservationEndTime,
      ),
    [reservationDate, reservationEndTime, reservationStartTime],
  );

  const targetChargeMinutes = useMemo(() => {
    if (targetKwh == null || targetKwh <= 0 || chargerPowerKw <= 0) {
      return null;
    }

    return (targetKwh / chargerPowerKw) * 60;
  }, [chargerPowerKw, targetKwh]);

  const sessionLimitMinutes = useMemo(() => {
    if (activeSessionId && remoteSession?.sessionLimitMinutes != null) {
      return remoteSession.sessionLimitMinutes;
    }

    if (targetChargeMinutes == null) {
      return reservationDurationMinutes;
    }

    if (reservationDurationMinutes == null) {
      return targetChargeMinutes;
    }

    return Math.min(targetChargeMinutes, reservationDurationMinutes);
  }, [
    activeSessionId,
    remoteSession?.sessionLimitMinutes,
    reservationDurationMinutes,
    targetChargeMinutes,
  ]);

  const effectiveSessionTargetKwh = useMemo(() => {
    if (targetKwh == null || targetKwh <= 0) return null;
    if (sessionLimitMinutes == null || chargerPowerKw <= 0) return targetKwh;

    return Math.min(targetKwh, chargerPowerKw * (sessionLimitMinutes / 60));
  }, [chargerPowerKw, sessionLimitMinutes, targetKwh]);

  const progressPercentage = useMemo(() => {
    const progressTargetKwh = effectiveSessionTargetKwh ?? targetKwh;
    if (!progressTargetKwh || progressTargetKwh <= 0) return 0;
    return Math.min(100, Math.max(0, (currentKwh / progressTargetKwh) * 100));
  }, [currentKwh, effectiveSessionTargetKwh, targetKwh]);

  const completeChargingSession = useCallback(
    async (
      finalKwh: number,
      finalProgressPercentage: number,
      autoComplete = false,
    ) => {
      setWarningMessage("");
      setErrorMessage("");

      if (!activeSessionId || !charger) return;

      if (completingRef.current) return;

      if (finalKwh <= 0) {
        if (!autoComplete) {
          setWarningMessage("Energy consumption must be generated before completing the session.");
        }
        return;
      }

      completingRef.current = true;
      const finalEndBattery = batteryCapacity && Number.isFinite(startBatteryValue)
        ? Math.min(100, startBatteryValue + (finalKwh / batteryCapacity) * 100)
        : endBatteryValue;
      const finalCost = round2(finalKwh * charger.pricePerKwh);
      const successMessage = autoComplete
        ? "Reservation time expired. Charging session saved."
        : "Charging oturumu kaydedildi.";

      try {
        setSaving(true);
        await updateLiveChargingSession(activeSessionId, {
          currentKwh: finalKwh,
          liveCost: finalCost,
          estimatedRemainingMinutes: 0,
          progressPercentage: finalProgressPercentage,
        });
        await completeLiveChargingSession(activeSessionId, userId, {
          endBatteryPercentage: round2(finalEndBattery),
          consumedKwh: finalKwh,
          totalCost: finalCost,
          autoCompleted: autoComplete,
        });

        setSnackbar({ message: successMessage, variant: "success" });
        navigate("/app", {
          state: {
            snackbar: {
              message: successMessage,
              variant: "success",
            },
          },
        });
      } catch (error) {
        completingRef.current = false;

        if (error instanceof InsufficientWalletBalanceError) {
          setErrorMessage("Wallet balance is insufficient. Please add balance and try again.");
          setSnackbar({ message: "Wallet bakiyesi yetersiz.", variant: "error" });
          return;
        }

        setErrorMessage("Charging session could not be completed. Please try again.");
        setSnackbar({ message: "Charging oturumu tamamlanamadi.", variant: "error" });
      } finally {
        setSaving(false);
      }
    },
    [
      activeSessionId,
      batteryCapacity,
      charger,
      endBatteryValue,
      navigate,
      startBatteryValue,
      userId,
    ],
  );

  useEffect(() => {
    const sessionTargetKwh = effectiveSessionTargetKwh ?? targetKwh;
    if (!activeSessionId || !charger || !sessionTargetKwh || sessionTargetKwh <= 0) {
      return undefined;
    }
    if (remoteSession?.status === "completed") return undefined;

    const tick = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;

      const now = Date.now();
      const elapsedMinutes = (now - startedAt) / 60_000;
      const cappedElapsedMinutes =
        sessionLimitMinutes == null
          ? elapsedMinutes
          : Math.min(elapsedMinutes, sessionLimitMinutes);
      const elapsedHours = cappedElapsedMinutes / 60;
      const calculatedKwh = Math.min(sessionTargetKwh, chargerPowerKw * elapsedHours);
      const nextCurrentKwh = round2(calculatedKwh);
      const nextCost = round2(nextCurrentKwh * charger.pricePerKwh);
      const remainingKwh = Math.max(0, sessionTargetKwh - nextCurrentKwh);
      const energyRemainingMinutes =
        chargerPowerKw > 0 ? (remainingKwh / chargerPowerKw) * 60 : 0;
      const timeRemainingMinutes =
        sessionLimitMinutes == null
          ? energyRemainingMinutes
          : Math.max(0, sessionLimitMinutes - elapsedMinutes);
      const nextRemainingMinutes = Math.min(
        energyRemainingMinutes,
        timeRemainingMinutes,
      );
      const nextProgress = Math.min(100, (nextCurrentKwh / sessionTargetKwh) * 100);
      const shouldComplete =
        nextProgress >= 100 ||
        (sessionLimitMinutes != null && elapsedMinutes >= sessionLimitMinutes);

      setCurrentKwh(nextCurrentKwh);
      setLiveCost(nextCost);
      setEstimatedRemainingMinutes(nextRemainingMinutes);
      setTrend((previous) => {
        const next = [
          ...previous,
          {
            label: new Date().toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            kwh: nextCurrentKwh,
            cost: nextCost,
          },
        ];
        return next.slice(-12);
      });

      if (Date.now() - lastSyncedAtRef.current >= FIRESTORE_SYNC_MS) {
        lastSyncedAtRef.current = Date.now();
        void updateLiveChargingSession(activeSessionId, {
          currentKwh: nextCurrentKwh,
          liveCost: nextCost,
          estimatedRemainingMinutes: nextRemainingMinutes,
          progressPercentage: nextProgress,
        }).catch(() => {
          setSnackbar({
            message: "Live session could not be updated in Firestore.",
            variant: "error",
          });
        });
      }

      if (shouldComplete) {
        void completeChargingSession(nextCurrentKwh, nextProgress, true);
      }
    }, LIVE_TICK_MS);

    return () => window.clearInterval(tick);
  }, [
    activeSessionId,
    charger,
    chargerPowerKw,
    completeChargingSession,
    effectiveSessionTargetKwh,
    remoteSession?.status,
    sessionLimitMinutes,
    targetKwh,
  ]);

  useEffect(() => {
    completeChargingSessionRef.current = completeChargingSession;
  }, [completeChargingSession]);

  useEffect(() => {
    if (!activeSessionId || !reservationDate || !reservationStartTime || !reservationEndTime) {
      return undefined;
    }

    const checkReservationEndTime = () => {
      if (!completeChargingSessionRef.current || !remoteSession) return;
      if (remoteSession.status !== "active") return;

      const endDateTime = buildDateTime(reservationDate, reservationEndTime);
      if (!endDateTime) return;

      const now = Date.now();
      const endTimeMs = endDateTime.getTime();

      if (now >= endTimeMs) {
        const progress = remoteSession.progressPercentage ?? 0;
        const kwh = remoteSession.currentKwh ?? currentKwh;
        void completeChargingSessionRef.current(kwh, progress, true);
      }
    };

    const interval = window.setInterval(checkReservationEndTime, 30_000);
    checkReservationEndTime();

    return () => window.clearInterval(interval);
  }, [activeSessionId, reservationDate, reservationEndTime, reservationStartTime, remoteSession, currentKwh]);

  const validate = () => {
    if (statusBlockMessage) return statusBlockMessage;
    if (reservationWindowBlockedMessage) return reservationWindowBlockedMessage;
    if (!station || !charger) return "Station or charger information is missing.";
    if (vehicleLoading) return "Vehicle details are loading. Please try again.";
    if (!vehicle?.id) return "No suitable vehicle was found for the charging session.";
    if (!batteryCapacity || batteryCapacity <= 0) return "Vehicle battery capacity could not be found.";
    if (!startBattery.trim() || !endBattery.trim()) {
      return "Please enter the starting and target battery percentages.";
    }
    if (!Number.isFinite(startBatteryValue) || !Number.isFinite(endBatteryValue)) {
      return "Battery percentage must be numeric.";
    }
    if (startBatteryValue < 0 || startBatteryValue > 100) {
      return "Starting battery percentage must be between 0 and 100.";
    }
    if (endBatteryValue < 0 || endBatteryValue > 100) {
      return "Target battery percentage must be between 0 and 100.";
    }
    if (endBatteryValue <= startBatteryValue) {
      return "Target battery percentage must be greater than the starting value.";
    }
    if (targetKwh == null || targetKwh <= 0) return "Hedef enerji hesaplanamadi.";
    return "";
  };

  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWarningMessage("");
    setErrorMessage("");

    if (activeSessionId) return;

    const validationError = validate();
    if (validationError) {
      setWarningMessage(validationError);
      return;
    }

    if (!station || !charger || !vehicle || targetKwh == null) {
      setErrorMessage("Live session could not be started. Please check the fields.");
      return;
    }

    try {
      setSaving(true);
      const estimatedTotalMinutes = targetChargeMinutes ?? (targetKwh / chargerPowerKw) * 60;
      const effectiveTotalMinutes = sessionLimitMinutes ?? estimatedTotalMinutes;
      const sessionId = await createLiveChargingSession({
        userId,
        reservationId,
        vehicleId: vehicle.id,
        stationId: station.id,
        chargerId: charger.id,
        startBatteryPercentage: startBatteryValue,
        targetBatteryPercentage: endBatteryValue,
        batteryCapacityKwh: batteryCapacity,
        targetKwh,
        pricePerKwh: charger.pricePerKwh,
        chargerPowerKw,
        estimatedTotalMinutes,
        reservationDurationMinutes,
        sessionLimitMinutes: effectiveTotalMinutes,
      });

      startedAtRef.current = Date.now();
      lastSyncedAtRef.current = 0;
      completingRef.current = false;
      setActiveSessionId(sessionId);
      setEstimatedRemainingMinutes(effectiveTotalMinutes);
      setTrend([
        {
          label: new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          kwh: 0,
          cost: 0,
        },
      ]);
      setSnackbar({ message: "Live charging session started.", variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Live charging session could not be started. Please try again.";
      setErrorMessage(message);
      setSnackbar({ message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = () => {
    void completeChargingSession(currentKwh, progressPercentage);
  };

  if (!station || !charger) {
    return (
      <div style={styles.page}>
        <div style={styles.fallbackCard}>
          <h1 style={styles.fallbackTitle}>Charging oturumu bilgisi eksik</h1>
          <p style={styles.fallbackText}>
            Create a reservation first and open this screen from that reservation.
          </p>
          <div style={{ ...styles.actionRow, marginTop: "18px" }}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate("/station-map")}
            >
              Back to Station Map
            </button>
            <button type="button" style={styles.primaryButton} onClick={() => navigate("/app")}>
              Kayitli Vehiclelara Git
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <main className="charging-session-shell" style={styles.shell}>
        <section style={styles.summaryPanel} aria-label="Charging oturumu ozeti">
          <div style={styles.routeLayer} />
          <div style={styles.summaryContent}>
            <div style={styles.eyebrow}>
              <span style={styles.signalDot} />
              EV Network
            </div>

            <h1 style={styles.title}>Live Charging Session</h1>
            <p style={styles.summaryText}>
              When the session starts, live kWh, remaining time, and cost are updated regularly.
              hesaplanir ve Firestore'a yazilir.
            </p>

            <div style={styles.specCard}>
              <div style={styles.specGrid}>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Station name</div>
                  <div style={styles.specValue}>{station.name}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Charging cihazi</div>
                  <div style={styles.specValue}>{charger.id}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Konnektor tipi</div>
                  <div style={styles.specValue}>{charger.connectorType}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Guc cikisi</div>
                  <div style={styles.specValue}>{charger.powerOutput}</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>kWh basina ucret</div>
                  <div style={styles.specValue}>{charger.pricePerKwh.toFixed(2)} TL</div>
                </div>
                <div style={styles.specItem}>
                  <div style={styles.specLabel}>Reservation</div>
                  <div style={styles.specValue}>
                    {reservationDate && reservationStartTime && reservationEndTime
                      ? `${reservationDate} ${reservationStartTime}-${reservationEndTime}`
                      : "--"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.livePanel}>
            <div style={styles.liveStatus}>
              <strong>{getStatusLabel(remoteSession, Boolean(activeSessionId))}</strong>
              <span style={styles.statusPill}>{Math.round(progressPercentage)}%</span>
            </div>
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${Math.round(progressPercentage)}%`,
                }}
              />
            </div>
          </div>
        </section>

        <section style={styles.formPanel} aria-label="Charging oturumu formu">
          <div style={styles.topBar}>
            <div>
              <h2 style={styles.panelTitle}>Canli Takip</h2>
              <p style={styles.subtitle}>
                Enter the starting and target battery percentages. Final values are calculated while the session is active.
                cost is calculated from live consumed kWh.
              </p>
            </div>
          </div>

          <form onSubmit={handleStart}>
            <div style={styles.sectionLabel}>Battery Percentage</div>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Start (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={startBattery}
                  onChange={(event) => setStartBattery(event.target.value)}
                  style={styles.input}
                  disabled={saving || Boolean(activeSessionId)}
                  placeholder="Orn. 20"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Hedef (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={endBattery}
                  onChange={(event) => setEndBattery(event.target.value)}
                  style={styles.input}
                  disabled={saving || Boolean(activeSessionId)}
                  placeholder="Orn. 75"
                />
              </div>
            </div>

            <p style={styles.helperText}>
              Vehicle kapasitesi:{" "}
              {vehicleLoading ? "..." : batteryCapacity ? `${batteryCapacity} kWh` : "--"}
            </p>

            {warningMessage && (
              <div style={{ ...styles.costCard, borderColor: "#F0D488", color: "#8A6500" }}>
                {warningMessage}
              </div>
            )}

            {!warningMessage && (statusBlockMessage || reservationWindowBlockedMessage) && (
              <div style={{ ...styles.costCard, borderColor: "#F0D488", color: "#8A6500" }}>
                {statusBlockMessage || reservationWindowBlockedMessage}
              </div>
            )}

            {errorMessage && (
              <div style={{ ...styles.costCard, borderColor: "#F4B8AE", color: "#A63E30" }}>
                {errorMessage}
              </div>
            )}

            <div style={styles.metricGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Current kWh</div>
                <div style={styles.metricValue}>{currentKwh.toFixed(2)}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Kalan Sure</div>
                <div style={styles.metricValue}>{formatMinutes(estimatedRemainingMinutes)}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Live Cost</div>
                <div style={styles.metricValue}>{liveCost.toFixed(2)} TL</div>
              </div>
            </div>

            <div style={styles.costCard}>
              <div style={styles.costTitle}>Maliyet ozeti</div>
              <div style={styles.costRow}>
                <span>Hedef kWh</span>
                <span>{targetKwh == null ? "--" : targetKwh.toFixed(2)}</span>
              </div>
              <div style={styles.costRow}>
                <span>Unit price</span>
                <span>{charger.pricePerKwh.toFixed(2)} TL/kWh</span>
              </div>
              <div style={styles.costRow}>
                <span>Planned total</span>
                <span>{plannedTotalCost == null ? "--" : `${plannedTotalCost.toFixed(2)} TL`}</span>
              </div>
              <div style={styles.costRow}>
                <span>Wallet bakiyesi</span>
                <span>{walletBalance == null ? "--" : `${walletBalance.toFixed(2)} TL`}</span>
              </div>
              <div style={{ ...styles.costRow, ...styles.costRowLast }}>
                <span>Islem sonrasi</span>
                <span>
                  {walletBalance == null ? "--" : `${(walletBalance - liveCost).toFixed(2)} TL`}
                </span>
              </div>
            </div>

            {trend.length > 0 && (
              <TimeSeriesChart
                title="Canli kWh / Cost trend"
                description="Latest measurements during the session"
                labels={trend.map((point) => point.label)}
                series={[
                  {
                    name: "kWh",
                    color: "#1F5E4D",
                    data: trend.map((point) => point.kwh),
                  },
                  {
                    name: "TL",
                    color: "#8FAF2B",
                    data: trend.map((point) => point.cost),
                  },
                ]}
                height={170}
                valueFormatter={(value, seriesName) =>
                  seriesName === "TL" ? `${value.toFixed(2)} TL` : `${value.toFixed(2)} kWh`
                }
                yAxisLabel="Canli"
                xAxisLabel="Zaman"
              />
            )}

            <div style={{ ...styles.actionRow, marginTop: "18px" }}>
              {!activeSessionId ? (
                <button
                  type="submit"
                  style={{
                    ...styles.primaryButton,
                    ...(saving ||
                    statusBlockMessage ||
                    reservationWindowBlockedMessage
                      ? styles.disabledButton
                      : {}),
                  }}
                  disabled={
                    saving ||
                    Boolean(statusBlockMessage) ||
                    Boolean(reservationWindowBlockedMessage)
                  }
                >
                  {saving ? "Starting..." : "Start Live Charging"}
                </button>
              ) : (
                <button
                  type="button"
                  style={{
                    ...styles.primaryButton,
                    ...(saving ? styles.disabledButton : {}),
                  }}
                  disabled={saving}
                  onClick={handleComplete}
                >
                  {saving ? "Saving..." : "Complete and Save Session"}
                </button>
              )}

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => navigate("/station-map")}
                disabled={saving}
              >
                Back to Map
              </button>
            </div>
          </form>
        </section>
      </main>

      {snackbar && (
        <Snackbar
          message={snackbar.message}
          variant={snackbar.variant}
          onClose={() => setSnackbar(null)}
        />
      )}

      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type=number] {
          -moz-appearance: textfield;
        }

        .charging-session-shell {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }

        @media (max-width: 1020px) {
          .charging-session-shell {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto auto;
            border-radius: 24px !important;
          }

          .charging-session-shell > section {
            min-height: unset !important;
            max-height: unset !important;
          }
        }

        @media (max-width: 660px) {
          .charging-session-shell {
            border-radius: 20px !important;
          }

          .charging-session-shell > section {
            padding: 24px !important;
          }

          .charging-session-shell form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .charging-session-shell form > div {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .charging-session-shell {
            border-radius: 16px !important;
          }

          .charging-session-shell > section {
            padding: 18px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ChargingSessionScreen;
