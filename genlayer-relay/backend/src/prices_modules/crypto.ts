import axios from "axios";

export interface CoinGeckoCoin {
  id: string;
  symbol: string;
}

export interface CryptoPrice {
  price: number | null;
  change: {
    "5m": number;
    "30m": number;
    "1h": number;
    "12h": number;
    "24h": number;
  };
}

const COINGECKO_LIST_URL =
  "https://api.coingecko.com/api/v3/coins/list";

const COINGECKO_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price";

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isValidNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

const safeNumber = (n: unknown, fallback = 0): number =>
  isValidNumber(n) ? n : fallback;

/**
 * Runtime-safe extractor for CoinGecko list response
 */
function extractCoinList(data: unknown): CoinGeckoCoin[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) =>
      isObject(item) &&
      typeof item.id === "string" &&
      typeof item.symbol === "string"
    )
    .map((item) => ({
      id: item.id as string,
      symbol: item.symbol as string
    }));
}

/**
 * Runtime-safe price extraction
 */
function extractPriceData(
  data: unknown,
  coinId: string,
  quote: string
): { price: number | null; change24h: number } {

  if (!isObject(data)) {
    return { price: null, change24h: 0 };
  }

  const coinBlock = data[coinId];

  if (!isObject(coinBlock)) {
    return { price: null, change24h: 0 };
  }

  const priceRaw = coinBlock[quote];
    const changeRaw = coinBlock[`${quote}_24h_change`];

  return {
    price: isValidNumber(priceRaw) ? priceRaw : null,
    change24h: safeNumber(changeRaw, 0)
  };
}

export async function getCryptoList(): Promise<Record<string, CoinGeckoCoin>> {

  const res = await axios.get(COINGECKO_LIST_URL, {
    timeout: 10000
  });

  const coins = extractCoinList(res.data);

  const map: Record<string, CoinGeckoCoin> = {};

  for (const coin of coins) {
    map[coin.symbol.toLowerCase()] = coin;
  }

  return map;
}

export async function getCrypto(
  coinId: string,
  quote: string
): Promise<CryptoPrice> {

  const quoteLower = quote.toLowerCase();
  const idLower = coinId.toLowerCase();

  const res = await axios.get(COINGECKO_PRICE_URL, {
    params: {
      ids: idLower,
      vs_currencies: quoteLower,
      include_24hr_change: true
    },
    timeout: 10000
  });

  const { price, change24h } =
    extractPriceData(res.data, idLower, quoteLower);

  return {
    price,
    change: {
      "5m": 0,
      "30m": 0,
      "1h": 0,
      "12h": +((change24h / 2)).toFixed(2),
      "24h": +change24h.toFixed(2)
    }
  };
}
