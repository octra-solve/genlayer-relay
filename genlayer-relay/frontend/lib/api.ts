import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = {
  // ----------------- PRICES -----------------
  getPrices: async (vs: string = "usd") => {
    try {
      const res = await axios.get(`${BASE_URL}/prices`, {
        params: { vs },
      });
      return res.data;
    } catch (err: any) {
      console.error("Error fetching prices:", err.message);
      return { error: err.message };
    }
  },

  // ----------------- WEATHER -----------------
  getWeather: async (city: string) => {
    try {
      const res = await axios.get(`${BASE_URL}/weather`, {
        params: { city },
      });
      return res.data;
    } catch (err: any) {
      console.error("Error fetching weather:", err.message);
      return { error: err.message };
    }
  },

  // ----------------- RANDOMNESS -----------------
  getRandom: async () => {
    try {
      const res = await axios.get(`${BASE_URL}/random`);
      return res.data;
    } catch (err: any) {
      console.error("Error fetching randomness:", err.message);
      return { error: err.message };
    }
  },

  // ----------------- SIGN -----------------
  signMessage: async (message: string, secret: string) => {
    try {
      const res = await axios.post(`${BASE_URL}/sign`, {
        message,
        secret,
      });
      return res.data;
    } catch (err: any) {
      console.error("Error signing message:", err.message);
      return { error: err.message };
    }
  },

  // ----------------- VERIFY -----------------
  verifySignature: async (message: string, signature: string, secret: string) => {
    try {
      const res = await axios.post(`${BASE_URL}/verify-signature`, {
        message,
        signature,
        secret,
      });
      return res.data;
    } catch (err: any) {
      console.error("Error verifying signature:", err.message);
      return { error: err.message };
    }
  },
};
