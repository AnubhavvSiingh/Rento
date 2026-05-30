// Shared UI types for hash routing, admin views, and theme mode.
export type Route =
  | "home"
  | "explore"
  | "customer-auth"
  | "customer-shipping"
  | "customer-confirmation"
  | "customer-dashboard"
  | "advertiser"
  | "admin"
  | "admin-inventory"
  | "admin-delivery"
  | "admin-analytics"
  | "admin-marketing";

export type AdminView = "overview" | "inventory" | "delivery" | "analytics" | "marketing";

export type AdminFilter = "ALL" | "APPROVED" | "PENDING" | "SUSPENDED";

export type ThemeMode = "dark" | "light";
