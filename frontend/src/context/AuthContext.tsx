import {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import { publicApi } from "../api/axios";
import { AUTH } from "../api/endpoints";

interface AuthContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  checkingRefresh: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

let refreshInFlight: Promise<string | null> | null = null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [checkingRefresh, setCheckingRefresh] = useState(true);
  const didAttemptRefresh = useRef(false);
  const navigate = useNavigate();

  const setAccessToken = (token: string | null) => {
    setAccessTokenState(token);
  };

  useEffect(() => {
    if (didAttemptRefresh.current) {
      return;
    }
    didAttemptRefresh.current = true;

    const run = async () => {
      try {
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
        setCheckingRefresh(false);
      } catch {
        setAccessTokenState(null);
        setCheckingRefresh(false);
      }
    };

    void run();
  }, []);

  const logout = async () => {
    try {
      await publicApi.post(AUTH.LOGOUT, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAccessToken(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ accessToken, setAccessToken, logout, checkingRefresh }}>
      {children}
    </AuthContext.Provider>
  );
};
