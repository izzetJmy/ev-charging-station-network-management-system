import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getCurrentUserSession } from "../services/auth/localUser";

export default function RequireUser() {
  const location = useLocation();
  const session = getCurrentUserSession();

  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
