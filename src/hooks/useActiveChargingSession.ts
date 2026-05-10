import { useEffect, useState } from "react";
import { getOrCreateLocalUserId } from "../services/auth/localUser";
import {
  getActiveChargingSessionByUserId,
  subscribeToActiveChargingSessionByUserId,
  type ChargingSessionRecord,
} from "../services/firebase/chargingSessionService";

export function useActiveChargingSession() {
  const userId = getOrCreateLocalUserId();
  const [activeSession, setActiveSession] = useState<ChargingSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const initializeSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentSession = await getActiveChargingSessionByUserId(userId);

        if (cancelled) return;

        setActiveSession(currentSession);

        if (unsubscribe) unsubscribe();

        unsubscribe = subscribeToActiveChargingSessionByUserId(
          userId,
          (session) => {
            if (cancelled) return;
            setActiveSession(session);
          },
          (error) => {
            if (cancelled) return;
            setError(error);
          },
        );

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setLoading(false);
        }
      }
    };

    void initializeSession();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  return { activeSession, loading, error };
}
