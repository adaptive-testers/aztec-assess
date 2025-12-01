import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { accessToken, checkingRefresh } = useAuth();

  if (checkingRefresh) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-[#2A2A2A]" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#EF6262]" />
          </div>
          <div className="text-sm text-[#8E8E8E]">Loading...</div>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}


