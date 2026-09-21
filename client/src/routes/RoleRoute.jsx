import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";
export default function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return roles.includes(user.role) ? (
    <Outlet />
  ) : (
    <Navigate to={`/${user.role}`} replace />
  );
}
