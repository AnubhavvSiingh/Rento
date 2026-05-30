// Integration tests for API middleware and routing behavior.
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("API integration", () => {
  const app = createApp();

  it("returns 404 for unknown routes", async () => {
    const response = await request(app).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Route not found: GET /does-not-exist" });
  });

  it("requires advertiser status email", async () => {
    const response = await request(app).get("/api/auth/advertiser-status");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Email is required." });
  });

  it("rejects weak customer passwords", async () => {
    const response = await request(app)
      .post("/api/customers/register")
      .send({
        fullName: "Test",
        email: "test@example.com",
        phone: "9999999999",
        password: "123"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Password must be at least 6 characters." });
  });

  it("blocks WAF flagged payloads", async () => {
    const response = await request(app).get(
      "/api/auth/advertiser-status?email=<script>alert(1)</script>"
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Request blocked by security policy." });
  });
});
