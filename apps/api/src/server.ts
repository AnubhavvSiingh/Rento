import { config as loadEnv } from "dotenv";
import cors from "cors";
import express from "express";
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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost:517\d$/.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by Rento CORS."));
    },
    credentials: true
  })
);
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
