import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export type NotificationType =
  | "reservation_confirmed"
  | "reservation_cancelled"
  | "charging_completed"
  | "low_wallet_balance"
  | "station_availability_update";

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

export interface NotificationRecord extends NotificationInput {
  id: string;
  read: boolean;
  createdAt?: unknown;
}

const LOW_WALLET_THRESHOLD = 100;

function getNotificationsRef() {
  return collection(db, "notifications");
}

function toMillis(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

export function getLowWalletThreshold() {
  return LOW_WALLET_THRESHOLD;
}

export async function createNotification(notification: NotificationInput) {
  if (!notification.userId.trim()) return "";

  const ref = await addDoc(getNotificationsRef(), {
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: false,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export function subscribeToNotifications(
  userId: string,
  onChange: (notifications: NotificationRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!userId.trim()) {
    onChange([]);
    return () => undefined;
  }

  const notificationsQuery = query(
    getNotificationsRef(),
    where("userId", "==", userId),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const notifications = snapshot.docs
        .map((notificationDoc) => ({
          id: notificationDoc.id,
          ...(notificationDoc.data() as Omit<NotificationRecord, "id">),
        }))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        .slice(0, 30);

      onChange(notifications);
    },
    (error) => onError?.(error),
  );
}

export async function markNotificationRead(notificationId: string, read = true) {
  await updateDoc(doc(db, "notifications", notificationId), {
    read,
  });
}

export async function markAllNotificationsRead(userId: string) {
  const unreadQuery = query(
    getNotificationsRef(),
    where("userId", "==", userId),
    where("read", "==", false),
  );
  const snapshot = await getDocs(unreadQuery);

  const batch = writeBatch(db);
  snapshot.docs.forEach((notificationDoc) => {
    batch.update(notificationDoc.ref, { read: true });
  });
  await batch.commit();
}

export async function createLowWalletNotificationIfNeeded(
  userId: string,
  balance: number,
) {
  if (balance >= LOW_WALLET_THRESHOLD) return;

  await createNotification({
    userId,
    type: "low_wallet_balance",
    title: "Cuzdan bakiyesi dusuk",
    message: `Bakiyeniz ${balance.toFixed(
      2,
    )} TL. Sarj islemlerinin aksamamasi icin bakiye yukleyin.`,
  });
}

export async function getKnownUserIds() {
  const snapshot = await getDocs(collection(db, "vehicles"));
  const userIds = new Set<string>();

  snapshot.docs.forEach((vehicleDoc) => {
    const userId = vehicleDoc.data().userId;
    if (typeof userId === "string" && userId.trim()) {
      userIds.add(userId);
    }
  });

  return Array.from(userIds);
}

export async function createNotificationForKnownUsers(
  notification: Omit<NotificationInput, "userId">,
) {
  const userIds = await getKnownUserIds();
  if (userIds.length === 0) return;

  const batch = writeBatch(db);
  userIds.forEach((userId) => {
    batch.set(doc(getNotificationsRef()), {
      userId,
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
