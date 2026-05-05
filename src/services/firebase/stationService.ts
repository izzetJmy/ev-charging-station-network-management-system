import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { Station } from "../../models/Station";
import type { Charger } from "../../models/Charger";
import { db } from "./firebaseConfig";
import { getChargers } from "./chargerService";

function normalizeStation(data: unknown, id: string): Omit<Station, "chargers"> & { chargerIds: string[] } | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name : "";
  const address = typeof obj.address === "string" ? obj.address : "";
  const latitude = typeof obj.latitude === "number" ? obj.latitude : Number(obj.latitude);
  const longitude = typeof obj.longitude === "number" ? obj.longitude : Number(obj.longitude);
  const status = typeof obj.status === "string" ? obj.status : "offline";
  const chargerIds = Array.isArray(obj.chargerIds) ? obj.chargerIds.filter((x): x is string => typeof x === "string") : [];

  if (!id || !name || !address || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id,
    name,
    address,
    latitude,
    longitude,
    status: status as Station["status"],
    chargerIds,
  };
}

export async function getStations(): Promise<Array<Omit<Station, "chargers"> & { chargerIds: string[] }>> {
  const snap = await getDocs(collection(db, "stations"));
  return snap.docs
    .map((d) => normalizeStation(d.data(), d.id))
    .filter((s): s is Omit<Station, "chargers"> & { chargerIds: string[] } => Boolean(s));
}

export async function getStationById(
  stationId: string,
): Promise<(Omit<Station, "chargers"> & { chargerIds: string[] }) | null> {
  const snap = await getDoc(doc(db, "stations", stationId));
  if (!snap.exists()) return null;
  return normalizeStation(snap.data(), snap.id);
}

export async function getStationsWithChargers(): Promise<Station[]> {
  const [stations, chargers] = await Promise.all([getStations(), getChargers()]);
  const chargersById: Record<string, Charger> = {};
  const chargersByStation: Record<string, Charger[]> = {};

  for (const charger of chargers) {
    chargersById[charger.id] = charger;
    (chargersByStation[charger.stationId] ||= []).push(charger);
  }

  return stations.map((station) => {
    const byIds =
      station.chargerIds.length > 0
        ? station.chargerIds
            .map((id) => chargersById[id])
            .filter((c): c is Charger => Boolean(c))
        : [];

    const fallback = chargersByStation[station.id] ?? [];

    return {
      id: station.id,
      name: station.name,
      address: station.address,
      latitude: station.latitude,
      longitude: station.longitude,
      status: station.status,
      chargers: byIds.length ? byIds : fallback,
    };
  });
}

export async function upsertStations(stations: Station[]) {
  const batch = writeBatch(db);
  for (const station of stations) {
    batch.set(doc(db, "stations", station.id), {
      name: station.name,
      address: station.address,
      latitude: station.latitude,
      longitude: station.longitude,
      status: station.status,
      chargerIds: (station.chargers ?? []).map((c) => c.id),
    });
  }
  await batch.commit();
}

export async function upsertStation(station: Station) {
  await setDoc(doc(db, "stations", station.id), {
    name: station.name,
    address: station.address,
    latitude: station.latitude,
    longitude: station.longitude,
    status: station.status,
    chargerIds: (station.chargers ?? []).map((c) => c.id),
  });
}

export async function updateStationChargerIds(stationId: string, chargerIds: string[]) {
  await setDoc(doc(db, "stations", stationId), { chargerIds }, { merge: true });
}
