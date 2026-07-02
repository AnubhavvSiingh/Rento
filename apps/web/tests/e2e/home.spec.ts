import { expect, test, type Page } from "@playwright/test";

const overview = {
  brand: "Rento",
  positioning: "A premium rental marketplace.",
  audiences: ["City movers"],
  stats: {
    listedProducts: 1,
    activeHosts: 1,
    cities: 1,
    averageSavingsPercent: 61,
    pendingQaListings: 0,
    verifiedHosts: 1,
    activePromos: 0
  }
};

const products = [
  {
    id: "prd-1",
    name: "Camera kit",
    city: "Delhi",
    category: "Electronics",
    dailyRate: 800,
    deposit: 3000,
    description: "A clean camera kit",
    status: "APPROVED",
    images: ["https://example.com/camera.jpg"],
    qaStatus: "APPROVED",
    leadTimeDays: 2,
    bufferDays: 1,
    minPhotoCount: 3,
    hostVerified: true,
    damageReports: 0,
    averageRating: 4.6,
    reviewCount: 12,
    tags: ["camera", "creator"],
    pricingRulesCount: 0,
    availabilityBlocks: [],
    pricingRules: []
  }
];

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS"
};

async function mockApi(page: Page) {
  await page.route(/\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (url.pathname === "/api/overview") {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify(overview)
      });
      return;
    }

    if (url.pathname === "/api/products") {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify(products)
      });
      return;
    }

    if (url.pathname === "/api/analytics") {
      await route.fulfill({
        status: 201,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({ message: "Event recorded." })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: "application/json",
      body: JSON.stringify({})
    });
  });
}

test("home page renders hero content", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Rent beautifully. Live lightly. Earn from what you already own."
    })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore Rento" })).toBeVisible();
});

test("explore page shows approved listing count", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: /Explore rentals that feel curated, useful, and ready for real life\./i
    })
  ).toBeVisible();
  await expect(page.getByText("1 approved listings ready to rent")).toBeVisible();
});
