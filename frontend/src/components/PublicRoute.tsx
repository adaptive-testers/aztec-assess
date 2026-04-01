import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

interface PublicRouteProps {
  children: React.ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { accessToken, checkingRefresh } = useAuth();

  if (checkingRefresh) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#050505]">
        <div
          data-testid="public-route-auth-shell"
          role="status"
          aria-label="Checking session"
          className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2A2A] border-t-[#6B6B6B]"
        />
      </div>
    );
  }

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
