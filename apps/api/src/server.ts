import { config as loadEnv } from "dotenv";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { disconnectDatabase } from "./database/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { registerApiRoutes } from "./routes/apiRoutes.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDirectory, "../.env") });

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigins = readAllowedOrigins();

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((candidate) => candidate.test(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by Rento CORS."));
    },
    credentials: true
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);
app.use(compression());
app.use(express.json());
app.use(requestLogger);
app.use(rateLimit());

registerApiRoutes(app);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

process.on("SIGINT", disconnectDatabase);
process.on("SIGTERM", disconnectDatabase);

function readAllowedOrigins() {
  const envOrigins = process.env.CORS_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (envOrigins && envOrigins.length > 0) {
    return envOrigins.map((origin) => new RegExp(`^${escapeRegex(origin)}$`));
  }

  return [
    /^http:\/\/localhost:517\d$/,
    /^http:\/\/127\.0\.0\.1:517\d$/
  ];
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
