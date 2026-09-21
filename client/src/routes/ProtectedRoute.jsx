import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
export default function ProtectedRoute() {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={refresh} />;
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
