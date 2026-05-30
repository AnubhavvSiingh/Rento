// Unit tests for feedback UI components.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingButton, PremiumAlert } from "../components/feedback";

describe("PremiumAlert", () => {
  it("renders message and detail with alert role", () => {
    render(
      <PremiumAlert
        message="Account locked"
        detail="Try again in 10 minutes."
        tone="error"
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Account locked");
    expect(alert).toHaveTextContent("Try again in 10 minutes.");
  });
});

describe("LoadingButton", () => {
  it("shows loading state and disables interaction", () => {
    render(
      <LoadingButton isLoading loadingLabel="Saving...">
        Save
      </LoadingButton>
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Saving...");
  });
});
