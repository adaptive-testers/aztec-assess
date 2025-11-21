export const AUTH = {
  LOGIN: "/auth/login/",
  REGISTER: "/auth/register/",
  LOGOUT: "/auth/logout/",
  TOKEN_REFRESH: "/auth/token/refresh/",
  PROFILE: "/auth/profile/",
  // Future endpoints
  // PASSWORD_RESET: "/auth/password/reset/",
  // VERIFY_EMAIL: "/auth/verify-email/",
  // OAUTH_GOOGLE: "/auth/oauth/google/",
  // OAUTH_MICROSOFT: "/auth/oauth/microsoft/",
  // OAUTH_CALLBACK: "/auth/oauth/callback/",
} as const;

export type AuthEndpoint = typeof AUTH[keyof typeof AUTH];

export const COURSES = {
  LIST: "/courses/",
  DETAIL: (id: string) => `/courses/${id}/`,
  ACTIVATE: (id: string) => `/courses/${id}/activate/`,
  ARCHIVE: (id: string) => `/courses/${id}/archive/`,
  ROTATE_JOIN_CODE: (id: string) => `/courses/${id}/rotate-join-code/`,
  ENABLE_JOIN_CODE: (id: string) => `/courses/${id}/join-code/enable/`,
  DISABLE_JOIN_CODE: (id: string) => `/courses/${id}/join-code/disable/`,
  MEMBERS: (id: string) => `/courses/${id}/members/`,
  ADD_MEMBER: (id: string) => `/courses/${id}/members/add/`,
  REMOVE_MEMBER: (id: string) => `/courses/${id}/members/remove/`,
  ENROLLMENT_JOIN: "/enrollment/join/",
} as const;

export type CourseEndpoint =
  | typeof COURSES.LIST
  | ReturnType<typeof COURSES.DETAIL>;


