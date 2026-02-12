import { FastifyPluginAsync } from "fastify";
import { getFX } from "./prices_modules/fx";
import { getCrypto, getCryptoList } from "./prices_modules/crypto";
import { normalizeStablecoin } from "./prices_modules/stables";
import { getStock } from "./prices_modules/stocks";

const now = () => Math.floor(Date.now() / 1000);

export const pricesRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/prices?base=X&quote=Y
  fastify.get("/", async (req, reply) => {
    try {
      const { base, quote } = req.query as { base?: string; quote?: string };

      if (!base) {
        reply.code(400);
        return { status: "error", message: "Missing base asset" };
      }

      const baseNorm = normalizeStablecoin(base);
      const quoteNorm = normalizeStablecoin(quote || "USD");

      const baseUpper = baseNorm.toUpperCase();
      const quoteUpper = quoteNorm.toUpperCase();

      let payload;

      // ---------- FX ----------
      const fxCurrencies = ["USD","EUR","GBP","JPY","AUD","CAD","CHF","CNY","NZD","SEK"];

      if (fxCurrencies.includes(baseUpper)) {
        payload = await getFX(baseUpper, quoteUpper);
      }

      // ---------- CRYPTO ----------
      else {
        const cryptoMap = await getCryptoList();
        const coin = cryptoMap[baseUpper.toLowerCase()];

        if (coin) {
          payload = await getCrypto(coin.id, quoteUpper);
        }

        // ---------- STOCK ----------
        else {
          const apiKey = process.env.FINNHUB_API_KEY;

          if (!apiKey) {
            reply.code(400);
            return {
              status: "error",
              message: "Stock pricing unavailable (FINNHUB_API_KEY missing)"
            };
          }

          payload = await getStock(baseUpper, apiKey);
        }
      }

      return {
        status: "ok",
        base: baseUpper,
        quote: quoteUpper,
        data: payload,
        timestamp: now()
      };

    } catch (err: any) {
      reply.code(500);
      return {
        status: "error",
        message: err.message || "Internal Server Error"
      };
    }
  });

  // GET /api/prices/:base/:quote
  fastify.get("/:base/:quote", async (req, reply) => {
    const { base, quote } = req.params as { base: string; quote: string };
    return fastify.inject({
      method: "GET",
      url: `/api/prices?base=${base}&quote=${quote}`
    });
  });

};
