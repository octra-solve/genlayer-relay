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

// ----------------- DYNAMIC BASE URL -----------------
let BASE_URL = "http://localhost:3000"; // fallback (used only if fetch fails)
let configLoaded = false;
let configPromise: Promise<void> | null = null;

// Lazy load runtime-config.json only once
function loadConfig(): Promise<void> {
  if (!configPromise) {
    configPromise = fetch("/runtime-config.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((cfg) => {
        if (cfg.BACKEND_URL) BASE_URL = cfg.BACKEND_URL;
        configLoaded = true;
        console.log("✅ API BASE_URL dynamically loaded:", BASE_URL);
      })
      .catch((err) => {
        console.warn("⚠️ Failed to load runtime-config.json, using fallback:", err);
        configLoaded = true;
      });
  }
  return configPromise;
}

// ----------------- HELPER: RETRY & ERROR HANDLING -----------------
const handleRequest = async <T>(
  fn: () => Promise<T>,
  fallback?: T,
  retries = 2,
  delayMs = 500
): Promise<T> => {
  // wait until config is loaded
  if (!configLoaded) await loadConfig();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error(`Axios Error (attempt ${attempt + 1}):`, err.message, err.response?.data);
      } else {
        console.error(`Unexpected Error (attempt ${attempt + 1}):`, err);
      }
      if (attempt < retries) await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  console.warn("⚠️ All attempts failed, returning fallback value.");
  return fallback as T;
};

// ----------------- API OBJECT -----------------
export const api = {
  // ----------------- PRICES -----------------
  getPrices: async (vs: string = "usd") => {
    return handleRequest(async () => {
      const res = await axios.get(`${BASE_URL}/prices`, { params: { vs }, timeout: 7000 });
      return res.data;
    }, { error: "Failed to fetch prices" });
  },

  // ----------------- WEATHER -----------------
  getWeather: async (city: string) => {
    return handleRequest(async () => {
      const res = await axios.get(`${BASE_URL}/weather`, { params: { city }, timeout: 7000 });
      return res.data;
    }, { error: "Failed to fetch weather" });
  },

  // ----------------- RANDOMNESS -----------------
  getRandom: async () => {
    return handleRequest(async () => {
      const res = await axios.get(`${BASE_URL}/random`, { timeout: 7000 });
      return res.data;
    }, { error: "Failed to fetch random value" });
  },

  // ----------------- SIGN -----------------
  signMessage: async (message: string, secret: string): Promise<SignResponse> => {
    if (!message || !secret) return { error: "Message and secret required", status: "ok" };
    return handleRequest(async () => {
      const res = await axios.post(`${BASE_URL}/sign`, { message, secret }, { timeout: 7000 });
      return res.data as SignResponse;
    }, { error: "Failed to sign message", status: "ok" });
  },

  // ----------------- VERIFY -----------------
  verifySignature: async (message: string, signature: string, secret: string): Promise<VerifyResponse> => {
    if (!message || !signature || !secret) return { error: "All fields required", status: "ok" };
    return handleRequest(async () => {
      const res = await axios.post(`${BASE_URL}/verify`, { message, signature, secret }, { timeout: 7000 });
      return res.data as VerifyResponse;
    }, { error: "Failed to verify signature", status: "ok" });
  },
};
export { loadConfig };