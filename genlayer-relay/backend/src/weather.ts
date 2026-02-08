import { FastifyPluginAsync } from "fastify";
import axios from "axios";
import { config } from "dotenv";

// ----------------- LOAD ENV -----------------
config(); // ensure .env is loaded before reading keys

// ----------------- ENV -----------------
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || "";

// ----------------- CITY CACHE -----------------
const cityCache: Record<string, any> = {}; // cityName -> weatherData

// ----------------- PLUGIN -----------------
export const weatherRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /weather/options -> return cached cities for dropdown
  fastify.get("/options", async (req, reply) => {
    try {
      return {
        status: "ok",
        cities: Object.keys(cityCache), // previously queried cities
      };
    } catch (err: any) {
      reply.code(500);
      return { status: "error", message: err.message || "Failed to load city options" };
    }
  });

  // GET /weather?city=X -> fetch weather
  fastify.get("/", async (req, reply) => {
    const city = ((req.query as any)?.city || "").toLowerCase().trim();

    if (!WEATHER_API_KEY) {
      console.error("❌ WEATHER_API_KEY is missing in .env");
      reply.code(500);
      return { status: "error", message: "Weather API key missing" };
    }

    if (!city) {
      reply.code(400);
      return { status: "error", message: "City query parameter is required" };
    }

    try {
      // ----------------- RETURN CACHED -----------------
      if (cityCache[city]) {
        return {
          status: "ok",
          city,
          data: cityCache[city],
          timestamp: Math.floor(Date.now() / 1000),
        };
      }

      // ----------------- FETCH FROM OPENWEATHER -----------------
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

      // ----------------- SAVE TO CACHE -----------------
      cityCache[city] = response.data;

      return {
        status: "ok",
        city,
        data: response.data,
        timestamp: Math.floor(Date.now() / 1000),
      };

    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message;
      console.error(`❌ OpenWeatherMap API error for city "${city}":`, errMsg);
      reply.code(500);
      return { status: "error", city, message: errMsg };
    }
  });
};
