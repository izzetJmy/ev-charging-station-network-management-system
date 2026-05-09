import { useEffect, useMemo, useState } from "react";
import {
  subscribeToFavoriteStations,
  type FavoriteStation,
} from "../services/firebase/favoriteService";

export function useFavoriteStations(userId: string) {
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");

    const unsubscribe = subscribeToFavoriteStations(
      userId,
      (nextFavorites) => {
        setFavorites(nextFavorites);
        setLoading(false);
      },
      () => {
        setError("Favoriler alinamadi. Lutfen tekrar deneyin.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [userId]);

  const favoriteStationIds = useMemo(
    () => new Set(favorites.map((favorite) => favorite.stationId)),
    [favorites],
  );

  return {
    favorites,
    favoriteStationIds,
    loading,
    error,
  };
}
