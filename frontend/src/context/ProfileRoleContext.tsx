import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";

import { privateApi } from "../api/axios";
import { AUTH } from "../api/endpoints";

import { useAuth } from "./AuthContext";

export type ProfileRole = "student" | "instructor" | "admin";

interface ProfileRoleContextType {
  /** User's account role from profile (fetched after login). Used to pick default skeleton when course role is unknown. */
  profileRole: ProfileRole | null;
  /** True until the first profile fetch completes (or when not authenticated). */
  loading: boolean;
}

const ProfileRoleContext = createContext<ProfileRoleContextType | undefined>(
  undefined
);

export function ProfileRoleProvider({ children }: { children: ReactNode }) {
  const { accessToken, checkingRefresh } = useAuth();
  const [profileRole, setProfileRole] = useState<ProfileRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await privateApi.get<{ role: ProfileRole }>(AUTH.PROFILE);
      if (res.data?.role) {
        setProfileRole(res.data.role);
      } else {
        setProfileRole(null);
      }
    } catch {
      setProfileRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (checkingRefresh || !accessToken) {
      setProfileRole(null);
      setLoading(!accessToken ? false : true);
      return;
    }
    void fetchProfile();
  }, [accessToken, checkingRefresh, fetchProfile]);

  return (
    <ProfileRoleContext.Provider value={{ profileRole, loading }}>
      {children}
    </ProfileRoleContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfileRole() {
  const context = useContext(ProfileRoleContext);
  if (context === undefined) {
    throw new Error("useProfileRole must be used within a ProfileRoleProvider");
  }
  return context;
}
