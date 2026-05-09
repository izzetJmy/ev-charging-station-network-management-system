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
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { refundWallet } from "./walletService";
import type { ChargerStatus } from "../../models/Charger";
import type { StationStatus } from "../../models/Station";
import { getReservationStatusBlockMessage } from "../../utils/chargerCompatibility";

interface ReservationTimeRange {
  date: string;
  startTime: string;
  endTime: string;
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

function getReservationRange(date: string, startTime: string, endTime: string) {
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
) {
  const requestedDateRange = getReservationRange(
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

    const existingDateRange = getReservationRange(
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

  return reservationRef.id;
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
