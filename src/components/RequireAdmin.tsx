import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminAuthenticated } from "../services/auth/adminAuth";

export default function RequireAdmin() {
  const location = useLocation();

  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

