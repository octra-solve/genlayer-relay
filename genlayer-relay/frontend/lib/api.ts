import axios from "axios";

// ----------------- TYPES -----------------
export interface SignResponse {
  signature?: string;
  error?: string;
  status?: string;
}

export interface VerifyResponse {
  valid?: boolean;
  message?: string;
  error?: string;
  status?: string;
}

export interface PriceData {
  price: number | null;
  change?: Record<string, number>;
}

export interface PriceResponse {
  status: string;
  base: string;
  quote: string;
  data: PriceData;
  timestamp: number;
}

export interface PriceOptions {
  status: string;
  crypto: string[];
  fx: string[];
  stocks: string[];
}

export interface WeatherResponse {
  status: string;
  city: string;
  data?: any;
  timestamp?: number;
  message?: string;
}

export interface RandomResponse {
  status: string;
  random?: string;
  entropy?: string;
  timestamp?: number;
  message?: string;
}

// ----------------- BASE URL -----------------
const BASE_URL = "/api";

// ----------------- HELPER -----------------
const handleRequest = async <T>(fn: () => Promise<T>, fallback?: T): Promise<T> => {
  try {
    const result = await fn();
    console.log("✅ API success:", result);
    return result;
  } catch (err) {
    console.error("❌ API error:", err);
    return fallback as T;
  }
};

// ----------------- API OBJECT -----------------
export const api = {
  // ----------------- PRICE OPTIONS -----------------
  getPriceOptions: async (): Promise<PriceOptions> =>
    handleRequest(
      async () => {
        console.log("GET /prices/options");
        const res = await axios.get(`${BASE_URL}/prices/options`, { timeout: 7000 });
        return res.data;
      },
      { status: "error", crypto: [], fx: [], stocks: [] }
    ),

  // ----------------- GET PRICE -----------------
  getPrice: async (base: string, quote: string): Promise<PriceResponse> =>
    handleRequest(
      async () => {
        console.log(` GET /prices?base=${base}&quote=${quote}`);
        const res = await axios.get(`${BASE_URL}/prices`, {
          params: { base, quote },
          timeout: 7000,
        });
        return res.data;
      },
      {
        status: "error",
        base,
        quote,
        data: {},
        timestamp: Date.now(),
      }
    ),

  // ----------------- WEATHER -----------------
  getWeather: async (city: string): Promise<WeatherResponse> =>
    handleRequest(
      async () => {
        console.log(` GET /weather?city=${city}`);
        const res = await axios.get(`${BASE_URL}/weather`, {
          params: { city },
          timeout: 7000,
        });
        return res.data;
      },
      { status: "error", city, message: "Failed to fetch weather" }
    ),

  // ----------------- RANDOMNESS -----------------
  getRandom: async (): Promise<RandomResponse> =>
    handleRequest(
      async () => {
        console.log(" GET /random");
        const res = await axios.get(`${BASE_URL}/random`, { timeout: 7000 });
        return res.data;
      },
      { status: "error", message: "Failed to fetch random value" }
    ),

  // ----------------- SIGN -----------------
  signMessage: async (message: string, secret: string): Promise<SignResponse> =>
    handleRequest(
      async () => {
        console.log(" POST /sign");
        const res = await axios.post(
          `${BASE_URL}/sign`,
          { message, secret },
          { timeout: 7000 }
        );
        return res.data;
      },
      { error: "Failed to sign message", status: "ok" }
    ),

  // ----------------- VERIFY -----------------
  verifySignature: async (message: string, signature: string, secret: string): Promise<VerifyResponse> =>
    handleRequest(
      async () => {
        console.log(" POST /verify");
        const res = await axios.post(
          `${BASE_URL}/verify`,
          { message, signature, secret },
          { timeout: 7000 }
        );
        return res.data;
      },
      { error: "Failed to verify signature", status: "ok" }
    ),
};
