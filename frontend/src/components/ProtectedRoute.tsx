import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "./ui";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-8"><Spinner label="Checking your session" /></div>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}
