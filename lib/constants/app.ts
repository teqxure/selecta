export const APP_NAME = "Selecta";

export const DEFAULT_CURRENCY = "NGN";

export const PAGINATION = {
  defaultPageSize: 24,
  maxPageSize: 100,
} as const;

export const SESSION_COOKIE_NAME = "selecta_session";

/** "Remember me" session lifetime. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Default session lifetime when "remember me" is not checked. */
export const SHORT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

/** Reissue the session cookie in proxy.ts once less than this much validity remains. */
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 12; // 12 hours
