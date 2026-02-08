import Fastify from "fastify";
import cors from "@fastify/cors";
import { pricesRoutes } from "./prices";
import { weatherRoutes } from "./weather";
import { randomnessRoutes } from "./randomness";
import { verifyRoutes } from "./verify";
import { signRoutes } from "./sign";

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: "*",
    credentials: true,
  });

  app.register(pricesRoutes, { prefix: "/prices" });
  app.register(weatherRoutes, { prefix: "/weather" });
  app.register(randomnessRoutes, { prefix: "/random" });
  app.register(verifyRoutes, { prefix: "/verify" });
  app.register(signRoutes, { prefix: "/sign" });

  app.get("/", async () => ({
    status: "ok",
    message: "GenLayer Relay Backend is live",
  }));

  const PORT = Number(process.env.PORT) || 3000;
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`🚀 GenLayer Relay running at http://0.0.0.0:${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
