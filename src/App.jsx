import React, { useEffect, useState } from "react";
import { fetchMe } from "./components/api";
import DriverFlow from "./components/DriverFlow";
import AccountantHome from "./components/AccountantHome";
import Auth from "./pages/Auth";

const API = import.meta.env.VITE_API || "https://tax-i.onrender.com";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("access_token") || "");
  const [me, setMe] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!token) { setMe(null); return; }
    fetchMe(API, token)
      .then(setMe)
      .catch(() => { localStorage.removeItem("access_token"); setToken(""); setMe(null); });
  }, [token]);

  const logout = () => { localStorage.removeItem("access_token"); setToken(""); setMe(null); };
  const onLoggedIn = (tkn) => { localStorage.setItem("access_token", tkn); setToken(tkn); };

  const Topbar = () => (
    <div className="topbar">
      <div className="brand">
        <div className="logo">🧾</div>
        <h1>Tax Intake</h1>
      </div>

      {/* Когда не авторизован — только переключатель темы. */}
      {!me ? (
        <div className="row">
          <button className="secondary" onClick={() => setDark(v => !v)}>{dark ? "Light" : "Dark"}</button>
        </div>
      ) : (
        <div className="row">
          {/* Селектор года только для авторизованных */}
          <select value={year} onChange={(e)=>setYear(Number(e.target.value))}>
            {Array.from({length:3}).map((_,i)=> {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <button className="secondary" onClick={()=>setDark(v=>!v)}>{dark ? "Light" : "Dark"}</button>
          <button onClick={logout}>Logout</button>
        </div>
      )}
    </div>
  );

  return (
    <div className={dark ? "dark" : ""}>
      <div className="app">
        <Topbar />

        {/* Не авторизован → показываем только две опции: Login / Register */}
        {!me && <Auth API={API} onLoggedIn={onLoggedIn} />}

        {/* Авторизован: показываем рабочие кабинеты */}
        {me && me.role === "driver" && (
          <DriverFlow API={API} token={token} me={me} year={year} />
        )}
        {me && me.role === "accountant" && (
          <AccountantHome API={API} token={token} year={year} />
        )}
      </div>
    </div>
  );
}
