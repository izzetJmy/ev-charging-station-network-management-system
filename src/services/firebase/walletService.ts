import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export type WalletTransactionType = "top-up" | "payment" | "refund";
export type WalletPaymentStatus = "succeeded" | "failed";

export interface Wallet {
  balance: number;
  updatedAt?: unknown;
}

export interface WalletTransactionRecord {
  id: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  paymentStatus: WalletPaymentStatus;
  stationId: string | null;
  chargerId: string | null;
  energyConsumed: number | null;
  receiptId: string;
  relatedReservationId?: string | null;
  relatedChargingSessionId?: string | null;
  createdAt?: unknown;
}

export interface WalletOperationContext {
  stationId?: string | null;
  chargerId?: string | null;
  energyConsumed?: number | null;
  relatedReservationId?: string | null;
  relatedChargingSessionId?: string | null;
}

export interface WalletOperationResult {
  balance: number;
  transactionId: string;
  receiptId: string;
}

export class InsufficientWalletBalanceError extends Error {
  constructor() {
    super("Wallet balance is insufficient.");
    this.name = "InsufficientWalletBalanceError";
  }
}

const WALLET_DOC_ID = "default";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertValidAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
}

function getWalletRef(userId: string) {
  return doc(db, "users", userId, "wallet", WALLET_DOC_ID);
}

function getTransactionsRef(userId: string) {
  return collection(db, "users", userId, "transactions");
}

function buildReceiptPayload(
  userId: string,
  type: WalletTransactionType,
  amount: number,
  status: WalletPaymentStatus,
  context: WalletOperationContext,
) {
  return {
    userId,
    stationId: context.stationId ?? null,
    chargerId: context.chargerId ?? null,
    amount: roundMoney(amount),
    energyConsumed:
      context.energyConsumed == null ? null : roundMoney(context.energyConsumed),
    transactionType: type,
    paymentStatus: status,
    createdAt: serverTimestamp(),
  };
}

export async function getWallet(userId: string): Promise<Wallet> {
  const snapshot = await getDoc(getWalletRef(userId));

  if (!snapshot.exists()) {
    return { balance: 0 };
  }

  const data = snapshot.data() as DocumentData;
  return {
    balance: roundMoney(Number(data.balance ?? 0)),
    updatedAt: data.updatedAt,
  };
}

async function createWalletOperation(
  userId: string,
  type: WalletTransactionType,
  amount: number,
  context: WalletOperationContext = {},
): Promise<WalletOperationResult> {
  assertValidAmount(amount);

  return runTransaction(db, async (firestoreTransaction) => {
    const walletRef = getWalletRef(userId);
    const walletSnapshot = await firestoreTransaction.get(walletRef);
    const currentBalance = walletSnapshot.exists()
      ? roundMoney(Number(walletSnapshot.data().balance ?? 0))
      : 0;

    if (type === "payment" && currentBalance < amount) {
      throw new InsufficientWalletBalanceError();
    }

    const nextBalance =
      type === "payment"
        ? roundMoney(currentBalance - amount)
        : roundMoney(currentBalance + amount);

    const receiptRef = doc(collection(db, "receipts"));
    const transactionRef = doc(getTransactionsRef(userId));

    firestoreTransaction.set(
      walletRef,
      {
        balance: nextBalance,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    firestoreTransaction.set(receiptRef, {
      ...buildReceiptPayload(userId, type, amount, "succeeded", context),
      transactionId: transactionRef.id,
    });

    firestoreTransaction.set(transactionRef, {
      userId,
      type,
      amount: roundMoney(amount),
      balanceAfter: nextBalance,
      paymentStatus: "succeeded",
      stationId: context.stationId ?? null,
      chargerId: context.chargerId ?? null,
      energyConsumed:
        context.energyConsumed == null ? null : roundMoney(context.energyConsumed),
      receiptId: receiptRef.id,
      relatedReservationId: context.relatedReservationId ?? null,
      relatedChargingSessionId: context.relatedChargingSessionId ?? null,
      createdAt: serverTimestamp(),
    });

    return {
      balance: nextBalance,
      transactionId: transactionRef.id,
      receiptId: receiptRef.id,
    };
  });
}

export function topUpWallet(userId: string, amount: number) {
  return createWalletOperation(userId, "top-up", amount);
}

export function refundWallet(
  userId: string,
  amount: number,
  context: WalletOperationContext = {},
) {
  return createWalletOperation(userId, "refund", amount, context);
}

export function chargeWallet(
  userId: string,
  amount: number,
  context: WalletOperationContext = {},
) {
  return createWalletOperation(userId, "payment", amount, context);
}

export async function getWalletTransactions(
  userId: string,
  maxResults = 20,
): Promise<WalletTransactionRecord[]> {
  const transactionsQuery = query(
    getTransactionsRef(userId),
    orderBy("createdAt", "desc"),
    limit(maxResults),
  );
  const snapshot = await getDocs(transactionsQuery);

  return snapshot.docs.map((transactionDoc) => ({
    id: transactionDoc.id,
    ...(transactionDoc.data() as Omit<WalletTransactionRecord, "id">),
  }));
}
