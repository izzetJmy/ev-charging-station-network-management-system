import {
  collection,
  doc,
  addDoc,
  FieldPath,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Location, Vehicle } from "../../models/vehicle";
import { db } from "./firebaseConfig";

const vehiclesCollection = collection(db, "vehicles");

export interface StationRatingSummary {
  average: number;
  count: number;
}

export async function getVehicleById(vehicleId: string) {
  const vehicleRef = doc(db, "vehicles", vehicleId);
  const snapshot = await getDoc(vehicleRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Vehicle;
}

export async function getVehicleByUserId(userId: string) {
  const vehicleQuery = query(vehiclesCollection, where("userId", "==", userId));
  const snapshot = await getDocs(vehicleQuery);

  const vehicles = snapshot.docs.map((vehicleDoc) => ({
    id: vehicleDoc.id,
    ...vehicleDoc.data(),
  })) as Vehicle[];

  return vehicles[0] ?? null;
}

export async function updateVehicleCurrentLocation(
  vehicleId: string,
  currentLocation: Location,
) {
  const vehicleRef = doc(db, "vehicles", vehicleId);

  await updateDoc(vehicleRef, {
    currentLocation,
    updatedAt: serverTimestamp(),
  });
}

export async function updateVehicleStationRating(
  vehicleId: string,
  stationId: string,
  rating: number,
) {
  const safeRating = Math.min(5, Math.max(1, Math.round(rating)));
  const vehicleRef = doc(db, "vehicles", vehicleId);

  await updateDoc(
    vehicleRef,
    new FieldPath("stationRatings", stationId),
    safeRating,
    "updatedAt",
    serverTimestamp(),
  );

  const summaries = await getStationAverageRatings();
  const summary = summaries[stationId] ?? { average: safeRating, count: 1 };
  await setDoc(
    doc(db, "stations", stationId),
    {
      ratingAverage: Number(summary.average.toFixed(2)),
      ratingCount: summary.count,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getStationAverageRatings() {
  const snapshot = await getDocs(vehiclesCollection);
  const totals: Record<string, StationRatingSummary> = {};

  snapshot.docs.forEach((vehicleDoc) => {
    const ratings = vehicleDoc.data().stationRatings;
    if (!ratings || typeof ratings !== "object") return;

    Object.entries(ratings as Record<string, unknown>).forEach(([stationId, value]) => {
      if (typeof value !== "number" || value < 1 || value > 5) return;

      const current = totals[stationId] ?? { average: 0, count: 0 };
      totals[stationId] = {
        average: current.average + value,
        count: current.count + 1,
      };
    });
  });

  return Object.fromEntries(
    Object.entries(totals).map(([stationId, summary]) => [
      stationId,
      {
        average: summary.average / summary.count,
        count: summary.count,
      },
    ]),
  ) as Record<string, StationRatingSummary>;
}

export async function createVehicle(
  vehicle: Omit<Vehicle, "id" | "createdAt" | "updatedAt">,
) {
  const vehicleRef = await addDoc(vehiclesCollection, {
    ...vehicle,
    stationRatings: vehicle.stationRatings ?? {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return vehicleRef.id;
}
