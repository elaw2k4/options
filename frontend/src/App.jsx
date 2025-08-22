import { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  const [units, setUnits] = useState(5);
  const [buyPrice, setBuyPrice] = useState(2.5);
  const [mode, setMode] = useState("price");
  const [currentPrice, setCurrentPrice] = useState(4);
  const [percent, setPercent] = useState(60);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    if (!units || !buyPrice) return false;
    if (mode === "price") return currentPrice > 0;
    return percent !== null && percent !== undefined;
  }, [units, buyPrice, mode, currentPrice, percent]);

  async function run() {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const body = {
        units: Number(units),
        buy_price: Number(buyPrice),
        ...(mode === "price"
          ? { current_price: Number(currentPrice) }
          : { percent_increase: Number(percent) }),
      };
      const res = await fetch(`${API_BASE}/pnl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px" }}>
      <h1>Options P&L Calculator</h1>
      <div style={{ marginBottom: "10px" }}>
        <label>Units: </label>
        <input type="number" value={units} onChange={e=>setUnits(e.target.value)} />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Buy Price: </label>
        <input type="number" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} />
      </div>
      <div>
        <label>
          <input type="radio" checked={mode==="price"} onChange={()=>setMode("price")} />
          Current Price
        </label>
        <label style={{marginLeft: "10px"}}>
          <input type="radio" checked={mode==="percent"} onChange={()=>setMode("percent")} />
          % Change
        </label>
      </div>
      {mode === "price" ? (
        <div>
          <label>Current Price: </label>
          <input type="number" value={currentPrice} onChange={e=>setCurrentPrice(e.target.value)} />
        </div>
      ) : (
        <div>
          <label>% Change: </label>
          <input type="number" value={percent} onChange={e=>setPercent(e.target.value)} />
        </div>
      )}
      <button onClick={run} disabled={!canSubmit || loading}>
        {loading ? "Calculating..." : "Calculate"}
      </button>
      {error && <div style={{color: "red"}}>{error}</div>}
      {data && (
        <div style={{marginTop: "20px"}}>
          <h2>Results</h2>
          <div>Total Cost: ${data.total_cost}</div>
          <div>Break-even unit: {data.break_even_unit ?? "Not reached"}</div>
          <table border="1" cellPadding="5" style={{marginTop: "10px"}}>
            <thead><tr><th>Sold</th><th>Revenue</th><th>Total Cost</th><th>P&L</th></tr></thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.sold}>
                  <td>{r.sold}</td>
                  <td>${r.revenue}</td>
                  <td>${r.total_cost}</td>
                  <td style={{color: r.pnl >= 0 ? 'green' : 'red'}}>${r.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
