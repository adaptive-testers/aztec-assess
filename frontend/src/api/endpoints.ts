export const AUTH = {
  LOGIN: "/auth/login/",
  REGISTER: "/auth/register/",
  LOGOUT: "/auth/logout/",
  TOKEN_REFRESH: "/auth/token/refresh/",
  PROFILE: "/auth/profile/",
  ENROLLMENT_JOIN: "/enrollment/join/",
  ENROLLMENT_PREVIEW: "/enrollment/preview/",
  OAUTH_GOOGLE: "/auth/oauth/google/",
  OAUTH_MICROSOFT: "/auth/oauth/microsoft/",
  // Future endpoints
  //   PASSWORD_RESET: "/auth/password/reset/",
  //   VERIFY_EMAIL: "/auth/verify-email/",
} as const;

export const COURSES = {
  LIST: "/courses/",
  CREATE: "/courses/",
  DETAIL: (id: string) => `/courses/${id}/`,
  UPDATE: (id: string) => `/courses/${id}/`,
  DELETE: (id: string) => `/courses/${id}/`,
  ACTIVATE: (id: string) => `/courses/${id}/activate/`,
  ARCHIVE: (id: string) => `/courses/${id}/archive/`,
  ROTATE_JOIN_CODE: (id: string) => `/courses/${id}/rotate-join-code/`,
  ENABLE_JOIN_CODE: (id: string) => `/courses/${id}/join-code/enable/`,
  DISABLE_JOIN_CODE: (id: string) => `/courses/${id}/join-code/disable/`,
  MEMBERS: (id: string) => `/courses/${id}/members/`,
  ADD_MEMBER: (id: string) => `/courses/${id}/members/add/`,
  REMOVE_MEMBER: (id: string) => `/courses/${id}/members/remove/`,
} as const;

export const QUIZZES = {
  LIST: "/quizzes/",
  DETAIL: (id: number | string) => `/quizzes/${id}/`,
  START_ATTEMPT: (quizId: number | string) => `/quizzes/${quizId}/attempts/`,
  ATTEMPT_DETAIL: (attemptId: number | string) => `/attempts/${attemptId}/`,
  SUBMIT_ANSWER: (attemptId: number | string) => `/attempts/${attemptId}/answer/`,
} as const;

export type AuthEndpoint = typeof AUTH[keyof typeof AUTH];


