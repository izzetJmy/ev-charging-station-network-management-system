import { doc, getDoc, type DocumentData } from "firebase/firestore";
import { db } from "./firebaseConfig";
import type {
  WalletPaymentStatus,
  WalletTransactionType,
} from "./walletService";

export interface DigitalReceipt {
  id: string;
  userId: string;
  stationId: string | null;
  chargerId: string | null;
  amount: number;
  energyConsumed: number | null;
  transactionType: WalletTransactionType;
  paymentStatus: WalletPaymentStatus;
  transactionId?: string;
  createdAt?: unknown;
}

export async function getReceiptById(
  receiptId: string,
): Promise<DigitalReceipt | null> {
  const snapshot = await getDoc(doc(db, "receipts", receiptId));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as DocumentData),
  } as DigitalReceipt;
}
