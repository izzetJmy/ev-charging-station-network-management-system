const STORAGE_KEY = "ev_network_user_id";

function createFallbackUuid() {
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateLocalUserId(): string {
  if (typeof window === "undefined") {
    return "server";
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

