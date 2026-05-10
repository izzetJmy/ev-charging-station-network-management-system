import type { OperatingHours, Station } from "../models/Station";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTimeToMinutes(time: string) {
  const match = TIME_PATTERN.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getMinutesForDate(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function normalizeOperatingHours(hours: unknown): OperatingHours {
  if (!hours || typeof hours !== "object") {
    return {
      open: "08:00",
      close: "23:00",
      is24Hours: false,
    };
  }

  const record = hours as Record<string, unknown>;
  const open = typeof record.open === "string" && TIME_PATTERN.test(record.open)
    ? record.open
    : "08:00";
  const close = typeof record.close === "string" && TIME_PATTERN.test(record.close)
    ? record.close
    : "23:00";

  return {
    open,
    close,
    is24Hours: record.is24Hours === true,
  };
}

export function formatOperatingHours(hours?: OperatingHours) {
  const normalized = normalizeOperatingHours(hours);
  if (normalized.is24Hours) return "Open 24 hours";
  return `${normalized.open} - ${normalized.close}`;
}

export function isStationOpenAt(station: Pick<Station, "operatingHours">, date = new Date()) {
  const hours = normalizeOperatingHours(station.operatingHours);
  if (hours.is24Hours) return true;

  const openMinutes = parseTimeToMinutes(hours.open);
  const closeMinutes = parseTimeToMinutes(hours.close);
  if (openMinutes == null || closeMinutes == null) return true;

  const currentMinutes = getMinutesForDate(date);
  if (openMinutes === closeMinutes) return false;

  if (closeMinutes > openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
}

export function isReservationWithinOperatingHours(
  station: Pick<Station, "operatingHours">,
  reservationStart: Date,
  reservationEnd: Date,
) {
  const hours = normalizeOperatingHours(station.operatingHours);
  if (hours.is24Hours) return true;

  const openMinutes = parseTimeToMinutes(hours.open);
  const closeMinutes = parseTimeToMinutes(hours.close);
  if (openMinutes == null || closeMinutes == null) return true;
  if (openMinutes === closeMinutes) return false;

  const startMinutes = getMinutesForDate(reservationStart);
  let endMinutes = getMinutesForDate(reservationEnd);
  if (reservationEnd.getTime() > reservationStart.getTime() && endMinutes === 0) {
    endMinutes = 24 * 60;
  }

  if (closeMinutes > openMinutes) {
    return startMinutes >= openMinutes && endMinutes <= closeMinutes;
  }

  const normalizedEnd = endMinutes <= openMinutes ? endMinutes + 24 * 60 : endMinutes;
  const normalizedStart = startMinutes < openMinutes ? startMinutes + 24 * 60 : startMinutes;
  const normalizedClose = closeMinutes + 24 * 60;

  return normalizedStart >= openMinutes && normalizedEnd <= normalizedClose;
}
