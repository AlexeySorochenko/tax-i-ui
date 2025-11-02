import React, { useEffect, useMemo, useState } from "react";
import { fetchMe } from "./components/api";
import DriverHome from "./components/DriverHome";
import AccountantHome from "./components/AccountantHome";
import Onboarding from "./components/Onboarding";

const API = import.meta.env.VITE_API || "https://tax-i.onrender.com";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("access_token") || "");
  const [me, setMe] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState("auto"); // auto → choose based on role
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetchMe(API, token)
      .then((m) => { if (alive) setMe(m); })
      .catch(() => { localStorage.removeItem("access_token"); setToken(""); setMe(null); });
    return () => { alive = false; };
  }, [token]);

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken("");
    setMe(null);
  };

  const roleTab = useMemo(() => {
    if (!me) return "login";
    if (me.role === "driver") return "driver";
    if (me.role === "accountant") return "accountant";
    return "login";
  }, [me]);

  const effectiveTab = tab === "auto" ? roleTab : tab;

  if (!me) {
    return (
      <div className={dark ? "dark" : ""}>
        <div className="app">
          <div className="topbar">
            <div className="brand"><div className="logo">🧾</div><h1>Tax Intake</h1></div>
            <div className="row">
              <button className="secondary" onClick={() => setDark(v => !v)}>{dark ? "Light" : "Dark"}</button>
            </div>
          </div>
          <div className="grid">
            <div className="card">
              <h2>You're not logged in</h2>
              <div className="note">Open the login page of your backend UI and sign in. This frontend reads the token from localStorage.</div>
              <div className="divider"></div>
              <div className="kv">
                <div className="k">Token</div>
                <input placeholder="Paste access token here…" onChange={(e)=>{localStorage.setItem("access_token", e.target.value); setToken(e.target.value);}} />
                <div className="k">API</div>
                <div>{API}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={dark ? "dark" : ""}>
      <div className="app">
        <div className="topbar">
          <div className="brand">
            <div className="logo">🧾</div>
            <div>
              <h1>Tax Intake</h1>
              <div className="note">{API}</div>
            </div>
          </div>
          <div className="row">
            <select value={year} onChange={(e)=>setYear(Number(e.target.value))}>
              {Array.from({length:3}).map((_,k)=> {
                const y = new Date().getFullYear() - k;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <button className="secondary" onClick={() => setDark(v=>!v)}>{dark ? "Light" : "Dark"}</button>
            <button onClick={logout}>Logout</button>
          </div>
        </div>

        {/* навигация по ролям */}
        {effectiveTab === "driver" && (
          <DriverHome API={API} token={token} me={me} year={year} />
        )}
        {effectiveTab === "accountant" && (
          <AccountantHome API={API} token={token} year={year} />
        )}

        {/* онбординг для водителя без связки/профиля */}
        {effectiveTab === "driver" && (
          <Onboarding API={API} token={token} me={me} />
        )}
      </div>
    </div>
  );
}
