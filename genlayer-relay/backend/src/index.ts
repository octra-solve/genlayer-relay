import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "dotenv";
import { z } from "zod";

// ----------------- LOAD ENV -----------------
const result = config({ path: __dirname + "/../.env" });
if (result.error) {
  console.error("❌ Failed to load .env file:", result.error);
  process.exit(1);
}

// ----------------- VALIDATE ENV -----------------
const envSchema = z.object({
  WEATHER_API_KEY: z.string().min(1, "WEATHER_API_KEY is required"),
  PORT: z.string().optional(),
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error("❌ Invalid environment variables:", envParse.error.format());
  process.exit(1);
}

const ENV = envParse.data;

// ----------------- IMPORT ROUTES -----------------
import { pricesRoutes } from "./prices";
import { weatherRoutes } from "./weather";
import { randomnessRoutes } from "./randomness";
import { verifyRoutes } from "./verify";
import { signRoutes } from "./sign";

// ----------------- START SERVER -----------------
async function start() {
  const app = Fastify({ logger: true });

  // ----------------- CORS -----------------
  await app.register(cors, { origin: "*", credentials: true });

  // ----------------- REGISTER ROUTES -----------------
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

  const PORT = Number(ENV.PORT || 3000);

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 GenLayer Relay running at http://0.0.0.0:${PORT}`);
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start().catch((err) => {
  console.error("❌ Failed to start app:", err);
  process.exit(1);
});
