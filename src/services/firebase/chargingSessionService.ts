import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import {
  refundWallet,
  InsufficientWalletBalanceError,
} from "./walletService";

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

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function createChargingSession(session: ChargingSessionInput) {
  const amount = roundMoney(session.totalCost);

  return runTransaction(db, async (firestoreTransaction) => {
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
