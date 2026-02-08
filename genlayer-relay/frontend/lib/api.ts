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

// ----------------- BASE URL -----------------
// Empty string = SAME ORIGIN (this is the key)
const BASE_URL = "";

// ----------------- HELPER -----------------
const handleRequest = async <T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T> => {
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
  // ----------------- PRICES -----------------
  getPrices: async (vs: string = "usd") =>
    handleRequest(
      async () => {
        console.log("➡️ GET /prices");
        const res = await axios.get(`${BASE_URL}/prices`, {
          params: { vs },
          timeout: 7000,
        });
        return res.data;
      },
      { error: "Failed to fetch prices" }
    ),

  // ----------------- WEATHER -----------------
  getWeather: async (city: string) =>
    handleRequest(
      async () => {
        console.log("➡️ GET /weather");
        const res = await axios.get(`${BASE_URL}/weather`, {
          params: { city },
          timeout: 7000,
        });
        return res.data;
      },
      { error: "Failed to fetch weather" }
    ),

  // ----------------- RANDOMNESS -----------------
  getRandom: async () =>
    handleRequest(
      async () => {
        console.log("➡️ GET /random");
        const res = await axios.get(`${BASE_URL}/random`, {
          timeout: 7000,
        });
        return res.data;
      },
      { error: "Failed to fetch random value" }
    ),

  // ----------------- SIGN -----------------
  signMessage: async (
    message: string,
    secret: string
  ): Promise<SignResponse> =>
    handleRequest(
      async () => {
        console.log("➡️ POST /sign");
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
  verifySignature: async (
    message: string,
    signature: string,
    secret: string
  ): Promise<VerifyResponse> =>
    handleRequest(
      async () => {
        console.log("➡️ POST /verify");
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
