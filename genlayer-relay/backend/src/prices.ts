import { FastifyPluginAsync } from "fastify";
import axios from "axios";

// ----------------- ASSET CACHES -----------------
let cryptoCache: Record<string, string> = {}; // { id: symbol }
let stockCache: Set<string> = new Set();
const fxCache: Set<string> = new Set(["USD","EUR","GBP","JPY","AUD","CAD","CHF","CNY","NZD","SEK"]);

// ----------------- API URLS -----------------
const COINGECKO_LIST_URL = "https://api.coingecko.com/api/v3/coins/list";
const COINGECKO_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price";
const FX_URL = "https://api.exchangerate.host/latest";
const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";

// ----------------- TYPES -----------------
interface CoinGeckoCoin {
  id: string;
  symbol: string;
}

interface CoinGeckoPrice {
  [id: string]: Record<string, number>;
}

interface FXResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface FinnhubQuote {
  c: number; // current price
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // prev close
}

// ----------------- LOAD CRYPTO LIST -----------------
async function loadCryptoCache() {
  if (Object.keys(cryptoCache).length === 0) {
    const res = await axios.get<CoinGeckoCoin[]>(COINGECKO_LIST_URL, { timeout: 10000 });
    res.data.forEach((coin) => {
      cryptoCache[coin.id.toLowerCase()] = coin.symbol.toLowerCase();
    });
  }
}

// ----------------- LOAD STOCK LIST -----------------
async function loadStockCache(apiKey: string) {
  if (stockCache.size === 0) {
    const res = await axios.get<any[]>("https://finnhub.io/api/v1/stock/symbol", {
      params: { exchange: "US", token: apiKey },
      timeout: 10000
    });
    res.data.forEach((s) => stockCache.add(s.symbol.toUpperCase()));
  }
}

// ----------------- PLUGIN -----------------
export const pricesRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /prices/options -> return cached assets for dropdowns
  fastify.get("/options", async (req, reply) => {
    try {
      await loadCryptoCache();
      const apiKey = process.env.FINNHUB_API_KEY || "";
      if (!apiKey) throw new Error("FINNHUB_API_KEY not set in environment");
      await loadStockCache(apiKey);

      return {
        status: "ok",
        crypto: Object.keys(cryptoCache),
        fx: Array.from(fxCache),
        stocks: Array.from(stockCache)
      };
    } catch (err: any) {
      reply.code(500);
      return { status: "error", message: err.message || "Failed to load asset options" };
    }
  });

  // GET /prices?base=X&quote=Y -> fetch price
  fastify.get("/", async (req, reply) => {
    const query = req.query as { base?: string; quote?: string };
    const rawBase = query.base?.toLowerCase() || "bitcoin";
    const rawQuote = query.quote?.toLowerCase() || "usd";
    const apiKey = process.env.FINNHUB_API_KEY || "";

    try {
      let resultData: Record<string, any> = {};

      // ────────── CRYPTO ──────────
      await loadCryptoCache();
      if (cryptoCache[rawBase]) {
        const res = await axios.get<CoinGeckoPrice>(COINGECKO_PRICE_URL, {
          params: { ids: rawBase, vs_currencies: rawQuote },
          timeout: 10000
        });
        resultData[rawBase] = res.data[rawBase] ?? null;
      }

      // ────────── FX ──────────
      else if (fxCache.has(rawBase.toUpperCase())) {
        const res = await axios.get<FXResponse>(FX_URL, {
          params: { base: rawBase.toUpperCase(), symbols: rawQuote.toUpperCase() },
          timeout: 10000
        });
        resultData[rawBase.toUpperCase()] = res.data.rates ?? null;
      }

      // ────────── STOCKS ──────────
      else {
        await loadStockCache(apiKey);
        if (stockCache.has(rawBase.toUpperCase())) {
          const res = await axios.get<FinnhubQuote>(FINNHUB_QUOTE_URL, {
            params: { symbol: rawBase.toUpperCase(), token: apiKey },
            timeout: 10000
          });
          resultData[rawBase.toUpperCase()] = { [rawQuote.toUpperCase()]: res.data.c ?? null };
        } else {
          reply.code(400);
          return { 
            status: "error", 
            message: `Unsupported base asset: ${rawBase}` 
          };
        }
      }

      return {
        status: "ok",
        base: rawBase.toUpperCase(),
        quote: rawQuote.toUpperCase(),
        data: resultData,
        timestamp: Math.floor(Date.now() / 1000)
      };
    } catch (err: any) {
      reply.code(500);
      return { status: "error", message: err.message || "Unknown error fetching price" };
    }
  });
};
