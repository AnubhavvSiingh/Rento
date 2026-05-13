import assert from "node:assert/strict";
import {
  assertBooking,
  assertCustomerRegister,
  assertListingStatus,
  assertProduct
} from "../validators/schemas.js";

assert.deepEqual(
  assertCustomerRegister({
    fullName: "Test Customer",
    email: "TEST@example.com",
    phone: "9999999999",
    password: "secret1"
  }),
  {
    fullName: "Test Customer",
    email: "test@example.com",
    phone: "9999999999",
    password: "secret1"
  }
);

assert.equal(
  assertProduct({
    name: "Camera kit",
    category: "Electronics",
    city: "Delhi",
    dailyRate: 800,
    deposit: 3000,
    description: "A clean camera kit",
    tags: "camera, creator",
    imageUrls: "https://example.com/camera.jpg"
  }).category,
  "Electronics"
);

assert.equal(assertListingStatus({ status: "APPROVED" }), "APPROVED");

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

assert.equal(booking.productId, "prd-1");
assert.equal(booking.payment.method, "UPI");

console.info("Validator tests passed.");
