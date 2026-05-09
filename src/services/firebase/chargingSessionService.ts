import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import {
  refundWallet,
  InsufficientWalletBalanceError,
} from "./walletService";
import type { ChargerStatus } from "../../models/Charger";
import type { StationStatus } from "../../models/Station";
import { getChargerStatusBlockMessage } from "../../utils/chargerCompatibility";

export interface ChargingSessionInput {
  userId: string;
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

export type ChargingSessionStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "failed";

export interface LiveChargingSessionInput {
  userId: string;
  reservationId?: string | null;
  vehicleId: string;
  stationId: string;
  chargerId: string;
  startBatteryPercentage: number;
  targetBatteryPercentage: number;
  batteryCapacityKwh: number;
  targetKwh: number;
  pricePerKwh: number;
  chargerPowerKw: number;
  estimatedTotalMinutes: number;
}

export interface LiveChargingSessionUpdate {
  currentKwh: number;
  liveCost: number;
  estimatedRemainingMinutes: number;
  progressPercentage: number;
}

export interface ChargingSessionRecord extends Partial<LiveChargingSessionUpdate> {
  id: string;
  userId: string;
  reservationId?: string | null;
  vehicleId: string;
  stationId: string;
  chargerId: string;
  startBatteryPercentage?: number;
  targetBatteryPercentage?: number;
  batteryCapacityKwh?: number;
  targetKwh?: number;
  pricePerKwh: number;
  chargerPowerKw?: number;
  estimatedTotalMinutes?: number;
  status: ChargingSessionStatus;
  paymentStatus?: "pending" | "succeeded" | "refunded" | "cancelled" | "failed";
  endBatteryPercentage?: number;
  consumedKwh?: number;
  totalCost?: number;
  walletTransactionId?: string;
  receiptId?: string;
  startedAt?: unknown;
  updatedAt?: unknown;
  completedAt?: unknown;
  createdAt?: unknown;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundEnergy(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function toChargingSessionRecord(
  id: string,
  data: DocumentData,
): ChargingSessionRecord {
  return {
    id,
    ...(data as Omit<ChargingSessionRecord, "id">),
  };
}

function assertChargingStatusAllowed(params: {
  stationStatus: StationStatus;
  chargerStatus: ChargerStatus;
}) {
  const message = getChargerStatusBlockMessage(
    {
      id: "",
      name: "",
      address: "",
      latitude: 0,
      longitude: 0,
      status: params.stationStatus,
      chargers: [],
    },
    {
      id: "",
      stationId: "",
      type: "AC",
      powerOutput: "22kW",
      connectorType: "Type 2",
      pricePerKwh: 0,
      status: params.chargerStatus,
    },
  );

  if (message) {
    throw new Error(message);
  }
}

export async function createChargingSession(session: ChargingSessionInput) {
  const amount = roundMoney(session.totalCost);

  return runTransaction(db, async (firestoreTransaction) => {
    const stationRef = doc(db, "stations", session.stationId);
    const chargerRef = doc(db, "chargers", session.chargerId);
    const stationSnapshot = await firestoreTransaction.get(stationRef);
    const chargerSnapshot = await firestoreTransaction.get(chargerRef);

    assertChargingStatusAllowed({
      stationStatus: (stationSnapshot.data()?.status ?? "offline") as StationStatus,
      chargerStatus: (chargerSnapshot.data()?.status ?? "offline") as ChargerStatus,
    });

    const walletRef = doc(db, "users", session.userId, "wallet", "default");
    const walletSnapshot = await firestoreTransaction.get(walletRef);
    const currentBalance = walletSnapshot.exists()
      ? roundMoney(Number(walletSnapshot.data().balance ?? 0))
      : 0;

    if (currentBalance < amount) {
      throw new InsufficientWalletBalanceError();
    }

    const sessionRef = doc(collection(db, "chargingSessions"));
    const receiptRef = doc(collection(db, "receipts"));
    const transactionRef = doc(
      collection(db, "users", session.userId, "transactions"),
    );
    const nextBalance = roundMoney(currentBalance - amount);

    firestoreTransaction.set(sessionRef, {
      ...session,
      totalCost: amount,
      consumedKwh: roundMoney(session.consumedKwh),
      status: "completed",
      paymentStatus: "succeeded",
      walletTransactionId: transactionRef.id,
      receiptId: receiptRef.id,
      createdAt: serverTimestamp(),
    });

    firestoreTransaction.set(
      walletRef,
      {
        balance: nextBalance,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    firestoreTransaction.set(receiptRef, {
      userId: session.userId,
      stationId: session.stationId,
      chargerId: session.chargerId,
      amount,
      energyConsumed: roundMoney(session.consumedKwh),
      transactionType: "payment",
      paymentStatus: "succeeded",
      transactionId: transactionRef.id,
      chargingSessionId: sessionRef.id,
      createdAt: serverTimestamp(),
    });

    firestoreTransaction.set(transactionRef, {
      userId: session.userId,
      type: "payment",
      amount,
      balanceAfter: nextBalance,
      paymentStatus: "succeeded",
      stationId: session.stationId,
      chargerId: session.chargerId,
      energyConsumed: roundMoney(session.consumedKwh),
      receiptId: receiptRef.id,
      relatedReservationId: session.reservationId ?? null,
      relatedChargingSessionId: sessionRef.id,
      createdAt: serverTimestamp(),
    });

    return sessionRef.id;
  });
}

export async function createLiveChargingSession(session: LiveChargingSessionInput) {
  const sessionRef = doc(collection(db, "chargingSessions"));
  const currentKwh = 0;

  await runTransaction(db, async (firestoreTransaction) => {
    const stationRef = doc(db, "stations", session.stationId);
    const chargerRef = doc(db, "chargers", session.chargerId);
    const stationSnapshot = await firestoreTransaction.get(stationRef);
    const chargerSnapshot = await firestoreTransaction.get(chargerRef);

    assertChargingStatusAllowed({
      stationStatus: (stationSnapshot.data()?.status ?? "offline") as StationStatus,
      chargerStatus: (chargerSnapshot.data()?.status ?? "offline") as ChargerStatus,
    });

    firestoreTransaction.set(sessionRef, {
      ...session,
      currentKwh,
      liveCost: 0,
      estimatedRemainingMinutes: Math.max(0, session.estimatedTotalMinutes),
      progressPercentage: 0,
      status: "active",
      paymentStatus: "pending",
      startedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    firestoreTransaction.update(chargerRef, {
      status: "occupied",
      updatedAt: serverTimestamp(),
    });
  });

  return sessionRef.id;
}

export async function updateLiveChargingSession(
  chargingSessionId: string,
  update: LiveChargingSessionUpdate,
) {
  const sessionRef = doc(db, "chargingSessions", chargingSessionId);

  await updateDoc(sessionRef, {
    currentKwh: roundEnergy(update.currentKwh),
    liveCost: roundMoney(update.liveCost),
    estimatedRemainingMinutes: Math.max(
      0,
      Math.ceil(update.estimatedRemainingMinutes),
    ),
    progressPercentage: Math.min(
      100,
      Math.max(0, Math.round(update.progressPercentage)),
    ),
    updatedAt: serverTimestamp(),
  });
}

export async function getChargingSession(chargingSessionId: string) {
  const sessionRef = doc(db, "chargingSessions", chargingSessionId);
  const sessionSnapshot = await getDoc(sessionRef);

  if (!sessionSnapshot.exists()) {
    return null;
  }

  return toChargingSessionRecord(sessionSnapshot.id, sessionSnapshot.data());
}

export function subscribeToChargingSession(
  chargingSessionId: string,
  onChange: (session: ChargingSessionRecord | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const sessionRef = doc(db, "chargingSessions", chargingSessionId);

  return onSnapshot(
    sessionRef,
    (snapshot) => {
      onChange(
        snapshot.exists()
          ? toChargingSessionRecord(snapshot.id, snapshot.data())
          : null,
      );
    },
    (error) => onError?.(error),
  );
}

export async function getChargingSessionHistory(params: {
  userId?: string;
  vehicleId?: string;
}) {
  const sessionsRef = collection(db, "chargingSessions");
  const constraints = [];

  if (params.vehicleId) {
    constraints.push(where("vehicleId", "==", params.vehicleId));
  } else if (params.userId) {
    constraints.push(where("userId", "==", params.userId));
  }

  const sessionsQuery = constraints.length
    ? query(sessionsRef, ...constraints)
    : query(sessionsRef);
  const snapshot = await getDocs(sessionsQuery);

  const sessions = snapshot.docs
    .map((sessionDoc) =>
      toChargingSessionRecord(sessionDoc.id, sessionDoc.data()),
    )
    .filter((session) => (session.status ? session.status === "completed" : true));

  sessions.sort((a, b) => {
    const aDate =
      (a.completedAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
      (a.createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
    const bDate =
      (b.completedAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
      (b.createdAt as { toDate?: () => Date } | undefined)?.toDate?.();

    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return bDate.getTime() - aDate.getTime();
  });

  return sessions;
}

export async function completeLiveChargingSession(
  chargingSessionId: string,
  userId: string,
  final: {
    endBatteryPercentage: number;
    consumedKwh: number;
    totalCost: number;
  },
) {
  const amount = roundMoney(final.totalCost);
  const consumedKwh = roundEnergy(final.consumedKwh);

  return runTransaction(db, async (firestoreTransaction) => {
    const sessionRef = doc(db, "chargingSessions", chargingSessionId);
    const sessionSnapshot = await firestoreTransaction.get(sessionRef);

    if (!sessionSnapshot.exists()) {
      throw new Error("Charging session not found.");
    }

    const session = sessionSnapshot.data() as {
      userId?: string;
      reservationId?: string | null;
      stationId?: string;
      chargerId?: string;
      status?: ChargingSessionStatus;
      pricePerKwh?: number;
      startBatteryPercentage?: number;
    };

    if (session.userId !== userId) {
      throw new Error("Charging session user mismatch.");
    }

    if (session.status === "completed") {
      return chargingSessionId;
    }

    const walletRef = doc(db, "users", userId, "wallet", "default");
    const walletSnapshot = await firestoreTransaction.get(walletRef);
    const currentBalance = walletSnapshot.exists()
      ? roundMoney(Number(walletSnapshot.data().balance ?? 0))
      : 0;

    if (currentBalance < amount) {
      throw new InsufficientWalletBalanceError();
    }

    const receiptRef = doc(collection(db, "receipts"));
    const transactionRef = doc(collection(db, "users", userId, "transactions"));
    const nextBalance = roundMoney(currentBalance - amount);

    firestoreTransaction.update(sessionRef, {
      endBatteryPercentage: final.endBatteryPercentage,
      consumedKwh,
      currentKwh: consumedKwh,
      totalCost: amount,
      liveCost: amount,
      progressPercentage: 100,
      estimatedRemainingMinutes: 0,
      status: "completed",
      paymentStatus: "succeeded",
      walletTransactionId: transactionRef.id,
      receiptId: receiptRef.id,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (session.chargerId) {
      const chargerRef = doc(db, "chargers", session.chargerId);
      firestoreTransaction.update(chargerRef, {
        status: "available",
        updatedAt: serverTimestamp(),
      });
    }

    firestoreTransaction.set(
      walletRef,
      {
        balance: nextBalance,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    firestoreTransaction.set(receiptRef, {
      userId,
      stationId: session.stationId ?? null,
      chargerId: session.chargerId ?? null,
      amount,
      energyConsumed: consumedKwh,
      transactionType: "payment",
      paymentStatus: "succeeded",
      transactionId: transactionRef.id,
      chargingSessionId,
      createdAt: serverTimestamp(),
    });

    firestoreTransaction.set(transactionRef, {
      userId,
      type: "payment",
      amount,
      balanceAfter: nextBalance,
      paymentStatus: "succeeded",
      stationId: session.stationId ?? null,
      chargerId: session.chargerId ?? null,
      energyConsumed: consumedKwh,
      receiptId: receiptRef.id,
      relatedReservationId: session.reservationId ?? null,
      relatedChargingSessionId: chargingSessionId,
      createdAt: serverTimestamp(),
    });

    return chargingSessionId;
  });
}

export async function cancelChargingSessionWithRefund(
  chargingSessionId: string,
  userId: string,
) {
  const sessionRef = doc(db, "chargingSessions", chargingSessionId);
  const sessionSnapshot = await getDoc(sessionRef);

  if (!sessionSnapshot.exists()) {
    throw new Error("Charging session not found.");
  }

  const session = sessionSnapshot.data() as {
    stationId?: string;
    chargerId?: string;
    consumedKwh?: number;
    totalCost?: number;
    reservationId?: string | null;
  };
  const refundAmount = roundMoney(Number(session.totalCost ?? 0));

  await updateDoc(sessionRef, {
    status: "cancelled",
    paymentStatus: refundAmount > 0 ? "refunded" : "cancelled",
    cancelledAt: serverTimestamp(),
  });

  if (session.chargerId) {
    await updateDoc(doc(db, "chargers", session.chargerId), {
      status: "available",
      updatedAt: serverTimestamp(),
    });
  }

  if (refundAmount > 0) {
    await refundWallet(userId, refundAmount, {
      stationId: session.stationId ?? null,
      chargerId: session.chargerId ?? null,
      energyConsumed:
        session.consumedKwh == null ? null : roundMoney(session.consumedKwh),
      relatedReservationId: session.reservationId ?? null,
      relatedChargingSessionId: chargingSessionId,
    });
  }
}

export async function markChargingSessionFailedWithRefund(
  chargingSessionId: string,
  userId: string,
) {
  const sessionRef = doc(db, "chargingSessions", chargingSessionId);
  const sessionSnapshot = await getDoc(sessionRef);

  if (!sessionSnapshot.exists()) {
    throw new Error("Charging session not found.");
  }

  const session = sessionSnapshot.data() as {
    stationId?: string;
    chargerId?: string;
    consumedKwh?: number;
    totalCost?: number;
    reservationId?: string | null;
  };
  const refundAmount = roundMoney(Number(session.totalCost ?? 0));

  await updateDoc(sessionRef, {
    status: "failed",
    paymentStatus: refundAmount > 0 ? "refunded" : "failed",
    failedAt: serverTimestamp(),
  });

  if (session.chargerId) {
    await updateDoc(doc(db, "chargers", session.chargerId), {
      status: "available",
      updatedAt: serverTimestamp(),
    });
  }

  if (refundAmount > 0) {
    await refundWallet(userId, refundAmount, {
      stationId: session.stationId ?? null,
      chargerId: session.chargerId ?? null,
      energyConsumed:
        session.consumedKwh == null ? null : roundMoney(session.consumedKwh),
      relatedReservationId: session.reservationId ?? null,
      relatedChargingSessionId: chargingSessionId,
    });
  }
}
