// src/context/AuthContext.tsx

import { createContext, useState, useContext, useEffect, useRef, type ReactNode } from "react";

import { publicApi } from "../api/axios";
import { AUTH } from "../api/endpoints";

// Define the shape of our context state
interface AuthContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define a custom hook for convenience
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Module-level in-flight refresh to dedupe parallel attempts
let refreshInFlight: Promise<string | null> | null = null;

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [checkingRefresh, setCheckingRefresh] = useState(true);
  const didAttemptRefresh = useRef(false);

  const setAccessToken = (token: string | null) => {
    setAccessTokenState(token);
  };

  useEffect(() => {
    if (didAttemptRefresh.current) {
      // Already attempted once (handles StrictMode double-invoke)
      setCheckingRefresh(false);
      return;
    }
    didAttemptRefresh.current = true;

    const run = async () => {
      try {
        // Dedupe refresh calls if multiple components mount simultaneously
        if (!refreshInFlight) {
          refreshInFlight = publicApi
            .post(AUTH.TOKEN_REFRESH)
            .then((res) => res.data?.tokens?.access ?? null)
            .finally(() => {
              refreshInFlight = null;
            });
        }
        const newToken = await refreshInFlight;
        setAccessTokenState(newToken);
      } catch {
        setAccessTokenState(null);
      } finally {
        setCheckingRefresh(false);
      }
    };

    void run();
  }, []);

  if (checkingRefresh) {
    return <div className="p-8 text-center text-white">Loading session…</div>;
  }

  return (
    <AuthContext.Provider value={{ accessToken, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};
