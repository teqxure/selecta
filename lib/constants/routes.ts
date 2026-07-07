/**
 * Centralized route paths. Never hardcode a path string in a component or
 * redirect — import from here so renaming a route is a one-file change.
 */
export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  profile: "/profile",
  orders: "/orders",
  saved: "/saved",
  cart: "/cart",
  search: "/search",
  product: (id: string) => `/products/${id}`,
  store: (slug: string) => `/store/${slug}`,
  messages: "/messages",
  message: (id: string) => `/messages/${id}`,
  seller: {
    root: "/seller",
    dashboard: "/seller",
    products: "/seller/products",
    newProduct: "/seller/products/new",
    productImages: (id: string) => `/seller/products/${id}/images`,
    productDetails: (id: string) => `/seller/products/${id}/details`,
    productPricing: (id: string) => `/seller/products/${id}/pricing`,
    productLocation: (id: string) => `/seller/products/${id}/location`,
    productReview: (id: string) => `/seller/products/${id}/review`,
    orders: "/seller/orders",
    wallet: "/seller/wallet",
    settings: "/seller/settings",
    customers: "/seller/customers",
    messages: "/seller/messages",
    message: (id: string) => `/seller/messages/${id}`,
    analytics: "/seller/analytics",
    onboarding: {
      personal: "/seller/onboarding/personal",
      store: "/seller/onboarding/store",
      verification: "/seller/onboarding/verification",
    },
  },
  admin: {
    root: "/admin",
    users: "/admin/users",
    sellers: "/admin/sellers",
    seller: (id: string) => `/admin/sellers/${id}`,
    verificationQueue: "/admin/verification-queue",
    categories: "/admin/categories",
    products: "/admin/products",
  },
  notifications: "/notifications",
} as const;

/**
 * Route prefixes that require *some* authenticated session, regardless of
 * role. Checked in proxy.ts alongside the role-specific ROUTE_ROLE_ACCESS
 * table in lib/constants/roles.ts.
 */
export const AUTH_REQUIRED_PREFIXES = ["/profile", "/orders", "/saved", "/cart", "/notifications", "/messages"] as const;
