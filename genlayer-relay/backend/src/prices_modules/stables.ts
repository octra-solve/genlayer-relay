import { getCryptoList, CoinGeckoCoin } from "./crypto";

/**
 * Stable registry
 */
interface StableConfig {
  symbol: string;
  coingeckoId?: string;
  peg: number;
}

const STABLE_REGISTRY: Record<string, StableConfig> = {
  USDT: { symbol: "USDT", coingeckoId: "tether", peg: 1 },
  USDC: { symbol: "USDC", coingeckoId: "usd-coin", peg: 1 },
  BUSD: { symbol: "BUSD", coingeckoId: "binance-usd", peg: 1 },
  DAI:  { symbol: "DAI",  coingeckoId: "dai", peg: 1 }
};

/**
 * We do NOT assume CoinGeckoCoin has a price field.
 * We extend it dynamically and safely.
 */
export interface StablecoinData extends CoinGeckoCoin {
  price: number;
  peg: number;
  deviationPercent: number;
  isDepegged: boolean;
}

const isValidNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

const percent = (a: number, b: number) =>
  b === 0 ? 0 : +(((a - b) / b) * 100).toFixed(4);

export function normalizeStablecoin(symbol: string): string {
  return symbol?.trim().toUpperCase() || "";
}

/**
 * Safe runtime extractor for price
 */
function extractPrice(coin: unknown): number | null {
  if (
    coin &&
    typeof coin === "object" &&
    "price" in coin &&
    isValidNumber((coin as any).price)
  ) {
    return (coin as any).price;
  }
  return null;
}

export async function getStablecoins(): Promise<Record<string, StablecoinData>> {

  const allCoins = await getCryptoList();
  const result: Record<string, StablecoinData> = {};

  for (const [symbol, config] of Object.entries(STABLE_REGISTRY)) {

    const coin =
      allCoins[symbol] ||
      (config.coingeckoId
        ? Object.values(allCoins).find(
            (c) =>
              typeof c === "object" &&
              c !== null &&
              "id" in c &&
              (c as any).id === config.coingeckoId
          )
        : undefined);

    if (!coin) continue;

    const price = extractPrice(coin);
    if (!isValidNumber(price)) continue;

    const deviation = percent(price, config.peg);
    const isDepegged = Math.abs(deviation) >= 1;

    result[symbol] = {
      ...(coin as CoinGeckoCoin),
      price,
      peg: config.peg,
      deviationPercent: deviation,
      isDepegged
    };
  }

  return result;
}

export async function getStablecoin(
  symbol: string
): Promise<StablecoinData> {

  const normalized = normalizeStablecoin(symbol);

  if (!STABLE_REGISTRY[normalized]) {
    throw new Error(`Unsupported stablecoin: ${symbol}`);
  }

  const stables = await getStablecoins();
  const stable = stables[normalized];

  if (!stable) {
    throw new Error(`Stablecoin data unavailable: ${symbol}`);
  }

  return stable;
}
