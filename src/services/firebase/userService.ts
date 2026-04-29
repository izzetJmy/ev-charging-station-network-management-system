import { db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Vehicle } from "../../models/vehicle";

export const TEMP_USER_ID = "temporary-user-id";

const vehiclesCollection = collection(db, "vehicles");
const stationsCollection = collection(db, "stations");
const chargersCollection = collection(db, "chargers");
const reservationsCollection = collection(db, "reservations");
const chargingSessionsCollection = collection(db, "chargingSessions");
const adminReportsCollection = collection(db, "adminReports");

// Vehicles functions
export const getVehicles = async () => {
  const snapshot = await getDocs(vehiclesCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const getVehiclesByUserId = async (userId: string) => {
  const vehicleQuery = query(vehiclesCollection, where("userId", "==", userId));
  const snapshot = await getDocs(vehicleQuery);

  return snapshot.docs.map((vehicleDoc) => ({
    id: vehicleDoc.id,
    ...vehicleDoc.data(),
  })) as Vehicle[];
};

export const getVehicleByUserId = async (userId: string) => {
  const vehicles = await getVehiclesByUserId(userId);
  return vehicles[0] ?? null;
};

export const updateVehicle = async (
  vehicleId: string,
  vehicle: Omit<Partial<Vehicle>, "id" | "createdAt" | "updatedAt">,
) => {
  const vehicleRef = doc(db, "vehicles", vehicleId);

  await updateDoc(vehicleRef, {
    ...vehicle,
    updatedAt: serverTimestamp(),
  });
};

export const addVehicle = async (vehicle: { model: string; owner: string }) => {
  const docRef = await addDoc(vehiclesCollection, vehicle);
  console.log("Eklenen vehicle ID:", docRef.id);
  return docRef.id;
};

// Stations functions
export const getStations = async () => {
  const snapshot = await getDocs(stationsCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addStation = async (station: {
  name: string;
  location: string;
}) => {
  const docRef = await addDoc(stationsCollection, station);
  console.log("Eklenen station ID:", docRef.id);
  return docRef.id;
};

// Chargers functions
export const getChargers = async () => {
  const snapshot = await getDocs(chargersCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addCharger = async (charger: {
  type: string;
  stationId: string;
}) => {
  const docRef = await addDoc(chargersCollection, charger);
  console.log("Eklenen charger ID:", docRef.id);
  return docRef.id;
};

// Reservations functions
export const getReservations = async () => {
  const snapshot = await getDocs(reservationsCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addReservation = async (reservation: {
  userId: string;
  stationId: string;
  time: string;
}) => {
  const docRef = await addDoc(reservationsCollection, reservation);
  console.log("Eklenen reservation ID:", docRef.id);
  return docRef.id;
};

// ChargingSessions functions
export const getChargingSessions = async () => {
  const snapshot = await getDocs(chargingSessionsCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addChargingSession = async (session: {
  userId: string;
  chargerId: string;
  startTime: string;
  endTime: string;
}) => {
  const docRef = await addDoc(chargingSessionsCollection, session);
  console.log("Eklenen chargingSession ID:", docRef.id);
  return docRef.id;
};

// AdminReports functions
export const getAdminReports = async () => {
  const snapshot = await getDocs(adminReportsCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addAdminReport = async (report: {
  reportType: string;
  data: string;
}) => {
  const docRef = await addDoc(adminReportsCollection, report);
  console.log("Eklenen adminReport ID:", docRef.id);
  return docRef.id;
};
