// Top navigation bar and admin shortcut used by the main App shell.
import type { Route, ThemeMode } from "../app/types";
import { isAdminRoute } from "../app/routing";

export function TopBar({
  route,
  navigate,
  hasCustomer,
  theme,
  onToggleTheme
}: {
  route: Route;
  navigate: (route: Route) => void;
  hasCustomer: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  return (
    <header className="topbar">
      <button type="button" className="brand-link" onClick={() => navigate("home")}>
        Rento
      </button>
      <nav className="topbar-nav" aria-label="Primary navigation">
        <button type="button" className="ghost-button" onClick={() => navigate("explore")}>
          Explore
        </button>
        <button type="button" className="ghost-button" onClick={() => navigate("advertiser")}>
          Advertiser
        </button>
        <button type="button" className="ghost-button" onClick={() => navigate("customer-dashboard")}>
          {hasCustomer ? "My Rentals" : "Customer Login"}
        </button>
        {!isAdminRoute(route) && (
          <button
            type="button"
            className="mini-admin-button"
            onClick={() => navigate("admin")}
            title="Admin access"
            aria-label="Admin access"
          >
            <AdminShieldIcon />
            <span className="sr-only">Are you Admin</span>
          </button>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path
                  d="M17.293 13.293A8 8 0 1110.707 6.707a6.2 6.2 0 106.586 6.586z"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  fill="currentColor"
                  transform="translate(0 -0.9)"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <circle cx="12" cy="12" r="4.5" fill="currentColor" />
                <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="12" y1="2.5" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="21.5" />
                  <line x1="2.5" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="21.5" y2="12" />
                  <line x1="4.8" y1="4.8" x2="6.6" y2="6.6" />
                  <line x1="17.4" y1="17.4" x2="19.2" y2="19.2" />
                  <line x1="4.8" y1="19.2" x2="6.6" y2="17.4" />
                  <line x1="17.4" y1="6.6" x2="19.2" y2="4.8" />
                </g>
              </svg>
            )}
          </span>
          <span className="sr-only">{theme === "dark" ? "Light" : "Dark"} mode</span>
        </button>
      </nav>
    </header>
  );
}

function AdminShieldIcon() {
  return (
    <svg className="admin-shield-icon" viewBox="0 0 64 64" focusable="false" aria-hidden="true">
      <path
        d="M32 5.5 11.8 14.7a4.4 4.4 0 0 0-2.6 4v12.4c0 14.6 9.2 23.8 20.5 28a6.7 6.7 0 0 0 4.6 0c11.3-4.2 20.5-13.4 20.5-28V18.7a4.4 4.4 0 0 0-2.6-4L32 5.5Z"
        fill="currentColor"
      />
      <circle cx="32" cy="26.2" r="8" fill="var(--admin-icon-cutout)" />
      <path
        d="M18.6 46.9c2.7-8.2 8.1-12 13.4-12s10.7 3.8 13.4 12c-3.3 4-7.7 6.6-13.4 6.6s-10.1-2.6-13.4-6.6Z"
        fill="var(--admin-icon-cutout)"
      />
    </svg>
  );
}
