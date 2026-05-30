// Local storage helpers for theme selection and analytics session IDs.
import { analyticsSessionKey, themeKey } from "./constants";
import type { ThemeMode } from "./types";

export function readInitialTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(themeKey);
  return savedTheme === "dark" ? "dark" : "light";
}

export function getAnalyticsSessionId() {
  const existing = localStorage.getItem(analyticsSessionKey);
  if (existing) {
    return existing;
  }

  const sessionId = `sess-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(analyticsSessionKey, sessionId);
  return sessionId;
}
