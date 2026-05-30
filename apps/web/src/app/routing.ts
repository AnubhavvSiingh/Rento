// Hash routing helpers for top-level navigation and admin routes.
import type { AdminView, Route } from "./types";

export function getRouteFromHash(): Route {
  const value = window.location.hash.replace("#", "");
  if (
    value === "explore" ||
    value === "customer-auth" ||
    value === "customer-shipping" ||
    value === "customer-confirmation" ||
    value === "customer-dashboard" ||
    value === "advertiser" ||
    value === "admin" ||
    value === "admin-inventory" ||
    value === "admin-delivery" ||
    value === "admin-analytics" ||
    value === "admin-marketing"
  ) {
    return value;
  }

  return "home";
}

export function isAdminRoute(route: Route) {
  return route.startsWith("admin");
}

export function getAdminView(route: Route): AdminView {
  if (route === "admin-inventory") {
    return "inventory";
  }
  if (route === "admin-delivery") {
    return "delivery";
  }
  if (route === "admin-analytics") {
    return "analytics";
  }
  if (route === "admin-marketing") {
    return "marketing";
  }
  return "overview";
}

export function getAdminRoute(view: AdminView): Route {
  const routes: Record<AdminView, Route> = {
    overview: "admin",
    inventory: "admin-inventory",
    delivery: "admin-delivery",
    analytics: "admin-analytics",
    marketing: "admin-marketing"
  };

  return routes[view];
}
