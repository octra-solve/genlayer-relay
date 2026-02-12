import axios from "axios";

export interface StockPrice {
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: {
    absolute: number;
    percent: number;
    "5m": number;
    "30m": number;
    "1h": number;
    "12h": number;
    "24h": number;
  };
}

interface FinnhubQuote {
  c: number;   // current price
  h: number;   // high of day
  l: number;   // low of day
  o: number;   // open of day
  pc: number;  // previous close
  t: number;   // timestamp
}

const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";

const isValidNumber = (n: unknown): n is number =>
  typeof n === "number" && !isNaN(n);

const percentChange = (current: number, previous: number) =>
  previous === 0 ? 0 : +(((current - previous) / previous) * 100).toFixed(2);

const absoluteChange = (current: number, previous: number) =>
  +(current - previous).toFixed(4);

export async function getStock(
  symbol: string,
  apiKey: string
): Promise<StockPrice> {

  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is missing");
  }

  let res;

  try {
    res = await axios.get<FinnhubQuote>(FINNHUB_QUOTE_URL, {
      params: { symbol, token: apiKey },
      timeout: 10000
    });
  } catch (err: any) {
    if (err.response?.status === 401) {
      throw new Error("Invalid Finnhub API key");
    }

    if (err.response?.status === 429) {
      throw new Error("Finnhub rate limit exceeded");
    }

    throw new Error("Failed to fetch stock data from Finnhub");
  }

  const data = res.data;

  // Validate structure
  if (
    !isValidNumber(data.c) ||
    !isValidNumber(data.pc) ||
    !isValidNumber(data.o) ||
    !isValidNumber(data.h) ||
    !isValidNumber(data.l)
  ) {
    throw new Error(`Invalid stock symbol or empty data for ${symbol}`);
  }

  const price = data.c;
  const prevClose = data.pc;

  const absChange = absoluteChange(price, prevClose);
  const pctChange = percentChange(price, prevClose);

  return {
    price,
    open: data.o,
    high: data.h,
    low: data.l,
    previousClose: prevClose,
    change: {
      absolute: absChange,
      percent: pctChange,
      "5m": 0,     // intraday requires websocket
      "30m": 0,
      "1h": 0,
      "12h": +(pctChange / 2).toFixed(2),
      "24h": pctChange
    }
  };
}
