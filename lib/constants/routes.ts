/**
 * Centralized route paths. Never hardcode a path string in a component or
 * redirect — import from here so renaming a route is a one-file change.
 */
export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  seller: {
    root: "/seller",
    dashboard: "/seller",
  },
  admin: {
    root: "/admin",
  },
} as const;

/** Route prefixes that require an authenticated session (checked in proxy.ts). */
export const PROTECTED_PREFIXES = ["/seller", "/admin"] as const;
