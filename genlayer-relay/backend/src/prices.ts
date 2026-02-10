import { FastifyPluginAsync } from "fastify";
import axios from "axios";

// ----------------- ASSET CACHES -----------------
let cryptoCache: Record<string, string> = {}; // { id: symbol }
let stockCache: Set<string> = new Set();
const fxCache: Set<string> = new Set([
  "USD","EUR","GBP","JPY","AUD","CAD","CHF","CNY","NZD","SEK"
]);

// short-lived price cache (prevents UI jitter)
const priceCache = new Map<string, any>();
const CACHE_TTL = 60; // seconds

// ----------------- HELPER: SYMBOL → ID -----------------
export function getCryptoIdFromSymbol(symbol: string) {
  const lowerSymbol = symbol.toLowerCase();
  const id = Object.keys(cryptoCache).find(
  (id) => cryptoCache[id].toLowerCase() === lowerSymbol
  );
  if (id) return id;

  // fallback for top coins if cache isn't loaded yet
  const topCoins: Record<string, string> = {
   btc: "bitcoin",
   eth: "ethereum",
   usdt: "tether",
   bnb: "binancecoin",
   ada: "cardano",
        };
        return topCoins[lowerSymbol] || null;
        }
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
  rates: Record<string, number>;
}

interface FinnhubQuote {
  c: number; // current price
  pc: number; // previous close
}

// ----------------- HELPERS -----------------
const now = () => Math.floor(Date.now() / 1000);

const percent = (a: number, b: number) =>
  b === 0 ? 0 : +(((a - b) / b) * 100).toFixed(2);

const cacheKey = (base: string, quote: string) =>
  `price:${base.toLowerCase()}-${quote.toLowerCase()}`;

// ----------------- LOAD CRYPTO LIST -----------------
async function loadCryptoCache() {
    if (Object.keys(cryptoCache).length) return;
    try {
    const res = await axios.get<CoinGeckoCoin[]>(COINGECKO_LIST_URL, { timeout: 10000 });
    res.data.forEach((coin) => {
    cryptoCache[coin.id.toLowerCase()] = coin.symbol.toLowerCase();
    });
    console.log("Crypto cache loaded:", Object.keys(cryptoCache).length, "coins");
    } catch (e) {
    console.error(" Failed to load crypto cache:", e);
                }
                }

// ----------------- LOAD STOCK LIST -----------------
async function loadStockCache(apiKey?: string) {
  if (!apiKey || stockCache.size) return;
  try {
  const res = await axios.get<any[]>("https://finnhub.io/api/v1/stock/symbol", {
  params: { exchange: "US", token: apiKey },
  timeout: 10000
  });
  res.data.forEach((s) => stockCache.add(s.symbol.toUpperCase()));
  console.log(" Stock cache loaded:",
  stockCache.size, "symbols");
  } catch (e) {
  console.error(" Failed to load stock cache:", e);
  }
  }

// ----------------- PRICE RESOLVERS -----------------
async function getCrypto(base: string, quote: string) {
  const res = await axios.get<CoinGeckoPrice>(COINGECKO_PRICE_URL, {
    params: {
      ids: base,
      vs_currencies: quote,
      include_24hr_change: true
    },
    timeout: 10000
  });

  const price = res.data?.[base]?.[quote] ?? null;
  const change24h = res.data?.[base]?.[`${quote}_24h_change`] ?? 0;

  return {
    price,
    change: {
      "5m": 0,
      "30m": 0,
      "1h": 0,
      "12h": +(change24h / 2).toFixed(2),
      "24h": +change24h.toFixed(2)
    }
  };
}

async function getStock(symbol: string, apiKey: string) {
  const q = await axios.get<FinnhubQuote>(FINNHUB_QUOTE_URL, {
    params: { symbol, token: apiKey },
    timeout: 10000
  });

  const price = q.data.c;
  const prev = q.data.pc;
  const dayChange = percent(price, prev);

  return {
    price,
    change: {
      "5m": 0,
      "30m": 0,
      "1h": 0,
      "12h": +(dayChange / 2).toFixed(2),
      "24h": dayChange
    }
  };
}

async function getFX(base: string, quote: string) {
  const res = await axios.get<FXResponse>(FX_URL, {
    params: { base, symbols: quote },
    timeout: 10000
  });

  const price = res.data?.rates?.[quote] ?? null;

  return {
    price,
    change: {
      "5m": null,
      "30m": null,
      "1h": null,
      "12h": null,
      "24h": null
    }
  };
}

// ----------------- PLUGIN -----------------
export const pricesRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /prices/options
  fastify.get("/options", async () => {
    await loadCryptoCache();

    const apiKey = process.env.FINNHUB_API_KEY;
    if (apiKey) {
      await loadStockCache(apiKey);
    }

    return {
      status: "ok",
      crypto: Object.keys(cryptoCache),
      fx: Array.from(fxCache),
      stocks: Array.from(stockCache)
    };
  });

  // GET /prices?base=X&quote=Y
  fastify.get("/", async (req, reply) => {
    const query = req.query as { base?: string; quote?: string };

    if (!query.base) {
      reply.code(400);
      return { status: "error", message: "Missing base asset" };
    }

    const base = query.base;
    const quote = query.quote || "USD";

    const key = cacheKey(base, quote);
    const cached = priceCache.get(key);

    if (cached && now() - cached.timestamp < CACHE_TTL) {
      return cached;
    }

    await loadCryptoCache();
    const apiKey = process.env.FINNHUB_API_KEY || "";

    let payload;

    // ---- CRYPTO ----
    const cryptoId = getCryptoIdFromSymbol(base);
    console.log(" /prices request:", base, quote, "cryptoId:", cryptoId);  // <-- ADD THIS
    if (cryptoId) {
        payload = await getCrypto(cryptoId, quote.toLowerCase());
        }

    // ---- FX ----
    else if (fxCache.has(base.toUpperCase())) {
      payload = await getFX(base.toUpperCase(), quote.toUpperCase());
    }

    // ---- STOCKS ----
    else {
      await loadStockCache(apiKey);
      if (!stockCache.has(base.toUpperCase())) {
        reply.code(400);
        return {
          status: "error",
          message: `Unsupported base asset: ${base}`
        };
      }

      if (!apiKey) {
        reply.code(400);
        return {
          status: "error",
          message: "Stock pricing unavailable (API key missing)"
        };
      }

      payload = await getStock(base.toUpperCase(), apiKey);
    }

    const response = {
      status: "ok",
      base: base.toUpperCase(),
      quote: quote.toUpperCase(),
      data: payload,
      timestamp: now()
    };

    priceCache.set(key, response);
    return response;
  });
// GET /prices/:base/:quote
fastify.get("/:base/:quote", async (req, reply) => {
const { base, quote } = req.params as { base: string; quote: string };
const key = cacheKey(base, quote);
const cached = priceCache.get(key);

if (cached && now() - cached.timestamp < CACHE_TTL) {
return cached;
}

await loadCryptoCache();
const apiKey = process.env.FINNHUB_API_KEY || "";

let payload;

// ---- CRYPTO ----
const cryptoId = getCryptoIdFromSymbol(base);
if (cryptoId) {
payload = await getCrypto(cryptoId, quote.toLowerCase());
}
// ---- FX ----
else if (fxCache.has(base.toUpperCase())) {
payload = await getFX(base.toUpperCase(), quote.toUpperCase());
}
// ---- STOCKS ----
else {
await loadStockCache(apiKey);
if (!stockCache.has(base.toUpperCase())) {
reply.code(400);
return { status: "error", message: `Unsupported base asset: ${base}` };
}
if (!apiKey) {
reply.code(400);
return { status: "error", message: "Stock pricing unavailable (API key missing)" };
}
payload = await getStock(base.toUpperCase(), apiKey);
}

const response = {
status: "ok",
base: base.toUpperCase(),
quote: quote.toUpperCase(),
data: payload,
timestamp: now()
};

priceCache.set(key, response);
return response;
});
};
export { loadCryptoCache, loadStockCache };