// Kafka producer/consumer setup used by server and worker.
import { Kafka, logLevel, type Consumer, type Producer } from "kafkajs";

const brokerList = process.env.KAFKA_BROKERS?.split(",")
  .map((item) => item.trim())
  .filter(Boolean) ?? [];
const kafkaEnabled = brokerList.length > 0;
const clientId = process.env.KAFKA_CLIENT_ID ?? "rento-api";

const kafka = kafkaEnabled
  ? new Kafka({
      clientId,
      brokers: brokerList,
      logLevel: logLevel.NOTHING
    })
  : null;

let producer: Producer | null = null;
let producerConnected = false;

export function isKafkaEnabled() {
  return kafkaEnabled;
}

export async function startKafkaProducer() {
  if (!kafka) {
    return;
  }

  if (!producer) {
    producer = kafka.producer();
  }

  if (!producerConnected) {
    await producer.connect();
    producerConnected = true;
  }
}

export async function stopKafkaProducer() {
  if (producer && producerConnected) {
    await producer.disconnect();
    producerConnected = false;
  }
}

export async function publishEvent(topic: string, key: string, payload: unknown) {
  if (!kafka) {
    return;
  }

  await startKafkaProducer();
  await producer?.send({
    topic,
    messages: [{ key, value: JSON.stringify(payload) }]
  });
}

export function createConsumer(groupId: string): Consumer {
  if (!kafka) {
    throw new Error("Kafka is not configured.");
  }

  return kafka.consumer({ groupId });
}
