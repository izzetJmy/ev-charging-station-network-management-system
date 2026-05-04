const ADMIN_SESSION_KEY = "ev_admin_session_v1";

export function isAdminAuthenticated(): boolean {
  return localStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

export function adminLogin(username: string, password: string): boolean {
  const ok = username.trim().toLowerCase() === "admin" && password === "admin";
  if (ok) localStorage.setItem(ADMIN_SESSION_KEY, "1");
  return ok;
}

export function adminLogout() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

