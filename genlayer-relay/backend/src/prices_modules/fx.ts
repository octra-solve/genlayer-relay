import axios from "axios";

export interface FXPrice {
  base: string;
  quote: string;
  price: number;
  provider: "frankfurter";
  timestamp: string;
  change: {
    "5m": null;
    "30m": null;
    "1h": null;
    "12h": null;
    "24h": null;
  };
}

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

const FX_URL = "https://api.frankfurter.app/latest";

const now = () => Math.floor(Date.now() / 1000);

const isValidNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

function assertValidResponse(
  data: unknown
): asserts data is { base: string; rates: Record<string, number> } {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid FX response: not an object");
  }

  const d = data as Record<string, unknown>;

  if (typeof d.base !== "string") {
    throw new Error("Invalid FX response: missing base");
  }

  if (!d.rates || typeof d.rates !== "object") {
    throw new Error("Invalid FX response: missing rates");
  }

  for (const value of Object.values(d.rates)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("Invalid FX response: invalid rate value");
    }
  }
}

/**
 * Structural runtime guard for Axios-like errors.
 */
function isAxiosLikeError(
  err: unknown
): err is { response?: { status?: number } } {
  return typeof err === "object" && err !== null && "response" in err;
}

async function fetchRate(
  base: string,
  symbols: string
): Promise<{ base: string; rates: Record<string, number> }> {
  try {
    const url = `${FX_URL}?from=${base}&to=${symbols}`;

    const res = await axios.get<FrankfurterResponse>(url, { timeout: 10000 });

    console.log(`[FX DEBUG] base=${base} symbols=${symbols} res.data=`, res.data);

    if (!res.data || !res.data.rates) {
      throw new Error("Invalid FX provider response");
    }

    assertValidResponse(res.data);

    return {
      base: res.data.base,
      rates: res.data.rates
    };
  } catch (err: unknown) {
    if (isAxiosLikeError(err)) {
      const status = err.response?.status;

      if (status === 429) {
        throw new Error("FX provider rate limit exceeded");
      }

      throw new Error(`FX provider HTTP error: ${status ?? "network failure"}`);
    }

    throw new Error("Unknown error while fetching FX rate");
  }
}

export async function getFX(base: string, quote: string): Promise<FXPrice> {
  const baseUpper = base.toUpperCase();
  const quoteUpper = quote.toUpperCase();

  if (!baseUpper || !quoteUpper) {
    throw new Error("Invalid currency pair");
  }

  // Same currency shortcut
  if (baseUpper === quoteUpper) {
    return {
      base: baseUpper,
      quote: quoteUpper,
      price: 1,
      provider: "frankfurter",
      timestamp: new Date(now() * 1000).toISOString(), 
      change: {
        "5m": null,
        "30m": null,
        "1h": null,
        "12h": null,
        "24h": null
      }
    };
  }

  // Direct fetch
  const direct = await fetchRate(baseUpper, quoteUpper);
  const rate = direct.rates[quoteUpper];

  if (!isValidNumber(rate)) {
    throw new Error(`FX rate unavailable for pair ${baseUpper}/${quoteUpper}`);
  }

  return {
    base: baseUpper,
    quote: quoteUpper,
    price: +rate.toFixed(8),
    provider: "frankfurter",
    timestamp: new Date(now() * 1000).toISOString(),
    change: {
      "5m": null,
      "30m": null,
      "1h": null,
      "12h": null,
      "24h": null
    }
  };
}
