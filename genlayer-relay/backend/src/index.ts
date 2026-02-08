// genlayer-relay/backend/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "dotenv";
import { z } from "zod";

import { pricesRoutes } from "./prices";
import { weatherRoutes } from "./weather";
import { randomnessRoutes } from "./randomness";
import { verifyRoutes } from "./verify";
import { signRoutes } from "./sign";

// ----------------- LOAD ENV -----------------
config(); // loads .env into process.env

// ----------------- VALIDATE ENV -----------------
const envSchema = z.object({
  WEATHER_API_KEY: z.string().min(1, "WEATHER_API_KEY is required"),
  PORT: z.string().optional(),
});
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error("❌ Invalid environment variables:", env.error.format());
  process.exit(1);
}

// ----------------- APP -----------------
async function start() {
  const app = Fastify({ logger: true });

  // ----------------- CORS -----------------
  await app.register(cors, {
    origin: "*", // Allow all origins for dev, restrict in prod
    credentials: true,
  });

  // ----------------- ROUTES -----------------
  app.register(pricesRoutes, { prefix: "/prices" });
  app.register(weatherRoutes, { prefix: "/weather" });
  app.register(randomnessRoutes, { prefix: "/random" });
  app.register(verifyRoutes, { prefix: "/verify" });
  app.register(signRoutes, { prefix: "/sign" });

  // ----------------- ROOT -----------------
  app.get("/", async () => ({
    status: "ok",
    message: "GenLayer Relay Backend is live",
  }));

  // ----------------- START SERVER -----------------
  const PORT = Number(process.env.PORT || 3000);
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 GenLayer Relay running at http://0.0.0.0:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// ----------------- START APP -----------------
start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
