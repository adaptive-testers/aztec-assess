import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

type CourseRoles = Record<string, string>;

interface CourseRoleContextType {
  roles: CourseRoles;
  setRole: (courseId: string, role: string) => void;
  setRoles: (newRoles: CourseRoles) => void;
  replaceRoles: (newRoles: CourseRoles) => void;
  clearRoles: () => void;
  getRole: (courseId: string) => string | null;
}

const CourseRoleContext = createContext<CourseRoleContextType | undefined>(undefined);

export function CourseRoleProvider({ children }: { children: ReactNode }) {
  const [roles, setRolesState] = useState<CourseRoles>({});

  const setRole = useCallback((courseId: string, role: string) => {
    setRolesState((prev) => ({ ...prev, [courseId]: role }));
  }, []);

  const setRoles = useCallback((newRoles: CourseRoles) => {
    setRolesState((prev) => ({ ...prev, ...newRoles }));
  }, []);

  const replaceRoles = useCallback((newRoles: CourseRoles) => {
    setRolesState({ ...newRoles });
  }, []);

  const clearRoles = useCallback(() => {
    setRolesState({});
  }, []);

  const getRole = useCallback(
    (courseId: string) => roles[courseId] ?? null,
    [roles]
  );

  return (
    <CourseRoleContext.Provider
      value={{ roles, setRole, setRoles, replaceRoles, clearRoles, getRole }}
    >
      {children}
    </CourseRoleContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCourseRole(courseId?: string | null) {
  const context = useContext(CourseRoleContext);
  if (context === undefined) {
    throw new Error("useCourseRole must be used within a CourseRoleProvider");
  }
  if (!courseId) return null;
  return context.getRole(courseId);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCourseRoleContext() {
  const context = useContext(CourseRoleContext);
  if (context === undefined) {
    throw new Error("useCourseRoleContext must be used within a CourseRoleProvider");
  }
  return context;
}
