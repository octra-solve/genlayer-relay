import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";

// ----------------- PLUGIN -----------------
export const randomnessRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /random
  fastify.get("/", async () => {
    // Use a safe max for crypto.randomInt
    const MAX_SAFE = Number.MAX_SAFE_INTEGER;
    const random = crypto.randomInt(0, MAX_SAFE);

    const entropy = crypto
      .createHash("sha256")
      .update(random.toString() + Date.now().toString())
      .digest("hex");

    return {
      status: "ok",
      random,
      entropy,
      timestamp: Math.floor(Date.now() / 1000),
    };
  });
};
