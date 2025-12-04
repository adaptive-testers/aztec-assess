export const AUTH = {
  LOGIN: "/auth/login/",
  REGISTER: "/auth/register/",
  LOGOUT: "/auth/logout/",
  TOKEN_REFRESH: "/auth/token/refresh/",
  PROFILE: "/auth/profile/",
  COURSES: "/courses/",
  ENROLLMENT_JOIN: "/enrollment/join/",
  ENROLLMENT_PREVIEW: "/enrollment/preview/",
  OAUTH_GOOGLE: "/auth/oauth/google/",
  // Future endpoints
  //   PASSWORD_RESET: "/auth/password/reset/",
  //   VERIFY_EMAIL: "/auth/verify-email/",
  //   OAUTH_MICROSOFT: "/auth/oauth/microsoft/",
  //   OAUTH_CALLBACK: "/auth/oauth/callback/",
} as const;

export const COURSES = {
  LIST: "/courses/",
  CREATE: "/courses/",
  DETAIL: (id: string) => `/courses/${id}/`,
  UPDATE: (id: string) => `/courses/${id}/`,
  DELETE: (id: string) => `/courses/${id}/`,
} as const;

export type AuthEndpoint = typeof AUTH[keyof typeof AUTH];


