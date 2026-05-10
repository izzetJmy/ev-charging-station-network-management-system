import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Station } from "../../models/Station";
import type { Charger } from "../../models/Charger";
import { db } from "./firebaseConfig";
import { getChargers } from "./chargerService";
import { createNotificationForKnownUsers } from "./notificationService";
import {
  isStationOpenAt,
  normalizeOperatingHours,
} from "../../utils/stationOperatingHours";
import { cancelActiveReservationsForOfflineStation } from "./reservationCancellationService";

function getDerivedStationStatus(chargers: Charger[], station: Pick<Station, "operatingHours" | "manualOffline">) {
  if (station.manualOffline || !isStationOpenAt({ operatingHours: station.operatingHours })) return "offline";
  if (chargers.length === 0) return null;
  if (chargers.every((charger) => charger.status === "offline")) return "offline";
  if (chargers.some((charger) => charger.status === "available")) return "available";
  return "occupied";
}

function normalizeStation(data: unknown, id: string): Omit<Station, "chargers"> & { chargerIds: string[] } | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name : "";
  const address = typeof obj.address === "string" ? obj.address : "";
  const latitude = typeof obj.latitude === "number" ? obj.latitude : Number(obj.latitude);
  const longitude = typeof obj.longitude === "number" ? obj.longitude : Number(obj.longitude);
  const status = typeof obj.status === "string" ? obj.status : "offline";
  const operatingHours = normalizeOperatingHours(obj.operatingHours);
  const hasManualOfflineFlag = typeof obj.manualOffline === "boolean";
  const manualOffline = hasManualOfflineFlag
    ? obj.manualOffline === true
    : status === "offline" && isStationOpenAt({ operatingHours });
  const chargerIds = Array.isArray(obj.chargerIds) ? obj.chargerIds.filter((x): x is string => typeof x === "string") : [];
  const ratingAverage = typeof obj.ratingAverage === "number" ? obj.ratingAverage : Number(obj.ratingAverage);
  const ratingCount = typeof obj.ratingCount === "number" ? obj.ratingCount : Number(obj.ratingCount);

  if (!id || !name || !address || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id,
    name,
    address,
    latitude,
    longitude,
    status: manualOffline || !isStationOpenAt({ operatingHours })
      ? "offline"
      : (status as Station["status"]),
    operatingHours,
    manualOffline,
    ratingAverage: Number.isFinite(ratingAverage) ? ratingAverage : 0,
    ratingCount: Number.isFinite(ratingCount) ? ratingCount : 0,
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
    const stationChargers = byIds.length ? byIds : fallback;
    const derivedStatus = getDerivedStationStatus(stationChargers, station);

    return {
      id: station.id,
      name: station.name,
      address: station.address,
      latitude: station.latitude,
      longitude: station.longitude,
      status: derivedStatus ?? station.status,
      operatingHours: station.operatingHours ?? normalizeOperatingHours(null),
      manualOffline: station.manualOffline,
      ratingAverage: station.ratingAverage ?? 0,
      ratingCount: station.ratingCount ?? 0,
      chargers: stationChargers,
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
      operatingHours: station.operatingHours ?? normalizeOperatingHours(null),
      manualOffline: station.manualOffline ?? station.status === "offline",
      chargerIds: (station.chargers ?? []).map((c) => c.id),
    });
  }
  await batch.commit();
}

export async function upsertStation(station: Station) {
  const stationRef = doc(db, "stations", station.id);
  const previousSnapshot = await getDoc(stationRef);
  const previousStatus = previousSnapshot.exists()
    ? previousSnapshot.data().status
    : null;
  const existingChargers = await getChargers();
  const stationChargers = existingChargers.filter(
    (charger) => charger.stationId === station.id,
  );
  const manualOffline = station.status === "offline";
  let effectiveChargers = stationChargers;

  if (!manualOffline && stationChargers.length > 0 && stationChargers.every((charger) => charger.status === "offline")) {
    const batch = writeBatch(db);
    stationChargers.forEach((charger) => {
      batch.set(
        doc(db, "chargers", charger.id),
        {
          status: "available",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
    await batch.commit();
    effectiveChargers = stationChargers.map((charger) => ({
      ...charger,
      status: "available",
    }));
  }

  const operatingHours = station.operatingHours ?? normalizeOperatingHours(null);
  const nextStatus = manualOffline
    ? "offline"
    : getDerivedStationStatus(effectiveChargers, {
        operatingHours,
        manualOffline,
      }) ?? station.status;

  await setDoc(stationRef, {
    name: station.name,
    address: station.address,
    latitude: station.latitude,
    longitude: station.longitude,
    status: nextStatus,
    operatingHours,
    manualOffline,
    ratingAverage: previousSnapshot.exists()
      ? Number(previousSnapshot.data().ratingAverage ?? station.ratingAverage ?? 0)
      : station.ratingAverage ?? 0,
    ratingCount: previousSnapshot.exists()
      ? Number(previousSnapshot.data().ratingCount ?? station.ratingCount ?? 0)
      : station.ratingCount ?? 0,
    chargerIds: (station.chargers ?? []).map((c) => c.id),
  });

  if (manualOffline && stationChargers.length > 0) {
    const batch = writeBatch(db);
    stationChargers.forEach((charger) => {
      batch.set(
        doc(db, "chargers", charger.id),
        {
          status: "offline",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
    await batch.commit();
  }

  if (previousStatus === "offline" && nextStatus === "available") {
    await createNotificationForKnownUsers({
      type: "station_availability_update",
      title: "Station Available Again",
      message: `${station.name} station is available again.`,
    });
  }

  if (!previousSnapshot.exists() || previousSnapshot.data().manualOffline !== true) {
    if (manualOffline) {
      await cancelActiveReservationsForOfflineStation(station.id, station.name);
    }
  }
}

export async function updateStationChargerIds(stationId: string, chargerIds: string[]) {
  await setDoc(doc(db, "stations", stationId), { chargerIds }, { merge: true });
}

export async function deleteStation(stationId: string) {
  if (!stationId.trim()) return;

  const stationSnapshot = await getDoc(doc(db, "stations", stationId));
  const stationName = stationSnapshot.exists()
    ? String(stationSnapshot.data().name ?? stationId)
    : stationId;

  await cancelActiveReservationsForOfflineStation(stationId, stationName);

  const chargersSnapshot = await getDocs(
    query(collection(db, "chargers"), where("stationId", "==", stationId)),
  );
  const batch = writeBatch(db);
  chargersSnapshot.docs.forEach((chargerDoc) => {
    batch.delete(chargerDoc.ref);
  });
  await batch.commit();

  await deleteDoc(doc(db, "stations", stationId));
}
