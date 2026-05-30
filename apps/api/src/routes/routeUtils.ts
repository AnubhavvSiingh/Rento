// Shared route helpers for parameter parsing.
import { ApiError } from "../middleware/errorHandler.js";

export function routeParam(value: string | string[] | undefined) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  throw new ApiError(400, "A valid route parameter is required.");
}
