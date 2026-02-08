import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";

// ----------------- MODELS -----------------
interface SignPayload {
  message: string;
  secret: string;
}

// ----------------- PLUGIN -----------------
export const signRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/", async (request, reply) => {
    const { message, secret } = request.body as SignPayload;

    if (!message || !secret) {
      reply.code(400);
      return { error: "Missing message or secret" };
    }

    try {
      const signature = crypto
        .createHmac("sha256", secret)
        .update(message)
        .digest("hex");

      return {
        status: "ok",
        message,
        signature,
      };
    } catch (err: any) {
      reply.code(500);
      return { error: err.message };
    }
  });
};
