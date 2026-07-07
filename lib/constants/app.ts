export const APP_NAME = "Selecta";

export const DEFAULT_CURRENCY = "NGN";

export const PAGINATION = {
  defaultPageSize: 24,
  maxPageSize: 100,
} as const;

export const SESSION_COOKIE_NAME = "selecta_session";

/** How long an issued session JWT remains valid. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
