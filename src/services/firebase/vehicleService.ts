import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Location, Vehicle } from "../../models/vehicle";
import { db } from "./firebaseConfig";

const vehiclesCollection = collection(db, "vehicles");

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
