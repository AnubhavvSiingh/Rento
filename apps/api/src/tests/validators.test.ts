// Validator unit tests for request schema helpers.
import { describe, expect, it } from "vitest";
import {
  assertBooking,
  assertCustomerRegister,
  assertListingStatus,
  assertProduct
} from "../validators/schemas.js";

describe("validators", () => {
  it("normalizes customer registration payload", () => {
    expect(
      assertCustomerRegister({
        fullName: "Test Customer",
        email: "TEST@example.com",
        phone: "9999999999",
        password: "secret1"
      })
    ).toEqual({
      fullName: "Test Customer",
      email: "test@example.com",
      phone: "9999999999",
      password: "secret1"
    });
  });

  it("accepts valid product payloads", () => {
    expect(
      assertProduct({
        name: "Camera kit",
        category: "Electronics",
        city: "Delhi",
        dailyRate: 800,
        deposit: 3000,
        description: "A clean camera kit",
        tags: "camera, creator",
        imageUrls: "https://example.com/camera.jpg"
      }).category
    ).toBe("Electronics");
  });

  it("accepts approved listing status", () => {
    expect(assertListingStatus({ status: "APPROVED" })).toBe("APPROVED");
  });

  it("builds booking payloads", () => {
    const booking = assertBooking({
      productId: "prd-1",
      addressLine1: "Line 1",
      city: "Delhi",
      state: "Delhi",
      postalCode: "110001",
      shipmentDate: "2026-05-10",
      rentalStartDate: "2026-05-11",
      rentalEndDate: "2026-05-14",
      paymentMethod: "UPI"
    });

    expect(booking.productId).toBe("prd-1");
    expect(booking.payment.method).toBe("UPI");
  });

  it("rejects invalid booking dates", () => {
    expect(() =>
      assertBooking({
        productId: "prd-2",
        addressLine1: "Line 1",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        shipmentDate: "2026-05-12",
        rentalStartDate: "2026-05-11",
        rentalEndDate: "2026-05-10",
        paymentMethod: "UPI"
      })
    ).toThrow(/rentalEndDate must be/);
  });
});
