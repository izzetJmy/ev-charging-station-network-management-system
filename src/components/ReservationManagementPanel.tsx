import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  cancelReservation,
  getActiveReservationsByChargerId,
  getReservationDateRange,
  getReservationDetailsByVehicleId,
  hasActiveReservationConflict,
  isWithinReservationWindow,
  updateReservationSchedule,
  type ReservationDetailRecord,
  type ReservationRecord,
} from "../services/firebase/reservationService";
import { getReservationStatusBlockMessage } from "../utils/chargerCompatibility";
import {
  formatOperatingHours,
  isReservationWithinOperatingHours,
} from "../utils/stationOperatingHours";

const SLOT_INTERVAL_MINUTES = 15;
const SLOT_INTERVAL_MS = SLOT_INTERVAL_MINUTES * 60 * 1000;
const MAX_RESERVATION_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_ADVANCE_MS = 24 * 60 * 60 * 1000;

interface PickerOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ReservationManagementPanelProps {
  vehicleId: string;
  vehicleConnectorType: string;
  title?: string;
  description?: string;
}

const styles: Record<string, CSSProperties> = {
  section: {
    marginTop: "20px",
    borderRadius: "18px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "16px",
  },
  sectionHeader: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
    alignItems: "start",
  },
  sectionTitle: {
    margin: 0,
    color: "#17231F",
    fontSize: "20px",
    fontWeight: 850,
  },
  sectionText: {
    margin: "6px 0 0",
    color: "#66756E",
    fontSize: "13px",
    lineHeight: 1.55,
  },
  counterPill: {
    minHeight: "30px",
    padding: "0 10px",
    borderRadius: "999px",
    backgroundColor: "#EEF6F0",
    border: "1px solid #D3E5D8",
    color: "#37594D",
    fontSize: "12px",
    fontWeight: 850,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  },
  message: {
    marginTop: "12px",
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: 1.5,
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
  reservationColumns: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  reservationListCard: {
    borderRadius: "16px",
    border: "1px solid #E2EAE4",
    backgroundColor: "#FBFDFB",
    padding: "12px",
    minHeight: "120px",
    maxHeight: "440px",
    overflowY: "auto",
    overflowX: "hidden",
  },
  reservationListHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "10px",
  },
  reservationListTitle: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 850,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#66756E",
  },
  reservationListCount: {
    fontSize: "11px",
    fontWeight: 850,
    color: "#7A8982",
  },
  reservationList: {
    display: "grid",
    gap: "10px",
  },
  empty: {
    borderRadius: "12px",
    border: "1px dashed #CADBCF",
    backgroundColor: "#F4F9F5",
    color: "#5D7268",
    padding: "12px",
    fontSize: "12px",
    lineHeight: 1.5,
  },
  reservationCard: {
    borderRadius: "14px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "12px",
    display: "grid",
    gap: "10px",
  },
  reservationTop: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px",
    alignItems: "start",
  },
  stationName: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.35,
    fontWeight: 900,
    color: "#17231F",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  statusPill: {
    minHeight: "26px",
    padding: "0 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  },
  statusActive: {
    backgroundColor: "#E9F6E6",
    border: "1px solid #BFE09B",
    color: "#2E6841",
  },
  statusCancelled: {
    backgroundColor: "#F8EDEC",
    border: "1px solid #EBC2BB",
    color: "#8A3F33",
  },
  statusPast: {
    backgroundColor: "#F1F4F2",
    border: "1px solid #D8E2DB",
    color: "#5F6E66",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  infoItem: {
    borderRadius: "12px",
    border: "1px solid #E5EDE7",
    backgroundColor: "#F8FBF8",
    padding: "8px 9px",
  },
  infoLabel: {
    color: "#7A8982",
    fontSize: "10px",
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  infoValue: {
    marginTop: "4px",
    color: "#17231F",
    fontSize: "12px",
    lineHeight: 1.45,
    fontWeight: 850,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
  },
  actionButton: {
    minHeight: "38px",
    padding: "8px 10px",
    borderRadius: "12px",
    border: "1px solid #AFCDBB",
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    fontSize: "12px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  cancelButton: {
    borderColor: "#E8BBB4",
    color: "#A63E30",
    backgroundColor: "#FFF9F8",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1450,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backgroundColor: "rgba(9, 22, 19, 0.42)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  modal: {
    width: "min(760px, 100%)",
    maxHeight: "84vh",
    overflowY: "auto",
    borderRadius: "20px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE8DF",
    boxShadow: "0 20px 48px rgba(31,94,77,0.18)",
    padding: "16px",
    boxSizing: "border-box",
  },
  modalTop: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
    alignItems: "start",
    marginBottom: "12px",
  },
  modalTitle: {
    margin: 0,
    color: "#17231F",
    fontSize: "21px",
    fontWeight: 900,
  },
  modalText: {
    margin: "6px 0 0",
    color: "#66756E",
    fontSize: "13px",
    lineHeight: 1.55,
  },
  closeButton: {
    minHeight: "36px",
    minWidth: "36px",
    borderRadius: "12px",
    border: "1px solid #AFCDBB",
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    fontSize: "12px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  helperText: {
    marginTop: "6px",
    color: "#7A8982",
    fontSize: "12px",
    lineHeight: 1.5,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "10px",
  },
  formGroup: {
    marginBottom: "12px",
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
    minHeight: "44px",
    padding: "11px 12px",
    border: "1px solid #D8E2DB",
    borderRadius: "12px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    backgroundColor: "#FBFDFB",
    color: "#17231F",
    fontFamily: "inherit",
  },
  busySlotsCard: {
    borderRadius: "14px",
    backgroundColor: "#F7FBF7",
    border: "1px solid #D8E2DB",
    padding: "10px 12px",
    color: "#37594D",
    marginBottom: "12px",
  },
  busySlotList: {
    margin: "8px 0 0",
    paddingLeft: "18px",
    color: "#66756E",
    fontSize: "12px",
    lineHeight: 1.5,
    fontWeight: 750,
  },
  modalActionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "12px",
  },
  primaryButton: {
    minHeight: "46px",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 12px 24px rgba(31,94,77,0.20)",
  },
  secondaryButton: {
    minHeight: "46px",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid #AFCDBB",
    backgroundColor: "#FFFFFF",
    color: "#1F5E4D",
    fontSize: "14px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  dangerButton: {
    minHeight: "46px",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid #E8BBB4",
    backgroundColor: "#FFF4F2",
    color: "#A63E30",
    fontSize: "14px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  disabledButton: {
    background: "#AEB8B2",
    borderColor: "#AEB8B2",
    color: "#FFFFFF",
    boxShadow: "none",
    cursor: "not-allowed",
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

function hasReservationOverlap(
  reservations: ReservationRecord[],
  dateValue: string,
  startTimeValue: string,
  endTimeValue: string,
  nowDateTime?: Date,
) {
  const requestedRange = getReservationDateRange(
    dateValue,
    startTimeValue,
    endTimeValue,
  );

  if (!requestedRange) {
    return false;
  }

  return reservations.some((reservation) => {
    const reservedRange = getReservationDateRange(
      reservation.date,
      reservation.startTime,
      reservation.endTime,
    );

    if (!reservedRange) {
      return false;
    }

    if (
      nowDateTime &&
      reservedRange.startDateTime.getTime() <= nowDateTime.getTime()
    ) {
      return false;
    }

    if (
      nowDateTime &&
      reservation.date === formatDateKey(nowDateTime) &&
      reservation.startTime <= formatTimeValue(nowDateTime)
    ) {
      return false;
    }

    return (
      requestedRange.startDateTime.getTime() <
        reservedRange.endDateTime.getTime() &&
      requestedRange.endDateTime.getTime() >
        reservedRange.startDateTime.getTime()
    );
  });
}

function isReservationStartingInFuture(
  reservation: ReservationRecord,
  nowDateTime: Date,
) {
  const todayKey = formatDateKey(nowDateTime);
  const nowTimeValue = formatTimeValue(nowDateTime);

  if (reservation.date < todayKey) {
    return false;
  }

  if (reservation.date === todayKey && reservation.startTime <= nowTimeValue) {
    return false;
  }

  const range = getReservationDateRange(
    reservation.date,
    reservation.startTime,
    reservation.endTime,
  );

  if (!range) {
    return false;
  }

  return range.startDateTime.getTime() > nowDateTime.getTime();
}

function getReservationStatusAppearance(reservation: ReservationDetailRecord, now: Date) {
  if (reservation.status === "cancelled") {
    return {
      label: "iptal edildi",
      style: styles.statusCancelled,
    };
  }

  const range = getReservationDateRange(
    reservation.date,
    reservation.startTime,
    reservation.endTime,
  );

  if (!range) {
    return {
      label: reservation.status ?? "bilinmiyor",
      style: styles.statusPast,
    };
  }

  if (reservation.status === "active" && range.endDateTime.getTime() >= now.getTime()) {
    if (range.startDateTime.getTime() <= now.getTime()) {
      return {
        label: "devam ediyor",
        style: styles.statusActive,
      };
    }

    return {
      label: "aktif",
      style: styles.statusActive,
    };
  }

  return {
    label: reservation.status === "active" ? "gecmis" : reservation.status ?? "gecmis",
    style: styles.statusPast,
  };
}

function getReservationDateTimeRangeLabel(reservation: ReservationDetailRecord) {
  const range = getReservationDateRange(
    reservation.date,
    reservation.startTime,
    reservation.endTime,
  );

  if (!range) {
    return `${reservation.date} ${reservation.startTime} - ${reservation.endTime}`;
  }

  return `${formatDateTimeLabel(range.startDateTime)} - ${formatDateTimeLabel(range.endDateTime)}`;
}

function ReservationManagementPanel({
  vehicleId,
  vehicleConnectorType,
  title = "Rezervasyonlarim",
  description = "Aktif ve gecmis rezervasyonlarinizi buradan yonetin.",
}: ReservationManagementPanelProps) {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<ReservationDetailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const [detailReservation, setDetailReservation] =
    useState<ReservationDetailRecord | null>(null);
  const [cancelReservationTarget, setCancelReservationTarget] =
    useState<ReservationDetailRecord | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rescheduleReservationTarget, setRescheduleReservationTarget] =
    useState<ReservationDetailRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("");
  const [rescheduleWarning, setRescheduleWarning] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [busyReservations, setBusyReservations] = useState<ReservationRecord[]>([]);
  const [busyLoading, setBusyLoading] = useState(false);
  const loadSequenceRef = useRef(0);

  const loadReservations = useCallback(async () => {
    if (!vehicleId) {
      setReservations([]);
      setErrorMessage("");
      return;
    }

    const currentSequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = currentSequence;

    setLoading(true);
    setErrorMessage("");

    try {
      const result = await getReservationDetailsByVehicleId(vehicleId);

      if (loadSequenceRef.current !== currentSequence) {
        return;
      }

      setReservations(result);
    } catch {
      if (loadSequenceRef.current !== currentSequence) {
        return;
      }

      setErrorMessage("Rezervasyonlar alinamadi. Lutfen tekrar deneyin.");
    } finally {
      if (loadSequenceRef.current === currentSequence) {
        setLoading(false);
      }
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void loadReservations();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadReservations, vehicleId]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60 * 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    const chargerId = rescheduleReservationTarget?.chargerId ?? "";

    if (!chargerId) {
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(() => {
      setBusyLoading(true);

      getActiveReservationsByChargerId(chargerId)
        .then((result) => {
          if (cancelled) {
            return;
          }

          setBusyReservations(
            result.filter((reservation) => {
              if (reservation.id === rescheduleReservationTarget?.id) {
                return false;
              }

              return isReservationStartingInFuture(reservation, new Date());
            }),
          );
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setBusyReservations([]);
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setBusyLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [rescheduleReservationTarget?.chargerId, rescheduleReservationTarget?.id]);

  const nowDateTime = useMemo(() => new Date(nowTimestamp), [nowTimestamp]);

  const groupedReservations = useMemo(() => {
    const active: ReservationDetailRecord[] = [];
    const history: ReservationDetailRecord[] = [];

    reservations.forEach((reservation) => {
      const range = getReservationDateRange(
        reservation.date,
        reservation.startTime,
        reservation.endTime,
      );
      const isActiveStatus = reservation.status === "active";
      const isPast =
        !range || range.endDateTime.getTime() < nowDateTime.getTime();

      if (isActiveStatus && !isPast) {
        active.push(reservation);
        return;
      }

      history.push(reservation);
    });

    active.sort((a, b) => {
      const aTime =
        getReservationDateRange(a.date, a.startTime, a.endTime)?.startDateTime.getTime() ??
        0;
      const bTime =
        getReservationDateRange(b.date, b.startTime, b.endTime)?.startDateTime.getTime() ??
        0;
      return aTime - bTime;
    });

    history.sort((a, b) => {
      const aTime =
        getReservationDateRange(a.date, a.startTime, a.endTime)?.startDateTime.getTime() ??
        0;
      const bTime =
        getReservationDateRange(b.date, b.startTime, b.endTime)?.startDateTime.getTime() ??
        0;
      return bTime - aTime;
    });

    return {
      active,
      history,
    };
  }, [nowDateTime, reservations]);

  const maxSelectableDateTime = useMemo(
    () => new Date(nowTimestamp + MAX_ADVANCE_MS),
    [nowTimestamp],
  );

  const selectableStartDateTimes = useMemo(() => {
    if (!rescheduleReservationTarget) {
      return [];
    }

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
  }, [maxSelectableDateTime, nowDateTime, rescheduleReservationTarget]);

  const dateOptions = useMemo<PickerOption[]>(() => {
    if (!rescheduleReservationTarget) {
      return [];
    }

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
          label: `Bugun (${formattedDate})`,
        };
      }

      if (key === tomorrowKey) {
        return {
          value: key,
          label: `Yarin (${formattedDate})`,
        };
      }

      return {
        value: key,
        label: formattedDate,
      };
    });
  }, [nowDateTime, rescheduleReservationTarget, selectableStartDateTimes]);

  const effectiveDate = useMemo(() => {
    if (dateOptions.length === 0) {
      return "";
    }

    const isSelectedDateValid = dateOptions.some(
      (option) => option.value === rescheduleDate,
    );

    return isSelectedDateValid ? rescheduleDate : dateOptions[0].value;
  }, [dateOptions, rescheduleDate]);

  const startTimeOptions = useMemo<PickerOption[]>(() => {
    if (!rescheduleReservationTarget || !effectiveDate) {
      return [];
    }

    return selectableStartDateTimes
      .filter((slotDateTime) => formatDateKey(slotDateTime) === effectiveDate)
      .map((slotDateTime) => {
        const timeValue = formatTimeValue(slotDateTime);
        const slotEndTimeValue = formatTimeValue(
          new Date(slotDateTime.getTime() + SLOT_INTERVAL_MS),
        );
        const isBusy = hasReservationOverlap(
          busyReservations,
          effectiveDate,
          timeValue,
          slotEndTimeValue,
          nowDateTime,
        );

        return {
          value: timeValue,
          label: isBusy ? `${timeValue} (dolu)` : timeValue,
          disabled: isBusy,
        };
      });
  }, [
    busyReservations,
    effectiveDate,
    nowDateTime,
    rescheduleReservationTarget,
    selectableStartDateTimes,
  ]);

  const effectiveStartTime = useMemo(() => {
    const isStartTimeValid = startTimeOptions.some(
      (option) => option.value === rescheduleStartTime && !option.disabled,
    );

    return isStartTimeValid ? rescheduleStartTime : "";
  }, [rescheduleStartTime, startTimeOptions]);

  const endTimeOptions = useMemo<PickerOption[]>(() => {
    if (!rescheduleReservationTarget || !effectiveDate || !effectiveStartTime) {
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
      const isBusy = hasReservationOverlap(
        busyReservations,
        effectiveDate,
        effectiveStartTime,
        timeValue,
        nowDateTime,
      );

      options.push({
        value: timeValue,
        disabled: isBusy,
        label: `${isNextDay ? `${timeValue} (ertesi gun)` : timeValue}${
          isBusy ? " (dolu)" : ""
        }`,
      });
    }

    return options;
  }, [
    busyReservations,
    effectiveDate,
    effectiveStartTime,
    nowDateTime,
    rescheduleReservationTarget,
  ]);

  const effectiveEndTime = useMemo(() => {
    const isEndTimeValid = endTimeOptions.some(
      (option) => option.value === rescheduleEndTime && !option.disabled,
    );

    return isEndTimeValid ? rescheduleEndTime : "";
  }, [endTimeOptions, rescheduleEndTime]);

  const busyReservationsForDate = useMemo(
    () =>
      busyReservations.filter((reservation) => {
        if (reservation.date !== effectiveDate) {
          return false;
        }

        return isReservationStartingInFuture(reservation, nowDateTime);
      }),
    [busyReservations, effectiveDate, nowDateTime],
  );

  const validateReschedule = useCallback(() => {
    if (!rescheduleReservationTarget) {
      return "Yeniden planlanacak rezervasyon bulunamadi.";
    }

    if (!effectiveDate || !effectiveStartTime || !effectiveEndTime) {
      return "Lutfen tarih, baslangic saati ve bitis saatini eksiksiz secin.";
    }

    const resolvedDateRange = getReservationDateRange(
      effectiveDate,
      effectiveStartTime,
      effectiveEndTime,
    );

    if (!resolvedDateRange) {
      return "Secilen tarih veya saat bilgisi gecersiz.";
    }

    const { startDateTime, endDateTime } = resolvedDateRange;

    if (startDateTime.getTime() >= endDateTime.getTime()) {
      return "Baslangic saati bitis saatinden once olmalidir.";
    }

    if (
      startDateTime.getTime() < nowDateTime.getTime() ||
      endDateTime.getTime() <= nowDateTime.getTime()
    ) {
      return "Gecmis zaman araligi icin rezervasyon guncellenemez.";
    }

    if (startDateTime.getTime() - nowDateTime.getTime() > MAX_ADVANCE_MS) {
      return "Rezervasyon 24 saatten daha ileri bir zamana yapilamaz.";
    }

    if (
      endDateTime.getTime() - startDateTime.getTime() >
      MAX_RESERVATION_DURATION_MS
    ) {
      return "Rezervasyon suresi en fazla 2 saat olabilir.";
    }

    if (!rescheduleReservationTarget.station || !rescheduleReservationTarget.charger) {
      return "Istasyon veya sarj cihazi bilgisi eksik.";
    }

    if (
      !isReservationWithinOperatingHours(
        rescheduleReservationTarget.station,
        startDateTime,
        endDateTime,
      )
    ) {
      return `Istasyon bu saatlerde kapali. Calisma saatleri: ${formatOperatingHours(
        rescheduleReservationTarget.station.operatingHours,
      )}.`;
    }

    const statusBlockMessage = getReservationStatusBlockMessage(
      rescheduleReservationTarget.station,
      rescheduleReservationTarget.charger,
    );

    if (statusBlockMessage) {
      return statusBlockMessage;
    }

    if (!vehicleConnectorType.trim()) {
      return "Arac konnektor tipi bulunamadi.";
    }

    if (
      vehicleConnectorType.trim() !==
      rescheduleReservationTarget.charger.connectorType
    ) {
      return "Arac konnektor tipi secilen sarj cihazi ile uyumlu degil.";
    }

    return "";
  }, [
    effectiveDate,
    effectiveEndTime,
    effectiveStartTime,
    nowDateTime,
    rescheduleReservationTarget,
    vehicleConnectorType,
  ]);

  const handleOpenRescheduleModal = (reservation: ReservationDetailRecord) => {
    setSuccessMessage("");
    setRescheduleError("");
    setRescheduleWarning("");
    setBusyReservations([]);
    setBusyLoading(false);
    setRescheduleReservationTarget(reservation);
    setRescheduleDate(reservation.date);
    setRescheduleStartTime(reservation.startTime);
    setRescheduleEndTime(reservation.endTime);
  };

  const handleCloseRescheduleModal = () => {
    setRescheduleReservationTarget(null);
    setRescheduleError("");
    setRescheduleWarning("");
    setBusyReservations([]);
    setBusyLoading(false);
  };

  const handleSubmitReschedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setRescheduleError("");
    setRescheduleWarning("");
    setSuccessMessage("");

    if (!rescheduleReservationTarget) {
      setRescheduleWarning("Yeniden planlanacak rezervasyon bulunamadi.");
      return;
    }

    if (rescheduleReservationTarget.status !== "active") {
      setRescheduleWarning("Sadece aktif rezervasyonlar yeniden planlanabilir.");
      return;
    }

    const validationError = validateReschedule();
    if (validationError) {
      setRescheduleWarning(validationError);
      return;
    }

    if (!rescheduleReservationTarget.chargerId) {
      setRescheduleWarning("Rezervasyon sarj cihazi bilgisi eksik.");
      return;
    }

    try {
      setRescheduleSaving(true);

      const hasConflict = await hasActiveReservationConflict(
        rescheduleReservationTarget.chargerId,
        {
          date: effectiveDate,
          startTime: effectiveStartTime,
          endTime: effectiveEndTime,
        },
        rescheduleReservationTarget.id,
      );

      if (hasConflict) {
        setRescheduleWarning("Secilen saat araligi dolu.");
        return;
      }

      await updateReservationSchedule(rescheduleReservationTarget.id, {
        date: effectiveDate,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
      });

      setDetailReservation((current) => {
        if (!current || current.id !== rescheduleReservationTarget.id) {
          return current;
        }

        return {
          ...current,
          date: effectiveDate,
          startTime: effectiveStartTime,
          endTime: effectiveEndTime,
          status: "active",
        };
      });
      setSuccessMessage("Rezervasyon saati guncellendi.");
      setRescheduleReservationTarget(null);
      await loadReservations();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setRescheduleError(
        message || "Rezervasyon guncellenirken bir hata olustu.",
      );
    } finally {
      setRescheduleSaving(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReservationTarget) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      setCancelLoading(true);
      await cancelReservation(cancelReservationTarget.id);
      setDetailReservation((current) => {
        if (!current || current.id !== cancelReservationTarget.id) {
          return current;
        }

        return {
          ...current,
          status: "cancelled",
        };
      });
      setCancelReservationTarget(null);
      setSuccessMessage("Rezervasyon iptal edildi.");
      await loadReservations();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setErrorMessage(message || "Rezervasyon iptal edilirken bir hata olustu.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleOpenDetail = (reservation: ReservationDetailRecord) => {
    setDetailReservation(reservation);
    setSuccessMessage("");
  };

  const handleStartChargingFromDetail = () => {
    if (!detailReservation?.station || !detailReservation?.charger || !vehicleId) {
      return;
    }

    navigate("/charging-session", {
      state: {
        station: detailReservation.station,
        charger: detailReservation.charger,
        vehicleId,
        reservationId: detailReservation.id,
        reservationDate: detailReservation.date,
        reservationStartTime: detailReservation.startTime,
        reservationEndTime: detailReservation.endTime,
      },
    });
  };

  const canStartChargingFromDetail = useMemo(() => {
    if (!detailReservation || detailReservation.status !== "active") {
      return false;
    }

    if (!detailReservation.station || !detailReservation.charger) {
      return false;
    }

    return isWithinReservationWindow(
      {
        date: detailReservation.date,
        startTime: detailReservation.startTime,
        endTime: detailReservation.endTime,
      },
      nowDateTime,
    );
  }, [detailReservation, nowDateTime]);

  const detailStartInfoMessage = useMemo(() => {
    if (!detailReservation) {
      return "";
    }

    if (detailReservation.status !== "active") {
      return "Aktif olmayan rezervasyonlar icin sarj oturumu baslatilamaz.";
    }

    if (!detailReservation.station || !detailReservation.charger) {
      return "Istasyon veya sarj cihazi bilgisi eksik oldugu icin oturum baslatilamiyor.";
    }

    if (!canStartChargingFromDetail) {
      return "Sarj oturumu sadece rezervasyon saat araliginda baslatilabilir.";
    }

    return "Rezervasyon saati uygun. Sarj oturumu baslatilabilir.";
  }, [canStartChargingFromDetail, detailReservation]);

  if (!vehicleId) {
    return (
      <section style={styles.section} aria-label="Rezervasyonlarim">
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>{title}</h3>
            <p style={styles.sectionText}>
              Rezervasyonlari gormek icin once bir arac secin.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section style={styles.section} aria-label="Rezervasyonlarim">
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>{title}</h3>
            <p style={styles.sectionText}>{description}</p>
          </div>
          <div style={styles.counterPill}>
            {loading
              ? "Yukleniyor..."
              : `${groupedReservations.active.length} aktif / ${groupedReservations.history.length} gecmis`}
          </div>
        </div>

        {errorMessage && (
          <div style={{ ...styles.message, ...styles.error }}>{errorMessage}</div>
        )}

        {successMessage && (
          <div style={{ ...styles.message, ...styles.success }}>{successMessage}</div>
        )}

        <div className="reservation-columns" style={styles.reservationColumns}>
          <article style={styles.reservationListCard}>
            <div style={styles.reservationListHeader}>
              <h4 style={styles.reservationListTitle}>Aktif rezervasyonlar</h4>
              <span style={styles.reservationListCount}>
                {groupedReservations.active.length}
              </span>
            </div>

            {groupedReservations.active.length === 0 ? (
              <div style={styles.empty}>
                Aktif rezervasyon bulunmuyor.
              </div>
            ) : (
              <div style={styles.reservationList}>
                {groupedReservations.active.map((reservation) => {
                  const statusAppearance = getReservationStatusAppearance(
                    reservation,
                    nowDateTime,
                  );

                  return (
                    <article key={reservation.id} style={styles.reservationCard}>
                      <div style={styles.reservationTop}>
                        <h5 style={styles.stationName}>{reservation.stationName}</h5>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...statusAppearance.style,
                          }}
                        >
                          {statusAppearance.label}
                        </span>
                      </div>

                      <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Charger</div>
                          <div style={styles.infoValue}>{reservation.chargerLabel}</div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Status</div>
                          <div style={styles.infoValue}>{reservation.status ?? "--"}</div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Date</div>
                          <div style={styles.infoValue}>{reservation.date}</div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Time range</div>
                          <div style={styles.infoValue}>
                            {reservation.startTime} - {reservation.endTime}
                          </div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Connector</div>
                          <div style={styles.infoValue}>{reservation.connectorType}</div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Power output</div>
                          <div style={styles.infoValue}>{reservation.powerOutput}</div>
                        </div>
                      </div>

                      <div style={styles.actionRow}>
                        <button
                          type="button"
                          style={styles.actionButton}
                          onClick={() => handleOpenDetail(reservation)}
                        >
                          Detay
                        </button>
                        <button
                          type="button"
                          style={styles.actionButton}
                          onClick={() => handleOpenRescheduleModal(reservation)}
                        >
                          Yeniden planla
                        </button>
                        <button
                          type="button"
                          style={{ ...styles.actionButton, ...styles.cancelButton }}
                          onClick={() => setCancelReservationTarget(reservation)}
                        >
                          Iptal et
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>

          <article style={styles.reservationListCard}>
            <div style={styles.reservationListHeader}>
              <h4 style={styles.reservationListTitle}>Gecmis rezervasyonlar</h4>
              <span style={styles.reservationListCount}>
                {groupedReservations.history.length}
              </span>
            </div>

            {groupedReservations.history.length === 0 ? (
              <div style={styles.empty}>Gecmis rezervasyon bulunmuyor.</div>
            ) : (
              <div style={styles.reservationList}>
                {groupedReservations.history.map((reservation) => {
                  const statusAppearance = getReservationStatusAppearance(
                    reservation,
                    nowDateTime,
                  );

                  return (
                    <article key={reservation.id} style={styles.reservationCard}>
                      <div style={styles.reservationTop}>
                        <h5 style={styles.stationName}>{reservation.stationName}</h5>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...statusAppearance.style,
                          }}
                        >
                          {statusAppearance.label}
                        </span>
                      </div>

                      <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Charger</div>
                          <div style={styles.infoValue}>{reservation.chargerLabel}</div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Status</div>
                          <div style={styles.infoValue}>{reservation.status ?? "--"}</div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Date</div>
                          <div style={styles.infoValue}>{reservation.date}</div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Time range</div>
                          <div style={styles.infoValue}>
                            {reservation.startTime} - {reservation.endTime}
                          </div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Connector</div>
                          <div style={styles.infoValue}>{reservation.connectorType}</div>
                        </div>
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Power output</div>
                          <div style={styles.infoValue}>{reservation.powerOutput}</div>
                        </div>
                      </div>

                      <div style={{ ...styles.actionRow, gridTemplateColumns: "1fr" }}>
                        <button
                          type="button"
                          style={styles.actionButton}
                          onClick={() => handleOpenDetail(reservation)}
                        >
                          Detay
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </div>
      </section>

      {detailReservation && (
        <div style={styles.overlay} onClick={() => setDetailReservation(null)}>
          <section style={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalTop}>
              <div>
                <h3 style={styles.modalTitle}>Rezervasyon Detayi</h3>
                <p style={styles.modalText}>{detailReservation.stationName}</p>
              </div>
              <button
                type="button"
                style={styles.closeButton}
                onClick={() => setDetailReservation(null)}
              >
                Kapat
              </button>
            </div>

            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Charger</div>
                <div style={styles.infoValue}>{detailReservation.chargerLabel}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Status</div>
                <div style={styles.infoValue}>{detailReservation.status ?? "--"}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Date</div>
                <div style={styles.infoValue}>{detailReservation.date}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Time range</div>
                <div style={styles.infoValue}>
                  {detailReservation.startTime} - {detailReservation.endTime}
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Connector</div>
                <div style={styles.infoValue}>{detailReservation.connectorType}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Power output</div>
                <div style={styles.infoValue}>{detailReservation.powerOutput}</div>
              </div>
            </div>

            <div style={{ marginTop: "12px" }}>
              <div style={{ ...styles.message, ...styles.success }}>
                {getReservationDateTimeRangeLabel(detailReservation)}
              </div>

              <div
                style={{
                  ...styles.message,
                  ...(canStartChargingFromDetail ? styles.success : styles.error),
                }}
              >
                {detailStartInfoMessage}
              </div>
            </div>

            <div style={styles.modalActionRow}>
              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  ...(canStartChargingFromDetail ? {} : styles.disabledButton),
                }}
                disabled={!canStartChargingFromDetail}
                onClick={handleStartChargingFromDetail}
              >
                Sarj Oturumunu Baslat
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setDetailReservation(null)}
              >
                Kapat
              </button>
            </div>
          </section>
        </div>
      )}

      {cancelReservationTarget && (
        <div
          style={styles.overlay}
          onClick={() => {
            if (!cancelLoading) {
              setCancelReservationTarget(null);
            }
          }}
        >
          <section style={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalTop}>
              <div>
                <h3 style={styles.modalTitle}>Rezervasyon Iptali</h3>
                <p style={styles.modalText}>
                  {cancelReservationTarget.stationName} rezervasyonunu iptal etmek
                  istediginize emin misiniz?
                </p>
              </div>
            </div>

            <div style={styles.modalActionRow}>
              <button
                type="button"
                style={{
                  ...styles.dangerButton,
                  ...(cancelLoading ? styles.disabledButton : {}),
                }}
                onClick={() => void handleConfirmCancel()}
                disabled={cancelLoading}
              >
                {cancelLoading ? "Iptal ediliyor..." : "Rezervasyonu Iptal Et"}
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setCancelReservationTarget(null)}
                disabled={cancelLoading}
              >
                Vazgec
              </button>
            </div>
          </section>
        </div>
      )}

      {rescheduleReservationTarget && (
        <div style={styles.overlay} onClick={handleCloseRescheduleModal}>
          <section style={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalTop}>
              <div>
                <h3 style={styles.modalTitle}>Rezervasyonu Yeniden Planla</h3>
                <p style={styles.modalText}>{rescheduleReservationTarget.stationName}</p>
              </div>
              <button
                type="button"
                style={styles.closeButton}
                onClick={handleCloseRescheduleModal}
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleSubmitReschedule}>
              <div style={styles.busySlotsCard}>
                <strong>Uygun saat kontrolu</strong>
                {busyLoading ? (
                  <div style={styles.helperText}>Dolu saatler yukleniyor...</div>
                ) : busyReservationsForDate.length > 0 ? (
                  <ul style={styles.busySlotList}>
                    {busyReservationsForDate.map((reservation) => (
                      <li key={reservation.id}>
                        {reservation.startTime} - {reservation.endTime} dolu
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={styles.helperText}>
                    Secili tarih icin tum saatler uygun gorunuyor.
                  </div>
                )}
              </div>

              <div style={styles.fieldGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tarih</label>
                  <select
                    value={effectiveDate}
                    onChange={(event) => {
                      setRescheduleDate(event.target.value);
                      setRescheduleStartTime("");
                      setRescheduleEndTime("");
                    }}
                    style={styles.input}
                    disabled={rescheduleSaving || dateOptions.length === 0}
                  >
                    <option value="">Tarih secin</option>
                    {dateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {dateOptions.length === 0 && (
                    <p style={styles.helperText}>Su anda secilebilir tarih bulunmuyor.</p>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Baslangic saati</label>
                  <select
                    value={effectiveStartTime}
                    onChange={(event) => {
                      setRescheduleStartTime(event.target.value);
                      setRescheduleEndTime("");
                    }}
                    style={styles.input}
                    disabled={
                      rescheduleSaving ||
                      !effectiveDate ||
                      startTimeOptions.length === 0
                    }
                  >
                    <option value="">Baslangic saati secin</option>
                    {startTimeOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {effectiveDate && startTimeOptions.length === 0 && (
                    <p style={styles.helperText}>
                      Bu tarih icin uygun baslangic saati bulunmuyor.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ ...styles.fieldGrid, gridTemplateColumns: "1fr" }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Bitis saati</label>
                  <select
                    value={effectiveEndTime}
                    onChange={(event) => setRescheduleEndTime(event.target.value)}
                    style={styles.input}
                    disabled={
                      rescheduleSaving ||
                      !effectiveStartTime ||
                      endTimeOptions.length === 0
                    }
                  >
                    <option value="">Bitis saati secin</option>
                    {endTimeOptions.map((option) => (
                      <option
                        key={option.label}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {effectiveStartTime && endTimeOptions.length === 0 && (
                    <p style={styles.helperText}>
                      Secilen baslangic saatine gore uygun bitis saati bulunmuyor.
                    </p>
                  )}
                </div>
              </div>

              {rescheduleWarning && (
                <div style={{ ...styles.message, ...styles.error }}>
                  {rescheduleWarning}
                </div>
              )}

              {rescheduleError && (
                <div style={{ ...styles.message, ...styles.error }}>
                  {rescheduleError}
                </div>
              )}

              <div style={styles.modalActionRow}>
                <button
                  type="submit"
                  style={{
                    ...styles.primaryButton,
                    ...(rescheduleSaving ? styles.disabledButton : {}),
                  }}
                  disabled={rescheduleSaving}
                >
                  {rescheduleSaving ? "Kaydediliyor..." : "Yeni Saati Kaydet"}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={handleCloseRescheduleModal}
                  disabled={rescheduleSaving}
                >
                  Vazgec
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .reservation-columns {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

export default ReservationManagementPanel;
