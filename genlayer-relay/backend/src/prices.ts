import { FastifyPluginAsync } from "fastify";
import { getFX } from "./prices_modules/fx";
import { getCrypto, getCryptoList } from "./prices_modules/crypto";
import { normalizeStablecoin, getStablecoin } from "./prices_modules/stables";
import { getStock } from "./prices_modules/stocks";

// ----------------- OPTIONS CACHE -----------------
let cachedOptions: {
  crypto: string[];
    fx: string[];
      stocks: string[];
        timestamp: number;
        } | null = null;

        const OPTIONS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const now = () => Math.floor(Date.now() / 1000);
const nowMs = () => Date.now();

const FX_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "JPY", "AUD",
  "CAD", "CHF", "CNY", "NZD", "SEK",
  "HKD", "SGD", "INR", "BRL", "MXN", "RUB",
  "ZAR", "KRW", "TRY", "SAR", "AED",
  "THB", "MYR", "PHP", "IDR", "PLN",
  "DKK", "NOK", "HUF", "CZK", "ILS",
  "CLP", "COP", "PEN", "EGP", "NGN",
  "VND", "PKR", "BDT", "LKR", "KWD"
  ]);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/* =========================================================
   RATE LIMITING (Sliding Window, In-Memory)
   ========================================================= */

interface RateLimitBucket {
  timestamps: number[];
}

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60;  // 60 requests per minute

const rateLimitStore = new Map<string, RateLimitBucket>();

function cleanOldRequests(bucket: RateLimitBucket, now: number) {
  bucket.timestamps = bucket.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
}

function checkRateLimit(key: string): boolean {
  const currentTime = nowMs();

  let bucket = rateLimitStore.get(key);

  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitStore.set(key, bucket);
  }

  cleanOldRequests(bucket, currentTime);

  if (bucket.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  bucket.timestamps.push(currentTime);
  return true;
}

// Memory cleanup every 5 minutes
setInterval(() => {
  const currentTime = nowMs();
  for (const [key, bucket] of rateLimitStore.entries()) {
    cleanOldRequests(bucket, currentTime);
    if (bucket.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/* =========================================================
   ROUTES
   ========================================================= */

export const pricesRoutes: FastifyPluginAsync = async (fastify) => {

  async function resolvePrice(base: string, quote: string) {

    const baseNorm = normalizeStablecoin(base);
    const quoteNorm = normalizeStablecoin(quote || "USD");

    const baseUpper = baseNorm.toUpperCase();
    const quoteUpper = quoteNorm.toUpperCase();

    // ---------- FX ----------
    if (FX_CURRENCIES.has(baseUpper)) {
      return {
        base: baseUpper,
        quote: quoteUpper,
        data: await getFX(baseUpper, quoteUpper)
      };
    }

    // ---------- STABLE ----------
    try {
      const stable = await getStablecoin(baseUpper);
      return {
        base: baseUpper,
        quote: quoteUpper,
        data: stable
      };
    } catch {
      // continue
    }

    // ---------- CRYPTO ----------
    const cryptoMap = await getCryptoList();
    const coin = cryptoMap[baseUpper.toLowerCase()];

    if (coin) {
      const crypto = await getCrypto(coin.id, quoteUpper);
      return {
        base: baseUpper,
        quote: quoteUpper,
        data: crypto
      };
    }

    // ---------- STOCK ----------
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Stock pricing unavailable (FINNHUB_API_KEY missing)"
      );
    }

    const stock = await getStock(baseUpper, apiKey);

    return {
      base: baseUpper,
      quote: quoteUpper,
      data: stock
    };
  }

  /* =========================================================
     GLOBAL RATE LIMIT HOOK
     ========================================================= */

  fastify.addHook("onRequest", async (req, reply) => {

    const ip =
      req.ip ||
      (req.headers["x-forwarded-for"] as string) ||
      "unknown";

    const allowed = checkRateLimit(ip);

    if (!allowed) {
      reply.code(429);
      return reply.send({
        status: "error",
        message: "Rate limit exceeded. Try again later."
      });
    }
  });

  /* =========================================================
     GET /api/prices?base=X&quote=Y
     ========================================================= */

  fastify.get("/", async (req, reply) => {
    try {

      const query = req.query as unknown;

      if (!isObject(query) || typeof query.base !== "string") {
        reply.code(400);
        return {
          status: "error",
          message: "Missing or invalid base asset"
        };
      }

      const base = query.base;
      const quote =
        typeof query.quote === "string" ? query.quote : "USD";

      const result = await resolvePrice(base, quote);

      return {
        status: "ok",
        base: result.base,
        quote: result.quote,
        data: result.data,
        timestamp: now()
      };

    } catch (err: unknown) {

      const message =
        isObject(err) && typeof err.message === "string"
          ? err.message
          : "Internal Server Error";

      reply.code(500);

      return {
        status: "error",
        message
      };
    }
  });
  // ....... dynamic fetch for UI drop down.....
fastify.get("/options", async () => {
  const nowTime = Date.now();

  if (cachedOptions && nowTime - cachedOptions.timestamp < OPTIONS_CACHE_TTL) {
  return { status: "ok", ...cachedOptions };
    }

    // ---------- CRYPTO ----------
    const cryptoMap = await getCryptoList();
    const cryptoOptions = Object.keys(cryptoMap).map(k => k.toUpperCase());

    // ---------- FX ----------
    const fxOptions = Array.from(FX_CURRENCIES);

    // ---------- STOCKS (dynamic) ----------
    let stocksOptions: string[] = [];
    const apiKey = process.env.FINNHUB_API_KEY;
    if (apiKey) {
    try {
    const res = await fetch(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${apiKey}`);
    const data = await res.json();
    stocksOptions = data.map((s: any) => s.symbol.toUpperCase());
    } catch (err) {
    console.error("Failed to fetch stocks options dynamically:", err);
    stocksOptions = ["AAPL","TSLA","MSFT","GOOGL","AMZN"]; // fallback
    }
    }

    //-------------- CACHE my RESULTS -----------------
    cachedOptions = {
    crypto: cryptoOptions,
    fx: fxOptions,
    stocks: stocksOptions,
    timestamp: nowTime,
    };

    return {
    status: "ok",
    crypto: cryptoOptions,
    fx: fxOptions,
    stocks: stocksOptions,
    };
    });
  /* =========================================================
     GET /api/prices/:base/:quote
     ========================================================= */

  fastify.get("/:base/:quote", async (req, reply) => {

    const params = req.params as unknown;

    if (
      !isObject(params) ||
      typeof params.base !== "string" ||
      typeof params.quote !== "string"
    ) {
      reply.code(400);
      return {
        status: "error",
        message: "Invalid route parameters"
      };
    }

    try {

      const result = await resolvePrice(
        params.base,
        params.quote
      );

      return {
        status: "ok",
        base: result.base,
        quote: result.quote,
        data: result.data,
        timestamp: now()
      };

    } catch (err: unknown) {

      const message =
        isObject(err) && typeof err.message === "string"
          ? err.message
          : "Internal Server Error";

      reply.code(500);

      return {
        status: "error",
        message
      };
    }
  });

};
