import type { FormEvent } from "react";
import type { Product } from "../api";
import { LoadingButton, PremiumAlert, type FeedbackTone } from "../components/feedback";

export type CustomerAuthMode = "signup" | "signin";

export function CustomerAuthPage({
  mode,
  product,
  onModeChange,
  onSubmit,
  statusMessage,
  statusTone,
  isSubmitting
}: {
  mode: CustomerAuthMode;
  product: Product | null;
  onModeChange: (mode: CustomerAuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  statusMessage: string;
  statusTone: FeedbackTone;
  isSubmitting: boolean;
}) {
  return (
    <main className="page-shell narrow-page">
      <section className="section-header">
        <div>
          <p className="eyebrow">Customer Access</p>
          <h2>{product ? `Continue booking ${product.name}` : "Enter your customer dashboard"}</h2>
          <p className="section-text">
            Sign up once with your details. After that, sign in directly with email and password.
          </p>
        </div>
      </section>

      <article className="auth-card">
        <div className="tab-row">
          <button
            type="button"
            className={mode === "signup" ? "filter-chip active" : "filter-chip"}
            onClick={() => onModeChange("signup")}
          >
            Sign up
          </button>
          <button
            type="button"
            className={mode === "signin" ? "filter-chip active" : "filter-chip"}
            onClick={() => onModeChange("signin")}
          >
            Sign in
          </button>
        </div>
        <PremiumAlert
          message={statusMessage}
          tone={isSubmitting ? "loading" : statusTone}
          isBusy={isSubmitting}
        />
        <form className="stack-form" onSubmit={onSubmit}>
          {mode === "signup" && (
            <input name="fullName" type="text" placeholder="Full name" required />
          )}
          <input name="email" type="email" placeholder="Email ID" required />
          {mode === "signup" && (
            <input name="phone" type="tel" placeholder="Phone number" required />
          )}
          <input name="password" type="password" placeholder="Password" minLength={6} required />
          <LoadingButton
            type="submit"
            isLoading={isSubmitting}
            loadingLabel={mode === "signup" ? "Creating account..." : "Signing in..."}
          >
            {mode === "signup" ? "Create customer account" : "Sign in"}
          </LoadingButton>
        </form>
      </article>
    </main>
  );
}
