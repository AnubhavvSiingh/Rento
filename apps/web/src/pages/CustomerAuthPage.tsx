import type { FormEvent } from "react";
import type { Product } from "../api";

export type CustomerAuthMode = "signup" | "signin";

export function CustomerAuthPage({
  mode,
  product,
  onModeChange,
  onSubmit
}: {
  mode: CustomerAuthMode;
  product: Product | null;
  onModeChange: (mode: CustomerAuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
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
        <form className="stack-form" onSubmit={onSubmit}>
          {mode === "signup" && (
            <input name="fullName" type="text" placeholder="Full name" required />
          )}
          <input name="email" type="email" placeholder="Email ID" required />
          {mode === "signup" && (
            <input name="phone" type="tel" placeholder="Phone number" required />
          )}
          <input name="password" type="password" placeholder="Password" minLength={6} required />
          <button type="submit" className="primary-button">
            {mode === "signup" ? "Create customer account" : "Sign in"}
          </button>
        </form>
      </article>
    </main>
  );
}
