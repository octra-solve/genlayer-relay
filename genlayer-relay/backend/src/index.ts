import Fastify from "fastify";
import cors from "@fastify/cors";
import { pricesRoutes } from "./prices";
import { weatherRoutes } from "./weather";
import { randomnessRoutes } from "./randomness";
import { verifyRoutes } from "./verify";
import { signRoutes } from "./sign";

// ----------------- APP -----------------
const app = Fastify({ logger: true });

// ----------------- CORS -----------------
await app.register(cors, {
  origin: "*", // Allow all for development; restrict later if needed
  credentials: true,
});

// ----------------- REGISTER MODULE ROUTES -----------------
app.register(pricesRoutes, { prefix: "/prices" });
app.register(weatherRoutes, { prefix: "/weather" });
app.register(randomnessRoutes, { prefix: "/random" });
app.register(verifyRoutes, { prefix: "/verify" });
app.register(signRoutes, { prefix: "/sign" });

// ----------------- ROOT -----------------
app.get("/", async () => {
  return { status: "ok", message: "GenLayer Relay Backend is live" };
});

// ----------------- SERVER -----------------
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

app.listen({ port: PORT, host: HOST })
  .then(() => {
    console.log(`🚀 GenLayer Relay running at http://${HOST}:${PORT}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
