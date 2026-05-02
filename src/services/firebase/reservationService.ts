import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

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

export async function createReservation(reservation: ReservationInput) {
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
