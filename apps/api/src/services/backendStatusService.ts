import {
  checkHealth,
  getAdminDashboard,
  getAdvertiserStatus,
  getOverview,
  listProducts
} from "./rentoService.js";

type ServiceStatus = "UP" | "DOWN" | "PROTECTED";

type StatusCheck = {
  name: string;
  status: Exclude<ServiceStatus, "PROTECTED">;
  message: string;
};

type PageBackendStatus = {
  page: string;
  status: ServiceStatus;
  note: string;
  endpoints: string[];
};

export type BackendStatus = {
  service: string;
  generatedAt: string;
  backend: {
    status: "UP";
    port: number;
  };
  database: StatusCheck;
  checks: {
    overview: StatusCheck;
    products: StatusCheck;
    admin: StatusCheck;
    advertiser: StatusCheck;
  };
  pages: PageBackendStatus[];
};

export async function getBackendStatus(): Promise<BackendStatus> {
  const database = await runStatusCheck("Database", () => checkHealth());
  const overview = await runStatusCheck("Overview", () => getOverview());
  const products = await runStatusCheck("Products", () => listProducts());
  const admin = await runStatusCheck("Admin dashboard", () => getAdminDashboard());
  const advertiser = await runStatusCheck("Advertiser status", () =>
    getAdvertiserStatus("shaadi@rento.local")
  );

  const publicCatalogUp = overview.status === "UP" && products.status === "UP";
  const databaseUp = database.status === "UP";

  return {
    service: "Rento API",
    generatedAt: new Date().toISOString(),
    backend: {
      status: "UP",
      port: Number(process.env.PORT) || 4000
    },
    database,
    checks: {
      overview,
      products,
      admin,
      advertiser
    },
    pages: [
      {
        page: "Home / Explore",
        status: publicCatalogUp ? "UP" : "DOWN",
        note: publicCatalogUp
          ? "Overview and approved product catalog are loading from the database."
          : "Overview or product catalog check failed.",
        endpoints: ["GET /api/overview", "GET /api/products"]
      },
      {
        page: "Admin portal",
        status: admin.status,
        note:
          admin.status === "UP"
            ? "Admin dashboard data is available. Login and protected admin routes are registered."
            : admin.message,
        endpoints: [
          "POST /api/auth/login",
          "GET /api/auth/me",
          "GET /api/admin/dashboard",
          "PATCH /api/admin/users/:userId/access",
          "PATCH /api/admin/products/:productId/status",
          "PATCH /api/admin/products/:productId/qa"
        ]
      },
      {
        page: "Advertiser portal",
        status: advertiser.status,
        note:
          advertiser.status === "UP"
            ? "Advertiser status is available. Host dashboard and listing routes require advertiser login."
            : advertiser.message,
        endpoints: [
          "POST /api/auth/register-advertiser",
          "GET /api/auth/advertiser-status",
          "GET /api/host-dashboard",
          "POST /api/advertiser/products",
          "POST /api/advertiser/availability",
          "POST /api/advertiser/pricing"
        ]
      },
      {
        page: "Customer login / dashboard",
        status: databaseUp ? "PROTECTED" : "DOWN",
        note: databaseUp
          ? "Customer routes are registered and require a customer session."
          : database.message,
        endpoints: [
          "POST /api/customers/register",
          "POST /api/customers/login",
          "GET /api/customers/me",
          "GET /api/customers/dashboard"
        ]
      },
      {
        page: "Checkout / bookings",
        status: publicCatalogUp && databaseUp ? "PROTECTED" : "DOWN",
        note:
          publicCatalogUp && databaseUp
            ? "Booking and review routes are registered and require a customer session."
            : "Catalog or database check failed.",
        endpoints: ["POST /api/bookings", "POST /api/bookings/:bookingId/review"]
      },
      {
        page: "Admin delivery / marketing",
        status: admin.status,
        note:
          admin.status === "UP"
            ? "Delivery, content, promo, referral, and return scheduling routes are available behind admin login."
            : admin.message,
        endpoints: [
          "PATCH /api/admin/bookings/:bookingId/status",
          "PATCH /api/admin/bookings/:bookingId/return-schedule",
          "POST /api/admin/content",
          "PATCH /api/admin/content/:contentId",
          "POST /api/admin/promos",
          "POST /api/admin/referrals"
        ]
      },
      {
        page: "Analytics",
        status: databaseUp ? "UP" : "DOWN",
        note: databaseUp
          ? "Analytics event ingestion route is registered."
          : database.message,
        endpoints: ["POST /api/analytics"]
      }
    ]
  };
}

export function renderStatusPage(status: BackendStatus) {
  const rows = status.pages
    .map(
      (page) => `
        <tr>
          <td>
            <strong>${escapeHtml(page.page)}</strong>
            <small>${escapeHtml(page.note)}</small>
          </td>
          <td><span class="pill ${page.status.toLowerCase()}">${page.status}</span></td>
          <td>${page.endpoints.map((endpoint) => `<code>${escapeHtml(endpoint)}</code>`).join("")}</td>
        </tr>`
    )
    .join("");

  const publicCatalogStatus =
    status.checks.overview.status === "UP" && status.checks.products.status === "UP"
      ? "UP"
      : "DOWN";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rento API Status</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #050912;
        color: #eff6ff;
      }
      body {
        margin: 0;
        padding: 32px;
        background: radial-gradient(circle at top left, rgba(84, 214, 205, 0.22), transparent 32rem), #050912;
      }
      main {
        max-width: 1120px;
        margin: 0 auto;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(2rem, 4vw, 4rem);
      }
      p {
        color: #b8c4d6;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin: 28px 0;
      }
      .card {
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 8px;
        padding: 18px;
        background: rgba(15, 23, 42, 0.78);
      }
      .card span {
        display: block;
        color: #93a4b8;
        margin-bottom: 8px;
      }
      .card strong {
        font-size: 1.4rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.82);
      }
      th, td {
        padding: 16px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        text-align: left;
        vertical-align: top;
      }
      th {
        color: #9ee7e2;
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      small {
        display: block;
        margin-top: 6px;
        color: #a8b6c8;
        line-height: 1.5;
      }
      code {
        display: inline-block;
        margin: 0 6px 6px 0;
        padding: 5px 7px;
        border-radius: 6px;
        background: rgba(2, 6, 23, 0.7);
        color: #d7e3f2;
        font-size: 0.82rem;
      }
      .pill {
        display: inline-flex;
        min-width: 82px;
        justify-content: center;
        border-radius: 999px;
        padding: 6px 10px;
        font-weight: 800;
        font-size: 0.76rem;
      }
      .up {
        background: rgba(34, 197, 94, 0.16);
        color: #86efac;
      }
      .down {
        background: rgba(248, 113, 113, 0.16);
        color: #fca5a5;
      }
      .protected {
        background: rgba(56, 189, 248, 0.16);
        color: #7dd3fc;
      }
      a {
        color: #67e8f9;
      }
    </style>
  </head>
  <body>
    <main>
      <p>Rento backend status</p>
      <h1>API and database health</h1>
      <p>Generated at ${escapeHtml(status.generatedAt)}. JSON is available at <a href="/api/status">/api/status</a>.</p>
      <section class="summary">
        <article class="card">
          <span>Backend</span>
          <strong>${status.backend.status} on port ${status.backend.port}</strong>
        </article>
        <article class="card">
          <span>Database</span>
          <strong>${status.database.status}</strong>
          <small>${escapeHtml(status.database.message)}</small>
        </article>
        <article class="card">
          <span>Public catalog</span>
          <strong>${publicCatalogStatus}</strong>
        </article>
      </section>
      <table>
        <thead>
          <tr>
            <th>App Area</th>
            <th>Status</th>
            <th>Backend Routes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </main>
  </body>
</html>`;
}

async function runStatusCheck(name: string, check: () => Promise<unknown>): Promise<StatusCheck> {
  try {
    await check();
    return {
      name,
      status: "UP",
      message: "Working"
    };
  } catch (error) {
    return {
      name,
      status: "DOWN",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
