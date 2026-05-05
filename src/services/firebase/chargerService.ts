import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Charger } from "../../models/Charger";
import { db } from "./firebaseConfig";

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
}

export async function upsertCharger(charger: Charger) {
  await setDoc(doc(db, "chargers", charger.id), {
    stationId: charger.stationId,
    type: charger.type,
    powerOutput: charger.powerOutput,
    connectorType: charger.connectorType,
    pricePerKwh: charger.pricePerKwh,
    status: charger.status,
  });
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
