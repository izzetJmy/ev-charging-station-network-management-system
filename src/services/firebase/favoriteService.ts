import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export interface FavoriteStation {
  stationId: string;
  stationName: string;
  createdAt?: unknown;
}

function getFavoriteStationsRef(userId: string) {
  return collection(db, "users", userId, "favoriteStations");
}

function getFavoriteStationRef(userId: string, stationId: string) {
  return doc(db, "users", userId, "favoriteStations", stationId);
}

export function subscribeToFavoriteStations(
  userId: string,
  onChange: (favorites: FavoriteStation[]) => void,
  onError?: () => void,
): Unsubscribe {
  const favoritesQuery = query(
    getFavoriteStationsRef(userId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    favoritesQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((favoriteDoc) => {
          const data = favoriteDoc.data() as Partial<FavoriteStation>;
          return {
            stationId: data.stationId ?? favoriteDoc.id,
            stationName: data.stationName ?? favoriteDoc.id,
            createdAt: data.createdAt,
          };
        }),
      );
    },
    () => {
      onError?.();
    },
  );
}

export async function addFavoriteStation(
  userId: string,
  stationId: string,
  stationName: string,
) {
  await setDoc(
    getFavoriteStationRef(userId, stationId),
    {
      stationId,
      stationName,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function removeFavoriteStation(userId: string, stationId: string) {
  await deleteDoc(getFavoriteStationRef(userId, stationId));
}

export async function toggleFavoriteStation(
  userId: string,
  stationId: string,
  stationName: string,
  isFavorite: boolean,
) {
  if (isFavorite) {
    await removeFavoriteStation(userId, stationId);
    return;
  }

  await addFavoriteStation(userId, stationId, stationName);
}
