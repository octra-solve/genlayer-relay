import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";

// ----------------- PLUGIN -----------------
export const randomnessRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async () => {
    // Maximum safe random value for crypto.randomInt
    const MAX_SAFE = 2n ** 48n - 1n;

    // Generate a random number up to MAX_SAFE
    const random = crypto.randomInt(0, Number(MAX_SAFE));

    // Generate entropy
    const entropy = crypto
      .createHash("sha256")
      .update(random.toString() + Date.now().toString())
      .digest("hex");

    return {
      status: "ok",
      random: random.toString(), // as string to be safe
      entropy,
      timestamp: Math.floor(Date.now() / 1000),
    };
  });
};
