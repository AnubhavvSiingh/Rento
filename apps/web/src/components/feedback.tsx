// Feedback UI components used for alerts and loading buttons.
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type FeedbackTone = "info" | "success" | "error" | "loading";

export function PremiumAlert({
  message,
  tone = "info",
  detail,
  isBusy = false
}: {
  message: string;
  tone?: FeedbackTone;
  detail?: string;
  isBusy?: boolean;
}) {
  return (
    <div className={`premium-alert ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="alert-orb" aria-hidden="true">
        {isBusy || tone === "loading" ? <span className="mini-spinner" /> : null}
      </span>
      <span>
        <strong>{message}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
    </div>
  );
}

export function LoadingButton({
  isLoading,
  loadingLabel = "Working...",
  children,
  disabled,
  className = "primary-button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      className={`${className}${isLoading ? " is-loading" : ""}`}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <span className="button-spinner" aria-hidden="true" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
