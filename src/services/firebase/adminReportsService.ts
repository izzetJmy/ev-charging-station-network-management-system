import {
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { mockStations } from "../../data/mockStations";

type ChargingSessionDoc = {
  reservationId: string;
  vehicleId: string;
  stationId: string;
  chargerId: string;
  startBatteryPercentage: number;
  endBatteryPercentage: number;
  consumedKwh: number;
  pricePerKwh: number;
  totalCost: number;
  status: "completed";
  createdAt?: Timestamp;
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStartDate(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

export async function fetchAdminDashboardMetrics() {
  const reservationsSnap = await getDocs(collection(db, "reservations"));
  const sessionsSnap = await getDocs(collection(db, "chargingSessions"));

  let totalRevenue = 0;
  let totalEnergyConsumed = 0;

  sessionsSnap.forEach((doc) => {
    const data = doc.data() as Partial<ChargingSessionDoc>;
    totalRevenue += Number(data.totalCost ?? 0);
    totalEnergyConsumed += Number(data.consumedKwh ?? 0);
  });

  return {
    totalReservations: reservationsSnap.size,
    totalChargingSessions: sessionsSnap.size,
    totalRevenue: round2(totalRevenue),
    totalEnergyConsumed: round2(totalEnergyConsumed),
  };
}

export async function fetchAdminTimeSeries(days = 14) {
  const startDate = getStartDate(days);
  const buckets: Record<
    string,
    { reservations: number; sessions: number; revenue: number; energy: number }
  > = {};

  for (let i = 0; i < days; i += 1) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    buckets[toDateKey(d)] = { reservations: 0, sessions: 0, revenue: 0, energy: 0 };
  }

  const reservationsSnap = await getDocs(collection(db, "reservations"));
  reservationsSnap.forEach((doc) => {
    const data = doc.data() as { createdAt?: Timestamp };
    const createdAt = data.createdAt?.toDate?.();
    if (!createdAt) return;
    if (createdAt < startDate) return;
    const key = toDateKey(createdAt);
    if (!buckets[key]) return;
    buckets[key].reservations += 1;
  });

  const sessionsSnap = await getDocs(collection(db, "chargingSessions"));
  sessionsSnap.forEach((doc) => {
    const data = doc.data() as Partial<ChargingSessionDoc>;
    const createdAt = data.createdAt?.toDate?.();
    if (!createdAt) return;
    if (createdAt < startDate) return;
    const key = toDateKey(createdAt);
    if (!buckets[key]) return;
    buckets[key].sessions += 1;
    buckets[key].revenue += Number(data.totalCost ?? 0);
    buckets[key].energy += Number(data.consumedKwh ?? 0);
  });

  const rows = Object.entries(buckets)
    .map(([dateKey, values]) => ({
      dateKey,
      dateLabel: new Date(`${dateKey}T00:00:00`).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
      }),
      reservations: values.reservations,
      sessions: values.sessions,
      revenue: round2(values.revenue),
      energy: round2(values.energy),
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return rows;
}

export async function fetchRevenueReport() {
  const sessionsSnap = await getDocs(collection(db, "chargingSessions"));

  let totalRevenue = 0;
  const revenueByStation: Record<string, number> = {};

  sessionsSnap.forEach((doc) => {
    const data = doc.data() as Partial<ChargingSessionDoc>;
    const stationId = String(data.stationId ?? "");
    const totalCost = Number(data.totalCost ?? 0);
    totalRevenue += totalCost;

    if (stationId) {
      revenueByStation[stationId] = (revenueByStation[stationId] ?? 0) + totalCost;
    }
  });

  const sessionCount = sessionsSnap.size;
  const averageRevenuePerSession = sessionCount ? round2(totalRevenue / sessionCount) : 0;

  const stationNameById = new Map(mockStations.map((station) => [station.id, station.name]));

  const revenueByStationRows = Object.entries(revenueByStation)
    .map(([stationId, revenue]) => ({
      stationId,
      stationName: stationNameById.get(stationId) ?? stationId,
      revenue: round2(revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue: round2(totalRevenue),
    averageRevenuePerSession,
    revenueByStation: revenueByStationRows,
  };
}

export async function fetchStationStatistics() {
  const stationsSnap = await getDocs(collection(db, "stations")).catch(() => null);
  const stations =
    stationsSnap?.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) ??
    mockStations;

  const reservationsSnap = await getDocs(collection(db, "reservations")).catch(() => null);

  const sessionsSnap = await getDocs(collection(db, "chargingSessions"));

  const sessionCountByStation: Record<string, number> = {};
  const energyByStation: Record<string, number> = {};
  const revenueByStation: Record<string, number> = {};

  sessionsSnap.forEach((doc) => {
    const data = doc.data() as Partial<ChargingSessionDoc>;
    const stationId = String(data.stationId ?? "");
    if (!stationId) return;
    sessionCountByStation[stationId] = (sessionCountByStation[stationId] ?? 0) + 1;
    energyByStation[stationId] =
      (energyByStation[stationId] ?? 0) + Number(data.consumedKwh ?? 0);
    revenueByStation[stationId] =
      (revenueByStation[stationId] ?? 0) + Number(data.totalCost ?? 0);
  });

  const stationNameById = new Map(
    (stations as Array<{ id: string; name?: string }>).map((station) => [
      station.id,
      station.name ?? station.id,
    ]),
  );

  const mostUsedStationId =
    Object.entries(sessionCountByStation).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const mostUsedStation = mostUsedStationId
    ? {
        stationId: mostUsedStationId,
        stationName: stationNameById.get(mostUsedStationId) ?? mostUsedStationId,
        sessionCount: sessionCountByStation[mostUsedStationId] ?? 0,
      }
    : null;

  const sessionCountRows = Object.entries(sessionCountByStation)
    .map(([stationId, count]) => ({
      stationId,
      stationName: stationNameById.get(stationId) ?? stationId,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const energyRows = Object.entries(energyByStation)
    .map(([stationId, energy]) => ({
      stationId,
      stationName: stationNameById.get(stationId) ?? stationId,
      energy: round2(energy),
    }))
    .sort((a, b) => b.energy - a.energy);

  const revenueRows = Object.entries(revenueByStation)
    .map(([stationId, revenue]) => ({
      stationId,
      stationName: stationNameById.get(stationId) ?? stationId,
      revenue: round2(revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  let available = 0;
  let occupied = 0;
  let offline = 0;

  for (const station of stations as Array<{ status?: unknown }>) {
    const status = String(station.status ?? "").toLowerCase();
    if (status === "available") available += 1;
    else if (status === "occupied") occupied += 1;
    else if (status === "offline") offline += 1;
  }

  const reservationCount = reservationsSnap?.size ?? 0;

  return {
    mostUsedStation,
    sessionCountByStation: sessionCountRows,
    energyConsumedByStation: energyRows,
    revenueByStation: revenueRows,
    stationStatusSummary: { available, occupied, offline },
    reservationCount,
  };
}
