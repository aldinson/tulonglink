import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "@tulonglink/shared";
import { useAuth } from "../context/AuthContext.js";

/**
 * Composed after `ProtectedRoute` (session presence already guaranteed),
 * not merged into it — residents' existing routes stay untouched by this
 * check entirely rather than gaining a role condition that's always true
 * for them.
 */
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { session } = useAuth();

  if (!session || !roles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
