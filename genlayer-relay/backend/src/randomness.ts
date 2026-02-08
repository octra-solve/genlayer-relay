import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";

// ----------------- PLUGIN -----------------
export const randomnessRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /random
  fastify.get("/", async () => {
    // Generate a secure random number
    const random = crypto.randomInt(0, 10 ** 18);
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
