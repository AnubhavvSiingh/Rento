// API server entrypoint that starts the app and Kafka producer.
import { createApp } from "./app.js";
import { disconnectDatabase } from "./database/prisma.js";
import { startKafkaProducer, stopKafkaProducer } from "./kafka/kafkaClient.js";

void startKafkaProducer().catch((error) => {
  console.warn("Kafka producer not started:", error);
});

const app = createApp();
const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

async function shutdown() {
  await stopKafkaProducer();
  await disconnectDatabase();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
