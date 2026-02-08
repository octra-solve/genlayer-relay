"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

type SignResponse = {
    signature: string;
      error?: string;
      };

type VerifyResponse = {
     valid: boolean;
     message: string;
      };


export default function HomePage() {
  const [prices, setPrices] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [random, setRandom] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [signature, setSignature] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [city, setCity] = useState("London");

  // Fetch Prices
  const fetchPrices = async () => {
    const data = await api.getPrices("usd");
    setPrices(data);
  };

  // Fetch Weather
  const fetchWeather = async () => {
    const data = await api.getWeather(city);
    setWeather(data);
  };

  // Fetch Randomness
  const fetchRandom = async () => {
    const data = await api.getRandom();
    setRandom(data);
  };

  // Sign Message
  const handleSign = async () => {
  const res = (await api.signMessage(message, secret)) as SignResponse;
  if (!res.error) setSignature(res.signature);
        };
  
  // Verify Signature
  const handleVerify = async () => {
  const res = (await api.verifySignature(message, signature, secret)) as VerifyResponse;
  setVerifyResult(res);
        };

  useEffect(() => {
    fetchPrices();
    fetchWeather();
    fetchRandom();
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>GenLayer Relay Dashboard</h1>

      {/* ================= PRICES ================= */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Prices (USD)</h2>
        <button onClick={fetchPrices}>Refresh Prices</button>
        <pre style={{ background: "#f5f5f5", padding: "1rem" }}>
          {JSON.stringify(prices, null, 2)}
        </pre>
      </section>

      {/* ================= WEATHER ================= */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Weather</h2>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
        />
        <button onClick={fetchWeather}>Get Weather</button>
        <pre style={{ background: "#f5f5f5", padding: "1rem" }}>
          {JSON.stringify(weather, null, 2)}
        </pre>
      </section>

      {/* ================= RANDOMNESS ================= */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Randomness</h2>
        <button onClick={fetchRandom}>Get Random Value</button>
        <pre style={{ background: "#f5f5f5", padding: "1rem" }}>
          {JSON.stringify(random, null, 2)}
        </pre>
      </section>

      {/* ================= SIGNATURE ================= */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Sign & Verify Message</h2>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          style={{ width: "100%", marginBottom: "0.5rem" }}
        />
        <input
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Secret"
          style={{ width: "100%", marginBottom: "0.5rem" }}
        />
        <button onClick={handleSign}>Sign Message</button>
        <pre style={{ background: "#f5f5f5", padding: "1rem" }}>
          Signature: {signature}
        </pre>

        <button onClick={handleVerify}>Verify Signature</button>
        <pre style={{ background: "#f5f5f5", padding: "1rem" }}>
          {verifyResult ? JSON.stringify(verifyResult, null, 2) : "Not verified yet"}
        </pre>
      </section>
    </div>
  );
}
