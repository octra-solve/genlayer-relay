import { FastifyPluginAsync } from "fastify";
import axios from "axios";

// ----------------- ENV -----------------
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || "";

// ----------------- PLUGIN -----------------
export const weatherRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /weather?city=London
  fastify.get("/", async (req, reply) => {
    const city = (req.query as any)?.city;

    if (!WEATHER_API_KEY) {
      reply.code(500);
      return { status: "error", message: "Weather API key missing" };
    }

    if (!city) {
      reply.code(400);
      return { status: "error", message: "City query parameter is required" };
    }

    try {
      const response = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        {
          params: {
            q: city,
            appid: WEATHER_API_KEY,
            units: "metric",
          },
          timeout: 10000,
        }
      );

      return {
        status: "ok",
        city,
        data: response.data,
        timestamp: Math.floor(Date.now() / 1000),
      };
    } catch (err: any) {
      reply.code(500);
      return { status: "error", message: err.message };
    }
  });
};
