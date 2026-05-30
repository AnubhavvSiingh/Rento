// Public routes for status, health, overview, and catalog endpoints.
import type { Express } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getBackendStatus, renderStatusPage } from "../services/backendStatusService.js";
import { checkHealth, getOverview, listProducts } from "../services/rentoService.js";

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
}
