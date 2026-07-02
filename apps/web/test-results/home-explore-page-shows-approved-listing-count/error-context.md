# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home.spec.ts >> explore page shows approved listing count
- Location: tests\e2e\home.spec.ts:111:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('1 approved listings ready to rent')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('1 approved listings ready to rent')

```

```yaml
- banner:
  - button "Rento"
  - navigation "Primary navigation":
    - button "Explore"
    - button "Advertiser"
    - button "Customer Login"
    - button "Admin access": Are you Admin
    - button "Switch to dark mode": Dark mode
- main:
  - paragraph: Customer Landing Page
  - heading "Explore rentals that feel curated, useful, and ready for real life." [level=2]
  - paragraph: Browse approved listings, compare deposits, book dates, and track delivery.
  - text: 0 approved listings ready to rent
  - article:
    - paragraph: Explore better
    - heading "Find apparel, furniture, appliances, and creator gear with a smoother discovery flow." [level=3]
    - paragraph: Customers come to Rento for stylish ceremony outfits, flexible home setups, and short-term essentials. Better visuals, clearer categories, and cleaner browsing help more people stay, compare, and place rentals.
    - text: 01 Search across categories 02 Review deposits before checkout 03 Track every shipment after booking
  - article:
    - img "Browse rentals like a premium marketplace"
    - paragraph: Premium motion
    - heading "Browse rentals like a premium marketplace" [level=3]
    - paragraph: A calm discovery experience, expressive visuals, and fast filtering make customers stay longer and convert better.
  - region "Search and filters":
    - text: Search the collection
    - searchbox "Search the collection"
    - button "Category":
      - text: Category
      - strong: All categories
      - text: Curated rentals across every collection
    - button "City":
      - text: City
      - strong: All cities
      - text: Show every available delivery city
    - text: Max daily rent
    - strong: No limit
    - slider "Max daily rent No limit": "951"
    - button "Sort by":
      - text: Sort by
      - strong: Curated first
      - text: Balanced by quality, trust, and match
  - article:
    - img "Browse by moment, not only category"
    - text: Ceremony
    - heading "Browse by moment, not only category" [level=3]
    - paragraph: From wedding mornings to furnished move-ins, every listing is organized around why people rent in real life.
  - article:
    - img "Premium shots make browsing feel effortless"
    - text: Fashion
    - heading "Premium shots make browsing feel effortless" [level=3]
    - paragraph: A more editorial product view helps customers imagine the rental before they even open checkout.
  - article:
    - img "Fast-moving homes need short-term setup"
    - text: Furniture
    - heading "Fast-moving homes need short-term setup" [level=3]
    - paragraph: Beds, workstations, appliances, and sofas can be rented city by city with less upfront cost.
  - article:
    - heading "No approved listing matched" [level=3]
    - paragraph: Try a wider city, category, or price range.
  - article:
    - img "Wedding and ceremony wear"
    - text: Ceremony
    - heading "Wedding and ceremony wear" [level=3]
    - paragraph: Lehengas, gowns, sherwanis, and premium styling accessories for one-time moments.
  - article:
    - img "Ready-to-live furniture"
    - text: Furniture
    - heading "Ready-to-live furniture" [level=3]
    - paragraph: Sofas, dining sets, beds, and desks for relocations, rentals, and flexible homes.
- contentinfo:
  - paragraph: All rights reserved. Copyright reserved with Rento. No unauthorized copyright use is allowed.
```

# Test source

```ts
  21  |     name: "Camera kit",
  22  |     city: "Delhi",
  23  |     category: "Electronics",
  24  |     dailyRate: 800,
  25  |     deposit: 3000,
  26  |     description: "A clean camera kit",
  27  |     status: "APPROVED",
  28  |     images: ["https://example.com/camera.jpg"],
  29  |     qaStatus: "APPROVED",
  30  |     leadTimeDays: 2,
  31  |     bufferDays: 1,
  32  |     minPhotoCount: 3,
  33  |     hostVerified: true,
  34  |     damageReports: 0,
  35  |     averageRating: 4.6,
  36  |     reviewCount: 12,
  37  |     tags: ["camera", "creator"],
  38  |     pricingRulesCount: 0,
  39  |     availabilityBlocks: [],
  40  |     pricingRules: []
  41  |   }
  42  | ];
  43  | 
  44  | const corsHeaders = {
  45  |   "access-control-allow-origin": "*",
  46  |   "access-control-allow-headers": "content-type, authorization",
  47  |   "access-control-allow-methods": "GET,POST,PATCH,OPTIONS"
  48  | };
  49  | 
  50  | async function mockApi(page: Page) {
  51  |   await page.route(/\/api\//, async (route) => {
  52  |     const request = route.request();
  53  |     const url = new URL(request.url());
  54  | 
  55  |     if (request.method() === "OPTIONS") {
  56  |       await route.fulfill({ status: 204, headers: corsHeaders });
  57  |       return;
  58  |     }
  59  | 
  60  |     if (url.pathname === "/api/overview") {
  61  |       await route.fulfill({
  62  |         status: 200,
  63  |         headers: corsHeaders,
  64  |         contentType: "application/json",
  65  |         body: JSON.stringify(overview)
  66  |       });
  67  |       return;
  68  |     }
  69  | 
  70  |     if (url.pathname === "/api/products") {
  71  |       await route.fulfill({
  72  |         status: 200,
  73  |         headers: corsHeaders,
  74  |         contentType: "application/json",
  75  |         body: JSON.stringify(products)
  76  |       });
  77  |       return;
  78  |     }
  79  | 
  80  |     if (url.pathname === "/api/analytics") {
  81  |       await route.fulfill({
  82  |         status: 201,
  83  |         headers: corsHeaders,
  84  |         contentType: "application/json",
  85  |         body: JSON.stringify({ message: "Event recorded." })
  86  |       });
  87  |       return;
  88  |     }
  89  | 
  90  |     await route.fulfill({
  91  |       status: 200,
  92  |       headers: corsHeaders,
  93  |       contentType: "application/json",
  94  |       body: JSON.stringify({})
  95  |     });
  96  |   });
  97  | }
  98  | 
  99  | test("home page renders hero content", async ({ page }) => {
  100 |   await mockApi(page);
  101 |   await page.goto("/");
  102 | 
  103 |   await expect(
  104 |     page.getByRole("heading", {
  105 |       name: "Rent beautifully. Live lightly. Earn from what you already own."
  106 |     })
  107 |   ).toBeVisible();
  108 |   await expect(page.getByRole("button", { name: "Explore Rento" })).toBeVisible();
  109 | });
  110 | 
  111 | test("explore page shows approved listing count", async ({ page }) => {
  112 |   await mockApi(page);
  113 |   await page.goto("/");
  114 | 
  115 |   await page.getByRole("button", { name: "Explore", exact: true }).click();
  116 |   await expect(
  117 |     page.getByRole("heading", {
  118 |       name: /Explore rentals that feel curated, useful, and ready for real life\./i
  119 |     })
  120 |   ).toBeVisible();
> 121 |   await expect(page.getByText("1 approved listings ready to rent")).toBeVisible();
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  122 | });
  123 | 
```