import { useEffect, useState } from "react";
import type { SignResponse, PriceData, VerifyResponse, PriceOptions } from "../lib/api";
import { api } from "../lib/api";
import { premiumApi } from "./premium/premiumApi";
import SearchableDropdown from "./components/SearchableDropdown";
import "./App.css";
import { cryptoSymbolMap } from "./lib/cryptoMap";

function App() {
  const [price, setPrice] = useState<string>(""); 
  const [weather, setWeather] = useState<string>(""); 
  const [random, setRandom] = useState<string>(""); 
  const [message, setMessage] = useState(""); 
  const [secret, setSecret] = useState(""); 
  const [signature, setSignature] = useState(""); 
  const [verifyResult, setVerifyResult] = useState<string>(""); 
  const [premiumData, setPremiumData] = useState<string>(""); 
  const [priceOptions, setPriceOptions] = useState<PriceOptions | null>(null);
  const [crypto, setCrypto] = useState(""); 
  const [fx, setFx] = useState(""); 
  const [stocks, setStocks] = useState(""); 

  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [loadingSign, setLoadingSign] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingPremium, setLoadingPremium] = useState(false);
  const [city, setCity] = useState("London");

  const [lastPriceResponse, setLastPriceResponse] = useState<PriceData | null>(null)

  useEffect(() => { fetchPriceOptions(); }, []);

  const fetchPriceOptions = async () => {
    const options = await api.getPriceOptions();
    setPriceOptions(options);
  };

  /* -------------------------------------------------
   *  PRICE FETCHING LOGIC
   * ------------------------------------------------- */
const fetchPrice = async () => {
  setLoadingPrices(true)
  setPrice("")
  setLastPriceResponse(null)

  try {
  // -------------------------
  // Determine base & quote
  // -------------------------
  let base = crypto || stocks || fx
  let quote = "USD"

  if (stocks) quote = fx || "USD"
  else if (crypto) quote = fx || "USD"
  else if (fx) quote = fx

  if (!base || !quote) {
  setPrice("Please select a valid asset and quote")
  setLoadingPrices(false)
  return
  }
 const normalizedBase = cryptoSymbolMap[base.toUpperCase()] || base.toUpperCase()
  // -------------------------
  // Fetch price from API
  // -------------------------
 const res = await api.getPrice(normalizedBase, quote.toUpperCase())

  setLastPriceResponse(res.data) 

  // -------------------------
  // Display logic
  // -------------------------
  const displayPrice = res.data?.price ?? null

  if (displayPrice === null) {
  setPrice("Price not available ❌")
  } else {
  setPrice(`${base.toUpperCase()}/${quote.toUpperCase()}: ${displayPrice} - - -`)
  }
  } catch (err) {
  console.error(" FETCH ERROR:", err)
  setPrice("Failed to fetch price ⚠️")
  }

  setLoadingPrices(false)
  }

  /* -------------------------------------------------
   * WEATHER
   * ------------------------------------------------- */
  const fetchWeather = async () => {
    setLoadingWeather(true);
    const data = await api.getWeather(city);
    if (data?.status === "ok" && data.data?.main) {
      const t = data.data.main.temp;
      const f = data.data.main.feels_like;
      const desc = data.data.weather?.[0]?.description || "";
      setWeather(`${city}: ${t}°C (feels like ${f}°C) - ${desc}`);
    } else { setWeather("Weather info not available"); }
    setLoadingWeather(false);
  };

  /* -------------------------------------------------
   * RANDOM
   * ------------------------------------------------- */
  const fetchRandom = async () => {
    setLoadingRandom(true);
    const data = await api.getRandom();
    setRandom(data?.status === "ok" ? `${data.random}` : "Failed to fetch random");
    setLoadingRandom(false);
  };

  /* -------------------------------------------------
   * SIGN & VERIFY
   * ------------------------------------------------- */
  const handleSign = async () => {
    setLoadingSign(true);
    const res: SignResponse = await api.signMessage(message, secret);
    setSignature(res?.signature || "Signing failed");
    setLoadingSign(false);
  };

  const handleVerify = async () => {
    setLoadingVerify(true);
    const res: VerifyResponse = await api.verifySignature(message, signature, secret);
    setVerifyResult(res?.valid ? " Signature valid" : "Signature invalid");
    setLoadingVerify(false);
  };

  /* -------------------------------------------------
   * PREMIUM DATA
   * ------------------------------------------------- */
  const fetchPremium = async () => {
    setLoadingPremium(true);
    try { 
      const data = await premiumApi.getPremiumData(); 
      setPremiumData(JSON.stringify(data, null, 2)); 
    } catch { 
      setPremiumData("C'mon buddy..Stay tuned. how fast do you want it 😯"); 
    }
    setLoadingPremium(false);
  };

  /* -------------------------------------------------
   * COPY TO CLIPBOARD
   * ------------------------------------------------- */
  const copyPrice = () => {
    if (price) navigator.clipboard.writeText(price);
  };

  return (
    <div className="app-wrapper">
      <div className="page-container">
        <h1>GenLayer Relay Dashboard </h1>

        {/* Prices */}
        <section className="price-section">
          <h2>💰 Prices</h2>
          <div className="controlled-row centered-row premium-dropdowns">
            <SearchableDropdown 
              options={priceOptions?.crypto || []} 
              value={crypto} 
              onChange={val => { setCrypto(val); setStocks(""); }}
              placeholder="Crypto"
              disabled={!!stocks}
            />
            <SearchableDropdown 
              options={priceOptions?.fx || []} 
              value={fx} 
              onChange={setFx} 
              placeholder="Stable / FX" 
              disabled={!!stocks}
            />
            <SearchableDropdown 
              options={priceOptions?.stocks || []} 
              value={stocks} 
              onChange={val => { setStocks(val); setCrypto(""); setFx("USD"); }}
              placeholder="Stocks"
            />
            <button onClick={fetchPrice} disabled={loadingPrices}>
              {loadingPrices ? "Loading..." : "Get Price"}
            </button>
            {price && <button onClick={copyPrice} className="copy-btn">📋 Copy</button>}
          </div>
     <div className="result-display price-result">
     {price}

     {lastPriceResponse && (
     <div
     className="price-details"
     style={{
     textAlign: "left",
     margin: 0,
     padding: 0
     }}
     >
     {Object.entries(lastPriceResponse).map(([key, value]) => {

     if (typeof value === "object" && value !== null) {
     return (
     <div key={key} style={{ margin: 0, padding: 0 }}>
     <div style={{ fontWeight: "bold" }}>{key}:</div>

     {Object.entries(value).map(([subKey, subValue]) => (
     <div key={subKey} style={{ margin: 0, padding: 0 }}>
     {subKey}:{" "}
     {typeof subValue === "number"
     ? subValue.toLocaleString()
     : String(subValue)}
     </div>
     ))}
     </div>
     )
     }

     return (
     <div key={key} style={{ margin: 0, padding: 0 }}>
     <strong>{key}:</strong>{" "}
     {typeof value === "number"
     ? value.toLocaleString()
     : String(value)}
     </div>
     )
     })}
     </div>
     )}
     </div>
     </section>

        {/* Weather */}
        <section>
          <h2>☀️ Weather</h2>
          <div className="controlled-row">
            <input type="text" value={city} onChange={e=>setCity(e.target.value)} placeholder="City"/>
            <button onClick={fetchWeather} disabled={loadingWeather}>
              {loadingWeather ? "Loading..." : "Get Weather"}
            </button>
          </div>
          <div className="result-display">{weather}</div>
        </section>

        {/* Random */}
        <section>
          <h2>🎲 Random</h2>
          <button onClick={fetchRandom} disabled={loadingRandom}>
            {loadingRandom ? "Loading..." : "Get Random"}
          </button>
          <div className="result-display">{random}</div>
        </section>

        {/* Sign & Verify */}
        <section>
          <h2>✍️ Sign & Verify</h2>
          <div className="controlled-row">
            <input type="text" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Message"/>
            <input type="text" value={secret} onChange={e=>setSecret(e.target.value)} placeholder="Secret"/>
            <button onClick={handleSign} disabled={loadingSign}>
              {loadingSign ? "Signing..." : "Sign"}
            </button>
          </div>
          <div className="result-display">{signature}</div>
          <button onClick={handleVerify} disabled={loadingVerify}>
            {loadingVerify ? "Verifying..." : "Verify"}
          </button>
          <div className="result-display">{verifyResult}</div>
        </section>

        {/* Premium */}
        <section className="premium-section">
          <h2>💎 Premium</h2>
          <button onClick={fetchPremium} disabled={loadingPremium}>
            {loadingPremium ? "Loading..." : "Stay Tuned"}
          </button>
          <div className="result-display">{premiumData}</div>
        </section>
      </div>
    </div>
  );
}

export default App;
