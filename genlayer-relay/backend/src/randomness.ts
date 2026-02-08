import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";

// ----------------- PLUGIN -----------------
export const randomnessRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /random
  fastify.get("/", async () => {
    // Use a safe max for crypto.randomInt
   const MAX_SAFE_RANDOM = 2n ** 48n - 1n; // 281474976710655
   const random = Number(crypto.randomInt(0, Number(MAX_SAFE_RANDOM)));

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
