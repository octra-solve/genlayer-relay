import { FastifyPluginAsync } from "fastify";
import axios from "axios";

// ----------------- SUPPORTED COINS -----------------
const SUPPORTED_COINS = [
  "ethereum", "bitcoin", "solana", "polygon", "avalanche",
  "chainlink", "uniswap", "aave", "optimism", "arbitrum",
  "near", "cosmos", "polkadot", "tron", "litecoin",
  "stellar", "monero", "filecoin", "aptos", "sui",
];

// ----------------- COINGECKO -----------------
const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

// ----------------- PLUGIN -----------------
export const pricesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /prices?vs=usd
  fastify.get("/", async (req, reply) => {
    const vs = (req.query as any)?.vs || "usd";

    try {
      const response = await axios.get(COINGECKO_URL, {
        params: {
          ids: SUPPORTED_COINS.join(","),
          vs_currencies: vs,
        },
        timeout: 10000,
      });

      return {
        status: "ok",
        source: "coingecko",
        data: response.data,
        timestamp: Math.floor(Date.now() / 1000),
      };
    } catch (err: any) {
      reply.code(500);
      return { status: "error", message: err.message };
    }
  });
};
