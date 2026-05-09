import { useEffect, useState } from "react";
import { collection, getDocs, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { db } from "../services/firebase/firebaseConfig";
import { getOrCreateLocalUserId } from "../services/auth/localUser";
import type { ChargingSessionRecord } from "../services/firebase/chargingSessionService";

export function useActiveChargingSession() {
  const userId = getOrCreateLocalUserId();
  const [activeSession, setActiveSession] = useState<ChargingSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: Unsubscribe | null = null;

    const initializeSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const sessionsRef = collection(db, "chargingSessions");
        const activeSessionQuery = query(
          sessionsRef,
          where("userId", "==", userId),
          where("status", "==", "active"),
        );

        const snapshot = await getDocs(activeSessionQuery);
        const activeDoc = snapshot.docs[0];

        if (cancelled) return;

        if (activeDoc) {
          const sessionData = activeDoc.data() as Omit<ChargingSessionRecord, "id">;
          setActiveSession({
            ...sessionData,
            id: activeDoc.id,
          } as ChargingSessionRecord);
        } else {
          setActiveSession(null);
        }

        if (unsubscribe) unsubscribe();

        unsubscribe = onSnapshot(activeSessionQuery, (querySnapshot) => {
          if (cancelled) return;

          const activeDoc = querySnapshot.docs[0];
          if (activeDoc) {
            const sessionData = activeDoc.data() as Omit<ChargingSessionRecord, "id">;
            setActiveSession({
              ...sessionData,
              id: activeDoc.id,
            } as ChargingSessionRecord);
          } else {
            setActiveSession(null);
          }
        });

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
