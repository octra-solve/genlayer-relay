import { FastifyPluginAsync } from "fastify";
import axios from "axios";

// ----------------- ASSET CACHES -----------------
let cryptoCache: Record<string, CoinGeckoCoin> = {}; 
/* let stockCache: Set<string> = new Set(); */
const fxCache: Set<string> = new Set([
  "USD","EUR","GBP","JPY","AUD","CAD","CHF","CNY","NZD","SEK"
]);

const STABLECOINS: Record<string, string> = {
    USDT: "USDT",
    USDC: "USDC",
    BUSD: "BUSD",
    DAI: "DAI"
               };

const normalizeStablecoin = (symbol: string) =>
      STABLECOINS[symbol.toUpperCase()] || symbol.toUpperCase();

// short-lived price cache (prevents UI jitter)
const priceCache = new Map<string, any>();
const CACHE_TTL = 60; // seconds

let coinListCache: { timestamp: number; data: CoinGeckoCoin[] } | null = null;
const COIN_LIST_TTL = 60; // seconds
// ----------------- HELPER: SYMBOL → ID -----------------
export async function getCryptoIdFromSymbol(symbol: string): Promise<string | null> {
    const coin = cryptoCache[symbol.toLowerCase()];
      return coin ? coin.id : null;
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
async function loadCryptoCache(): Promise<void> {
  const nowTs = Math.floor(Date.now() / 1000);

  // Use cache if it's fresh
 if (coinListCache && nowTs - coinListCache.timestamp < COIN_LIST_TTL) {
    cryptoCache = {};
    coinListCache.data.forEach((coin: CoinGeckoCoin) => {
    cryptoCache[coin.symbol.toLowerCase()] = coin;
           });
    return;
            }
 
  try {
  const res = await axios.get<CoinGeckoCoin[]>(COINGECKO_LIST_URL, { timeout: 10000 });

  // save to cache
  coinListCache = {
  timestamp: nowTs,
  data: res.data,
  };

  // update cryptoCache
  cryptoCache = {};
  res.data.forEach((coin: CoinGeckoCoin) => {
    cryptoCache[coin.symbol.toLowerCase()] = coin;
    });

  console.log("Crypto cache loaded:", Object.keys(cryptoCache).length, "coins");
  } catch (e) {
  console.error("Failed to load crypto cache:", e);
  }
  }


// ----------------- LOAD STOCK LIST -----------------
async function loadStockCache(apiKey?: string) {
  if (!apiKey) return;
  try {
  const res = await axios.get<any[]>("https://finnhub.io/api/v1/stock/symbol", {
  params: { exchange: "US", token: apiKey },
  timeout: 10000
  });
  console.log("Stock symbols fetched dynamically:", res.data.length);
  } catch (e) {
  console.error("Failed to fetch stock symbols:", e);
  }
  }

// ----------------- PRICE RESOLVERS -----------------
async function getCrypto(coinId: string, quote: string) {
    // ensure quote is lowercase
      const quoteLower = quote.toLowerCase();

  const res = await axios.get<CoinGeckoPrice>(COINGECKO_PRICE_URL, {
    params: {
    ids: coinId,      
    vs_currencies: quoteLower,
    include_24hr_change: true
            },
    timeout: 10000
           });
    

  const price = res.data?.[coinId]?.[quoteLower] ?? null;
  const change24h = res.data?.[coinId]?.[`${quoteLower}_24h_change`] ?? 0;

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
  params: { base, symbols: quote.toUpperCase() },
  timeout: 10000
  });

  let rate = res.data?.rates?.[quote.toUpperCase()];

  if (rate == null && base.toUpperCase() !== "USD" && quote.toUpperCase() !== "USD") {
  const pivotRes = await axios.get<FXResponse>(FX_URL, {
  params: { base: "USD", symbols: `${base.toUpperCase()},${quote.toUpperCase()}` },
  timeout: 10000
  });
  const baseRate = pivotRes.data.rates?.[base.toUpperCase()];
  const quoteRate = pivotRes.data.rates?.[quote.toUpperCase()];
  if (baseRate != null && quoteRate != null) {
  rate = quoteRate / baseRate;
  }
  }

  if (rate == null) throw new Error(`FX rate not found for ${base}/${quote}`);

  return {
  price: rate,
  change: { "5m": null, "30m": null, "1h": null, "12h": null, "24h": null }
  };
  }
// ----------------- PLUGIN -----------------
export const pricesRoutes: FastifyPluginAsync = async (fastify) => {

// GET /prices/options
fastify.get("/options", async () => {
// Load crypto dynamically
await loadCryptoCache();

// Get stock symbols dynamically from Finnhub API
const apiKey = process.env.FINNHUB_API_KEY;
let stocks: string[] = [];

if (apiKey) {
try {
const res = await axios.get<any[]>("https://finnhub.io/api/v1/stock/symbol", {
params: { exchange: "US", token: apiKey },
timeout: 10000
});
stocks = res.data.map((s) => s.symbol.toUpperCase());
} catch (e) {
console.error("Failed to fetch stock symbols dynamically:", e);
}
}

return {
status: "ok",
crypto: Object.keys(cryptoCache),
fx: Array.from(fxCache),
stocks // dynamic list, no cache
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

    const baseNorm = normalizeStablecoin(base);
    const quoteNorm = normalizeStablecoin(quote);

    const key = cacheKey(base, quote);
    const cached = priceCache.get(key);

    if (cached && now() - cached.timestamp < CACHE_TTL) {
      return cached;
    }

    await loadCryptoCache();
    const apiKey = process.env.FINNHUB_API_KEY || "";

let payload;

if (fxCache.has(baseNorm.toUpperCase()) || STABLECOINS[baseNorm.toUpperCase()]) {
payload = await getFX(baseNorm.toUpperCase(), quoteNorm.toUpperCase());
priceCache.set(key, {
status: "ok",
base: baseNorm.toUpperCase(),
quote: quoteNorm.toUpperCase(),
data: payload,
timestamp: now()
}); // cache FX only
} else if (cryptoCache[baseNorm.toLowerCase()]) {
const cryptoId = await getCryptoIdFromSymbol(baseNorm);
payload = await getCrypto(cryptoId!, quoteNorm.toLowerCase());
priceCache.set(key, {
status: "ok",
base: baseNorm.toUpperCase(),
quote: quoteNorm.toUpperCase(),
data: payload,
timestamp: now()
}); // cache crypto only
} else {
// Stock branch — no cache
const apiKey = process.env.FINNHUB_API_KEY || "";
if (!apiKey) {
reply.code(400);
return { status: "error", message: "Stock pricing unavailable (API key missing)" };
}

// Fetch real-time stock price dynamically
payload = await getStock(baseNorm.toUpperCase(), apiKey);
// no cache for stocks
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
const baseNorm = normalizeStablecoin(base);
const quoteNorm = normalizeStablecoin(quote);
const key = cacheKey(base, quote);
const cached = priceCache.get(key);

if (cached && now() - cached.timestamp < CACHE_TTL) {
return cached;
}

await loadCryptoCache();
const apiKey = process.env.FINNHUB_API_KEY || "";

let payload;

if (fxCache.has(baseNorm.toUpperCase()) || STABLECOINS[baseNorm.toUpperCase()]) {
payload = await getFX(baseNorm.toUpperCase(), quoteNorm.toUpperCase());
priceCache.set(key, {
status: "ok",
base: baseNorm.toUpperCase(),
quote: quoteNorm.toUpperCase(),
data: payload,
timestamp: now()
}); // cache FX only
} else if (cryptoCache[baseNorm.toLowerCase()]) {
const cryptoId = await getCryptoIdFromSymbol(baseNorm);
payload = await getCrypto(cryptoId!, quoteNorm.toLowerCase());
priceCache.set(key, {
status: "ok",
base: baseNorm.toUpperCase(),
quote: quoteNorm.toUpperCase(),
data: payload,
timestamp: now()
}); // cache crypto only
} else {
// Stock branch — no cache
const apiKey = process.env.FINNHUB_API_KEY || "";
if (!apiKey) {
reply.code(400);
return { status: "error", message: "Stock pricing unavailable (API key missing)" };
}

// Fetch real-time stock price dynamically
payload = await getStock(baseNorm.toUpperCase(), apiKey);
// no cache for stocks
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