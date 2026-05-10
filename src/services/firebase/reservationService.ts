import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { refundWallet } from "./walletService";
import type { Charger } from "../../models/Charger";
import type { ChargerStatus } from "../../models/Charger";
import type { Station } from "../../models/Station";
import type { StationStatus } from "../../models/Station";
import { getReservationStatusBlockMessage } from "../../utils/chargerCompatibility";
import { createNotification } from "./notificationService";
import { getChargerById } from "./chargerService";
import { getStationById } from "./stationService";
import {
  formatOperatingHours,
  isReservationWithinOperatingHours,
  normalizeOperatingHours,
} from "../../utils/stationOperatingHours";

export interface ReservationTimeRange {
  date: string;
  startTime: string;
  endTime: string;
}

export interface ReservationDateRange {
  startDateTime: Date;
  endDateTime: Date;
}

export interface ReservationInput extends ReservationTimeRange {
  vehicleId: string;
  stationId: string;
  chargerId: string;
}

export interface ReservationRecord extends ReservationInput {
  id: string;
  status?: string;
  createdAt?: unknown;
}

export interface ReservationDetailRecord extends ReservationRecord {
  stationName: string;
  chargerLabel: string;
  connectorType: string;
  powerOutput: string;
  station: Station | null;
  charger: Charger | null;
}

function buildDateTime(date: string, time: string) {
  if (!date || !time) {
    return null;
  }

  const dateTime = new Date(`${date}T${time}:00`);

  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }

  return dateTime;
}

export function getReservationDateRange(
  date: string,
  startTime: string,
  endTime: string,
): ReservationDateRange | null {
  const startDateTime = buildDateTime(date, startTime);
  const endDateTime = buildDateTime(date, endTime);

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

export function isWithinReservationWindow(
  reservationRange: ReservationTimeRange,
  now: Date = new Date(),
) {
  const range = getReservationDateRange(
    reservationRange.date,
    reservationRange.startTime,
    reservationRange.endTime,
  );

  if (!range) {
    return false;
  }

  const nowTime = now.getTime();
  return (
    nowTime >= range.startDateTime.getTime() && nowTime <= range.endDateTime.getTime()
  );
}

function hasDateTimeRangeOverlap(
  newStartDateTime: Date,
  newEndDateTime: Date,
  existingStartDateTime: Date,
  existingEndDateTime: Date,
) {
  return (
    newStartDateTime.getTime() < existingEndDateTime.getTime() &&
    newEndDateTime.getTime() > existingStartDateTime.getTime()
  );
}

export async function hasActiveReservationConflict(
  chargerId: string,
  requestedRange: ReservationTimeRange,
  excludeReservationId?: string,
) {
  const requestedDateRange = getReservationDateRange(
    requestedRange.date,
    requestedRange.startTime,
    requestedRange.endTime,
  );

  if (!requestedDateRange) {
    return false;
  }

  const reservationsRef = collection(db, "reservations");
  const reservationsQuery = query(
    reservationsRef,
    where("chargerId", "==", chargerId),
  );
  const snapshot = await getDocs(reservationsQuery);

  return snapshot.docs.some((reservationDoc) => {
    if (excludeReservationId && reservationDoc.id === excludeReservationId) {
      return false;
    }

    const data = reservationDoc.data() as {
      status?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
    };

    if (data.status !== "active" || !data.date) {
      return false;
    }

    if (!data.startTime || !data.endTime) {
      return false;
    }

    const existingDateRange = getReservationDateRange(
      data.date,
      data.startTime,
      data.endTime,
    );

    if (!existingDateRange) {
      return false;
    }

    return hasDateTimeRangeOverlap(
      requestedDateRange.startDateTime,
      requestedDateRange.endDateTime,
      existingDateRange.startDateTime,
      existingDateRange.endDateTime,
    );
  });
}

function toReservationRecord(
  id: string,
  data: unknown,
): ReservationRecord | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const entry = data as Record<string, unknown>;
  const vehicleId = typeof entry.vehicleId === "string" ? entry.vehicleId : "";
  const stationId = typeof entry.stationId === "string" ? entry.stationId : "";
  const chargerId = typeof entry.chargerId === "string" ? entry.chargerId : "";
  const date = typeof entry.date === "string" ? entry.date : "";
  const startTime = typeof entry.startTime === "string" ? entry.startTime : "";
  const endTime = typeof entry.endTime === "string" ? entry.endTime : "";

  if (!id || !vehicleId || !stationId || !chargerId || !date || !startTime || !endTime) {
    return null;
  }

  return {
    id,
    vehicleId,
    stationId,
    chargerId,
    date,
    startTime,
    endTime,
    status: typeof entry.status === "string" ? entry.status : "active",
    createdAt: entry.createdAt,
  };
}

function toStation(record: Awaited<ReturnType<typeof getStationById>>): Station | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    address: record.address,
    latitude: record.latitude,
    longitude: record.longitude,
    status: record.status,
    chargers: [],
  };
}

function getReservationSortTime(reservation: ReservationRecord) {
  const range = getReservationDateRange(
    reservation.date,
    reservation.startTime,
    reservation.endTime,
  );

  if (!range) {
    return 0;
  }

  return range.startDateTime.getTime();
}

export async function getReservationsByVehicleId(
  vehicleId: string,
): Promise<ReservationRecord[]> {
  const reservationsRef = collection(db, "reservations");
  const reservationsQuery = query(
    reservationsRef,
    where("vehicleId", "==", vehicleId),
  );
  const snapshot = await getDocs(reservationsQuery);

  return snapshot.docs
    .map((reservationDoc) =>
      toReservationRecord(reservationDoc.id, reservationDoc.data()),
    )
    .filter((reservation): reservation is ReservationRecord => Boolean(reservation))
    .sort((a, b) => getReservationSortTime(b) - getReservationSortTime(a));
}

export async function getReservationDetailsByVehicleId(
  vehicleId: string,
): Promise<ReservationDetailRecord[]> {
  const reservations = await getReservationsByVehicleId(vehicleId);

  if (reservations.length === 0) {
    return [];
  }

  const stationIds = Array.from(new Set(reservations.map((entry) => entry.stationId)));
  const chargerIds = Array.from(new Set(reservations.map((entry) => entry.chargerId)));
  const stationMap = new Map<string, Station | null>();
  const chargerMap = new Map<string, Charger | null>();

  await Promise.all(
    stationIds.map(async (stationId) => {
      const stationRecord = await getStationById(stationId);
      stationMap.set(stationId, toStation(stationRecord));
    }),
  );

  await Promise.all(
    chargerIds.map(async (chargerId) => {
      const chargerRecord = await getChargerById(chargerId);
      chargerMap.set(chargerId, chargerRecord);
    }),
  );

  return reservations.map((reservation) => {
    const station = stationMap.get(reservation.stationId) ?? null;
    const charger = chargerMap.get(reservation.chargerId) ?? null;

    return {
      ...reservation,
      station,
      charger,
      stationName: station?.name ?? "Istasyon bilgisi bulunamadi",
      chargerLabel: charger ? `${charger.type} - ${charger.id}` : reservation.chargerId,
      connectorType: charger?.connectorType ?? "--",
      powerOutput: charger?.powerOutput ?? "--",
    };
  });
}

export async function getActiveReservationsByChargerId(
  chargerId: string,
): Promise<ReservationRecord[]> {
  const reservationsRef = collection(db, "reservations");
  const reservationsQuery = query(
    reservationsRef,
    where("chargerId", "==", chargerId),
  );
  const snapshot = await getDocs(reservationsQuery);

  return snapshot.docs
    .map((reservationDoc) => ({
      id: reservationDoc.id,
      ...(reservationDoc.data() as Omit<ReservationRecord, "id">),
    }))
    .filter(
      (reservation) =>
        Boolean(reservation.date) &&
        Boolean(reservation.startTime) &&
        Boolean(reservation.endTime) &&
        reservation.status === "active",
    );
}

export async function createReservation(reservation: ReservationInput) {
  const [stationSnapshot, chargerSnapshot] = await Promise.all([
    getDoc(doc(db, "stations", reservation.stationId)),
    getDoc(doc(db, "chargers", reservation.chargerId)),
  ]);
  const statusBlockMessage = getReservationStatusBlockMessage(
    {
      id: reservation.stationId,
      name: "",
      address: "",
      latitude: 0,
      longitude: 0,
      status: (stationSnapshot.data()?.status ?? "offline") as StationStatus,
      chargers: [],
    },
    {
      id: reservation.chargerId,
      stationId: reservation.stationId,
      type: "AC",
      powerOutput: "22kW",
      connectorType: "Type 2",
      pricePerKwh: 0,
      status: (chargerSnapshot.data()?.status ?? "offline") as ChargerStatus,
    },
  );

  if (statusBlockMessage) {
    throw new Error(statusBlockMessage);
  }

  const reservationRange = getReservationDateRange(
    reservation.date,
    reservation.startTime,
    reservation.endTime,
  );
  const operatingHours = normalizeOperatingHours(
    stationSnapshot.data()?.operatingHours,
  );

  if (
    reservationRange &&
    !isReservationWithinOperatingHours(
      { operatingHours },
      reservationRange.startDateTime,
      reservationRange.endDateTime,
    )
  ) {
    throw new Error(
      `Istasyon bu saatlerde kapali. Calisma saatleri: ${formatOperatingHours(
        operatingHours,
      )}.`,
    );
  }

  const hasConflict = await hasActiveReservationConflict(
    reservation.chargerId,
    reservation,
  );

  if (hasConflict) {
    throw new Error("Secilen saat araligi dolu.");
  }

  const reservationRef = await addDoc(collection(db, "reservations"), {
    vehicleId: reservation.vehicleId,
    stationId: reservation.stationId,
    chargerId: reservation.chargerId,
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    status: "active",
    createdAt: serverTimestamp(),
  });

  const vehicleSnapshot = await getDoc(doc(db, "vehicles", reservation.vehicleId));
  const userId = vehicleSnapshot.exists()
    ? vehicleSnapshot.data().userId
    : "";

  if (typeof userId === "string" && userId.trim()) {
    await createNotification({
      userId,
      type: "reservation_confirmed",
      title: "Rezervasyon onaylandi",
      message: `${reservation.date} ${reservation.startTime}-${reservation.endTime} saatleri icin rezervasyonunuz olusturuldu.`,
    });
  }

  return reservationRef.id;
}

function isUpcomingOrOngoingReservation(reservation: ReservationRecord) {
  const range = getReservationDateRange(
    reservation.date,
    reservation.startTime,
    reservation.endTime,
  );
  if (!range) return true;
  return range.endDateTime.getTime() >= Date.now();
}

async function getReservationOwnerUserId(vehicleId: string) {
  const vehicleSnapshot = await getDoc(doc(db, "vehicles", vehicleId));
  const userId = vehicleSnapshot.exists() ? vehicleSnapshot.data().userId : "";
  return typeof userId === "string" ? userId : "";
}

async function cancelReservationsByField(params: {
  fieldName: "stationId" | "chargerId";
  fieldValue: string;
  title: string;
  reason: string;
}) {
  const reservationsQuery = query(
    collection(db, "reservations"),
    where(params.fieldName, "==", params.fieldValue),
    where("status", "==", "active"),
  );
  const snapshot = await getDocs(reservationsQuery);
  const reservations = snapshot.docs
    .map((reservationDoc) =>
      toReservationRecord(reservationDoc.id, reservationDoc.data()),
    )
    .filter((reservation): reservation is ReservationRecord => Boolean(reservation))
    .filter(isUpcomingOrOngoingReservation);

  if (reservations.length === 0) {
    return 0;
  }

  const batch = writeBatch(db);
  reservations.forEach((reservation) => {
    batch.update(doc(db, "reservations", reservation.id), {
      status: "cancelled",
      cancellationReason: params.reason,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();

  await Promise.all(
    reservations.map(async (reservation) => {
      const userId = await getReservationOwnerUserId(reservation.vehicleId);
      if (!userId.trim()) return;

      await createNotification({
        userId,
        type: "reservation_cancelled",
        title: params.title,
        message: `${reservation.date} ${reservation.startTime}-${reservation.endTime} rezervasyonunuz iptal edildi. Sebep: ${params.reason}`,
      });
    }),
  );

  return reservations.length;
}

export function cancelActiveReservationsForOfflineStation(
  stationId: string,
  stationName = "Istasyon",
) {
  return cancelReservationsByField({
    fieldName: "stationId",
    fieldValue: stationId,
    title: "Rezervasyon iptal edildi",
    reason: `${stationName} offline duruma gecti.`,
  });
}

export function cancelActiveReservationsForOfflineCharger(
  chargerId: string,
  chargerLabel = "Sarj cihazi",
) {
  return cancelReservationsByField({
    fieldName: "chargerId",
    fieldValue: chargerId,
    title: "Rezervasyon iptal edildi",
    reason: `${chargerLabel} offline duruma gecti.`,
  });
}

export async function updateReservationSchedule(
  reservationId: string,
  reservationRange: ReservationTimeRange,
) {
  const reservationRef = doc(db, "reservations", reservationId);
  const reservationSnapshot = await getDoc(reservationRef);

  if (!reservationSnapshot.exists()) {
    throw new Error("Rezervasyon bulunamadi.");
  }

  const reservation = reservationSnapshot.data() as {
    chargerId?: string;
    stationId?: string;
    status?: string;
  };

  if (!reservation.chargerId) {
    throw new Error("Rezervasyon sarj cihazi bilgisi eksik.");
  }

  if (!reservation.stationId) {
    throw new Error("Rezervasyon istasyon bilgisi eksik.");
  }

  if (reservation.status && reservation.status !== "active") {
    throw new Error("Sadece aktif rezervasyonlar yeniden planlanabilir.");
  }

  const stationSnapshot = await getDoc(doc(db, "stations", reservation.stationId));
  const requestedRange = getReservationDateRange(
    reservationRange.date,
    reservationRange.startTime,
    reservationRange.endTime,
  );
  const operatingHours = normalizeOperatingHours(
    stationSnapshot.data()?.operatingHours,
  );

  if (
    requestedRange &&
    !isReservationWithinOperatingHours(
      { operatingHours },
      requestedRange.startDateTime,
      requestedRange.endDateTime,
    )
  ) {
    throw new Error(
      `Istasyon bu saatlerde kapali. Calisma saatleri: ${formatOperatingHours(
        operatingHours,
      )}.`,
    );
  }

  const hasConflict = await hasActiveReservationConflict(
    reservation.chargerId,
    reservationRange,
    reservationId,
  );

  if (hasConflict) {
    throw new Error("Secilen saat araligi dolu.");
  }

  await updateDoc(reservationRef, {
    date: reservationRange.date,
    startTime: reservationRange.startTime,
    endTime: reservationRange.endTime,
    status: "active",
    updatedAt: serverTimestamp(),
  });
}

export async function cancelReservation(reservationId: string) {
  const reservationRef = doc(db, "reservations", reservationId);
  const reservationSnapshot = await getDoc(reservationRef);

  if (!reservationSnapshot.exists()) {
    throw new Error("Rezervasyon bulunamadi.");
  }

  const reservation = reservationSnapshot.data() as {
    status?: string;
  };

  if (reservation.status === "cancelled") {
    return;
  }

  await updateDoc(reservationRef, {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function cancelReservationWithRefund(
  reservationId: string,
  userId: string,
  refundAmount = 0,
) {
  const reservationRef = doc(db, "reservations", reservationId);
  const reservationSnapshot = await getDoc(reservationRef);

  if (!reservationSnapshot.exists()) {
    throw new Error("Reservation not found.");
  }

  const reservation = reservationSnapshot.data() as {
    stationId?: string;
    chargerId?: string;
    status?: string;
  };

  await updateDoc(reservationRef, {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
  });

  if (refundAmount > 0) {
    await refundWallet(userId, refundAmount, {
      stationId: reservation.stationId ?? null,
      chargerId: reservation.chargerId ?? null,
      relatedReservationId: reservationId,
    });
  }
}
