import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Charger } from "../../models/Charger";
import { db } from "./firebaseConfig";
import { createNotificationForKnownUsers } from "./notificationService";
import {
  isStationOpenAt,
  normalizeOperatingHours,
} from "../../utils/stationOperatingHours";
import {
  cancelActiveReservationsForOfflineCharger,
  cancelActiveReservationsForOfflineStation,
} from "./reservationCancellationService";

function getDerivedStationStatus(
  chargers: Charger[],
  station: { operatingHours?: unknown; manualOffline?: boolean },
) {
  if (station.manualOffline || !isStationOpenAt({ operatingHours: normalizeOperatingHours(station.operatingHours) })) {
    return "offline";
  }
  if (chargers.length === 0) return null;
  if (chargers.every((charger) => charger.status === "offline")) return "offline";
  if (chargers.some((charger) => charger.status === "available")) return "available";
  return "occupied";
}

async function syncStationStatusFromChargers(stationId: string) {
  if (!stationId) return;

  const chargers = await getChargersByStationId(stationId);
  if (chargers.length === 0) return;

  const stationRef = doc(db, "stations", stationId);
  const stationSnapshot = await getDoc(stationRef);
  const stationName = stationSnapshot.exists()
    ? String(stationSnapshot.data().name ?? "Istasyon")
    : "Istasyon";
  const previousStatus = stationSnapshot.exists()
    ? stationSnapshot.data().status
    : null;
  const manualOffline = stationSnapshot.exists()
    ? stationSnapshot.data().manualOffline === true
    : false;

  if (manualOffline) {
    return;
  }

  const operatingHours = stationSnapshot.exists()
    ? stationSnapshot.data().operatingHours
    : null;
  const nextStatus = getDerivedStationStatus(chargers, {
    operatingHours,
    manualOffline,
  });

  if (!nextStatus || previousStatus === nextStatus) {
    return;
  }

  await updateDoc(stationRef, {
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });

  if (nextStatus === "offline") {
    await cancelActiveReservationsForOfflineStation(stationId, stationName);
  }

  if (previousStatus === "offline" && nextStatus === "available") {
    await createNotificationForKnownUsers({
      type: "station_availability_update",
      title: "Istasyon yeniden uygun",
      message: `${stationName} istasyonu tekrar kullanilabilir durumda.`,
    });
  }
}

function normalizeCharger(data: unknown, id: string): Charger | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  const stationId = typeof obj.stationId === "string" ? obj.stationId : "";
  const type = typeof obj.type === "string" ? obj.type : "";
  const powerOutput = typeof obj.powerOutput === "string" ? obj.powerOutput : "";
  const connectorType = typeof obj.connectorType === "string" ? obj.connectorType : "";
  const pricePerKwh = typeof obj.pricePerKwh === "number" ? obj.pricePerKwh : Number(obj.pricePerKwh);
  const status = typeof obj.status === "string" ? obj.status : "offline";

  if (!id || !stationId || !type || !powerOutput || !connectorType || !Number.isFinite(pricePerKwh)) {
    return null;
  }

  return {
    id,
    stationId,
    type: type as Charger["type"],
    powerOutput: powerOutput as Charger["powerOutput"],
    connectorType: connectorType as Charger["connectorType"],
    pricePerKwh,
    status: status as Charger["status"],
  };
}

export async function getChargers(): Promise<Charger[]> {
  const snap = await getDocs(collection(db, "chargers"));
  return snap.docs
    .map((d) => normalizeCharger(d.data(), d.id))
    .filter((c): c is Charger => Boolean(c));
}

export async function getChargerById(chargerId: string): Promise<Charger | null> {
  const snap = await getDoc(doc(db, "chargers", chargerId));
  if (!snap.exists()) return null;
  return normalizeCharger(snap.data(), snap.id);
}

export async function getChargersByStationId(stationId: string): Promise<Charger[]> {
  const snap = await getDocs(query(collection(db, "chargers"), where("stationId", "==", stationId)));
  return snap.docs
    .map((d) => normalizeCharger(d.data(), d.id))
    .filter((c): c is Charger => Boolean(c));
}

export async function upsertChargers(chargers: Charger[]) {
  const batch = writeBatch(db);
  for (const charger of chargers) {
    const ref = doc(db, "chargers", charger.id);
    batch.set(ref, {
      stationId: charger.stationId,
      type: charger.type,
      powerOutput: charger.powerOutput,
      connectorType: charger.connectorType,
      pricePerKwh: charger.pricePerKwh,
      status: charger.status,
    });
  }
  await batch.commit();

  const stationIds = Array.from(new Set(chargers.map((charger) => charger.stationId)));
  await Promise.all(stationIds.map((stationId) => syncStationStatusFromChargers(stationId)));
}

export async function upsertCharger(charger: Charger) {
  const previousSnapshot = await getDoc(doc(db, "chargers", charger.id));
  const previousStatus = previousSnapshot.exists()
    ? previousSnapshot.data().status
    : null;

  await setDoc(doc(db, "chargers", charger.id), {
    stationId: charger.stationId,
    type: charger.type,
    powerOutput: charger.powerOutput,
    connectorType: charger.connectorType,
    pricePerKwh: charger.pricePerKwh,
    status: charger.status,
  });

  if (previousStatus !== "offline" && charger.status === "offline") {
    await cancelActiveReservationsForOfflineCharger(
      charger.id,
      `${charger.connectorType} ${charger.powerOutput}`,
    );
  }

  await syncStationStatusFromChargers(charger.stationId);
}

export async function updateChargerStatus(
  chargerId: string,
  status: Charger["status"],
) {
  const charger = await getChargerById(chargerId);
  await updateDoc(doc(db, "chargers", chargerId), {
    status,
    updatedAt: serverTimestamp(),
  });

  if (charger?.status !== "offline" && status === "offline") {
    await cancelActiveReservationsForOfflineCharger(
      chargerId,
      charger ? `${charger.connectorType} ${charger.powerOutput}` : "Sarj cihazi",
    );
  }

  if (charger?.stationId) {
    await syncStationStatusFromChargers(charger.stationId);
  }
}

export async function getConnectorTypeOptions(): Promise<string[]> {
  const chargers = await getChargers();
  const seen = new Set<string>();
  for (const c of chargers) {
    if (c.connectorType) seen.add(c.connectorType);
  }

  const all = Array.from(seen);
  all.sort((a, b) => a.localeCompare(b, "tr"));
  return all;
}
