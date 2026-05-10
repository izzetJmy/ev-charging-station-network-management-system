import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { createNotification } from "./notificationService";

interface ReservationRecord {
  id: string;
  vehicleId: string;
  stationId: string;
  chargerId: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: string;
  createdAt?: unknown;
}

function buildDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const dateTime = new Date(`${date}T${time}:00`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

function getReservationDateRange(date: string, startTime: string, endTime: string) {
  const startDateTime = buildDateTime(date, startTime);
  const endDateTime = buildDateTime(date, endTime);
  if (!startDateTime || !endDateTime) return null;

  if (endDateTime.getTime() <= startDateTime.getTime()) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  return { startDateTime, endDateTime };
}

function toReservationRecord(id: string, data: unknown): ReservationRecord | null {
  if (!data || typeof data !== "object") return null;

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

  if (reservations.length === 0) return 0;

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
        message: `${reservation.date} ${reservation.startTime}-${reservation.endTime} reservation was cancelled. Reason: ${params.reason}`,
      });
    }),
  );

  return reservations.length;
}

export function cancelActiveReservationsForOfflineStation(
  stationId: string,
  stationName = "Station",
) {
  return cancelReservationsByField({
    fieldName: "stationId",
    fieldValue: stationId,
    title: "Reservation cancelled",
    reason: `${stationName} went offline.`,
  });
}

export function cancelActiveReservationsForOfflineCharger(
  chargerId: string,
  chargerLabel = "Charger",
) {
  return cancelReservationsByField({
    fieldName: "chargerId",
    fieldValue: chargerId,
    title: "Reservation cancelled",
    reason: `${chargerLabel} went offline.`,
  });
}
