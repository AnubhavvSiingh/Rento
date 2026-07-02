// Public routes for status, health, overview, and catalog endpoints.
import type { Express } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getBackendStatus, renderStatusPage } from "../services/backendStatusService.js";
import { checkHealth, getOverview, listProducts, searchMarketplaceCatalog } from "../services/rentoService.js";

export function registerPublicRoutes(app: Express) {
  app.get(
    "/",
    asyncHandler(async (_req, res) => {
      const status = await getBackendStatus();
      res.type("html").send(renderStatusPage(status));
    })
  );

  app.get(
    "/api/status",
    asyncHandler(async (_req, res) => {
      res.json(await getBackendStatus());
    })
  );

  app.get(
    "/health",
    asyncHandler(async (_req, res) => {
      res.json(await checkHealth());
    })
  );

  app.get(
    "/api/overview",
    asyncHandler(async (_req, res) => {
      res.json(await getOverview());
    })
  );

  app.get(
    "/api/products",
    asyncHandler(async (_req, res) => {
      res.json(await listProducts());
    })
  );

  app.get(
    "/api/products/search",
    asyncHandler(async (req, res) => {
      const query = typeof req.query.q === "string" ? req.query.q : "";
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const city = typeof req.query.city === "string" ? req.query.city : undefined;
      const sort =
        req.query.sort === "price-low" || req.query.sort === "price-high"
          ? req.query.sort
          : "recommended";
      const maxPrice =
        typeof req.query.maxPrice === "string" && req.query.maxPrice.length > 0
          ? Number(req.query.maxPrice)
          : undefined;

      res.json(
        await searchMarketplaceCatalog({
          query,
          category,
          city,
          sort,
          maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined
        })
      );
    })
  );
}
