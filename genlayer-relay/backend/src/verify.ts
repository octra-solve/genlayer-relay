import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";

// ----------------- MODELS -----------------
interface VerifyPayload {
  message: string;
  signature: string;
  secret: string;
}

// ----------------- PLUGIN -----------------
export const verifyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/", async (request, reply) => {
    const { message, signature, secret } = request.body as VerifyPayload;

    if (!message || !signature || !secret) {
      reply.code(400);
      return { error: "Missing message, signature, or secret" };
    }

    try {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(message)
        .digest("hex");

      const valid = crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
      );

      return {
        status: "ok",
        valid,
        message,
      };
    } catch (err: any) {
      reply.code(500);
      return { error: err.message };
    }
  });
};
