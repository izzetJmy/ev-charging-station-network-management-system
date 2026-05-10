const STORAGE_KEY = "ev_network_user_id";
const SESSION_KEY = "ev_network_user_session";

export interface LocalUserSession {
  id: string;
  email: string;
  phone: string;
  username: string;
}

function createFallbackUuid() {
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCurrentUserSession(): LocalUserSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(SESSION_KEY);
  if (!rawSession) return null;

  try {
    const session = JSON.parse(rawSession) as Partial<LocalUserSession>;
    if (!session.id || !session.email || !session.phone || !session.username) {
      return null;
    }

    return {
      id: session.id,
      email: session.email,
      phone: session.phone,
      username: session.username,
    };
  } catch {
    return null;
  }
}

export function setCurrentUserSession(session: LocalUserSession) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem(STORAGE_KEY, session.id);
}

export function clearCurrentUserSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getOrCreateLocalUserId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const currentUser = getCurrentUserSession();
  if (currentUser) {
    return currentUser.id;
  }

  const existing = window.localStorage.getItem(STORAGE_KEY)?.trim();
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : createFallbackUuid();

  window.localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}

