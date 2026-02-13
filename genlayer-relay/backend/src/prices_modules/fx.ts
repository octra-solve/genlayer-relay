import axios from "axios";

export interface FXPrice {
  base: string;
  quote: string;
  price: number;
  provider: "exchangerate.host";
  timestamp: number;
  change: {
    "5m": null;
    "30m": null;
    "1h": null;
    "12h": null;
    "24h": null;
  };
}

interface ExchangeRateResponse {
  success?: boolean;
  base: string;
  date?: string;
  rates: Record<string, number>;
}

const FX_URL = "https://api.frankfurter.app/latest";
const FX_API_KEY = process.env.FX_API_KEY;

const now = () => Math.floor(Date.now() / 1000);

const isValidNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

function assertValidResponse(data: unknown): asserts data is ExchangeRateResponse {
  if (
    !data ||
    typeof data !== "object" ||
    !("rates" in data) ||
    typeof (data as any).rates !== "object"
  ) {
    throw new Error("Invalid FX provider response structure");
  }
}

/**
 * Structural runtime guard for Axios-like errors.
 * We do NOT depend on Axios types.
 */
function isAxiosLikeError(
  err: unknown
): err is { response?: { status?: number } } {
  return (
    typeof err === "object" &&
    err !== null &&
    "response" in err
  );
}

async function fetchRate(
  base: string,
  symbols: string
): Promise<ExchangeRateResponse> {
  try {
    const res = await axios.get<ExchangeRateResponse>(FX_URL, {
    params: { 
    base, 
    symbols,
    access_key: FX_API_KEY 
            },
    timeout: 10000
    });
    console.log(`[FX DEBUG] base=${base} symbols=${symbols} res.data=`, res.data);
    
    assertValidResponse(res.data);
    return res.data;

  } catch (err: unknown) {

    if (isAxiosLikeError(err)) {
      const status = err.response?.status;

      if (status === 429) {
        throw new Error("FX provider rate limit exceeded");
      }

      if (status === 401) {
        throw new Error("FX provider authentication error");
      }

      throw new Error(
        `FX provider HTTP error: ${status ?? "network failure"}`
      );
    }

    throw new Error("Unknown error while fetching FX rate");
  }
}

export async function getFX(
  base: string,
  quote: string
): Promise<FXPrice> {

  const baseUpper = base.toUpperCase();
  const quoteUpper = quote.toUpperCase();

  if (!baseUpper || !quoteUpper) {
    throw new Error("Invalid currency pair");
  }

  // Same currency
  if (baseUpper === quoteUpper) {
    return {
      base: baseUpper,
      quote: quoteUpper,
      price: 1,
      provider: "exchangerate.host",
      timestamp: now(),
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
  let rate = direct.rates?.[quoteUpper];

  // Pivot via USD if needed
  if (!isValidNumber(rate)) {
    const pivot = await fetchRate(
      "USD",
      `${baseUpper},${quoteUpper}`
    );

    const baseRate = pivot.rates?.[baseUpper];
    const quoteRate = pivot.rates?.[quoteUpper];

    if (isValidNumber(baseRate) && isValidNumber(quoteRate)) {
      rate = quoteRate / baseRate;
    }
  }

  if (!isValidNumber(rate)) {
    throw new Error(
      `FX rate unavailable for pair ${baseUpper}/${quoteUpper}`
    );
  }

  return {
    base: baseUpper,
    quote: quoteUpper,
    price: +rate.toFixed(8),
    provider: "exchangerate.host",
    timestamp: now(),
    change: {
      "5m": null,
      "30m": null,
      "1h": null,
      "12h": null,
      "24h": null
    }
  };
}
