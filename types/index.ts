export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface SessionUser {
  id: string;
  role: import("@/lib/constants/roles").Role;
  email: string;
  firstName: string;
  lastName: string;
}

/** Shape stored in Order.shippingAddress / Delivery.address JSON columns. */
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}
