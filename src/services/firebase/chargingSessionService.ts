import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export interface ChargingSessionInput {
  reservationId?: string | null;
  vehicleId: string;
  stationId: string;
  chargerId: string;
  startBatteryPercentage: number;
  endBatteryPercentage: number;
  consumedKwh: number;
  pricePerKwh: number;
  totalCost: number;
}

export async function createChargingSession(session: ChargingSessionInput) {
  const docRef = await addDoc(collection(db, "chargingSessions"), {
    ...session,
    status: "completed",
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}
