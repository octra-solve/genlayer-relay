import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "path";
import { config } from "dotenv";
import { z } from "zod";

// ----------------- LOAD ENV -----------------
const result = config({ path: path.join(__dirname, "../.env") });
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

  // ----------------- REGISTER API ROUTES -----------------
  app.register(pricesRoutes, { prefix: "/prices" });
  app.register(weatherRoutes, { prefix: "/weather" });
  app.register(randomnessRoutes, { prefix: "/random" });
  app.register(verifyRoutes, { prefix: "/verify" });
  app.register(signRoutes, { prefix: "/sign" });

  // ----------------- SERVE FRONTEND -----------------
  const frontendBuild = path.join(__dirname, "../../frontend/dist");
  await app.register(fastifyStatic, {
    root: frontendBuild,
    prefix: "/",
  });

  // SPA fallback for React/Vite/CRA routing
  app.setNotFoundHandler((req, reply) => reply.sendFile("index.html"));

  // ----------------- HEALTHCHECK -----------------
  app.get("/health", async () => ({ status: "ok", message: "Backend is live" }));

  // ----------------- START SERVER -----------------
  const PORT = Number(ENV.PORT || 3000);
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 GenLayer Relay Backend running at http://0.0.0.0:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start().catch((err) => {
  console.error("❌ Failed to start backend:", err);
  process.exit(1);
});
