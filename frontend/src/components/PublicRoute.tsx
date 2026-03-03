import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute redirects authenticated users away from public pages (like login)
 * to the dashboard. Unauthenticated users can access the page normally.
 */
export default function PublicRoute({ children }: PublicRouteProps) {
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

  // If authenticated, redirect to profile (later change to dashboard once implemented)
  if (accessToken) {
    return <Navigate to="/profile" replace />;
  }

  // If not authenticated, show the public page
  return <>{children}</>;
}

