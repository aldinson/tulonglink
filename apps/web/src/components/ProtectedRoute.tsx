import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

/** Gates on local session presence, not token validity — see
 * authService.hasLocalSession for why. */
export function ProtectedRoute() {
  const { session } = useAuth();

  if (session === undefined) {
    return <div className="p-6 text-center text-gray-500">Loading…</div>;
  }
  if (session === null) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
