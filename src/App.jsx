import React, { useEffect, useState } from "react";
import { fetchMe } from "./components/api";
import DriverFlow from "./components/DriverFlow";
import Auth from "./pages/Auth";

const API = import.meta.env.VITE_API || "https://tax-i.onrender.com";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("access_token") || "");
  const [me, setMe] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dark, setDark] = useState(false);
  const [authView, setAuthView] = useState(null); // 'login' | 'register' | null

  useEffect(() => {
    if (!token) { setMe(null); return; }
    fetchMe(API, token)
      .then(setMe)
      .catch(() => { localStorage.removeItem("access_token"); setToken(""); setMe(null); });
  }, [token]);

  const logout = () => { localStorage.removeItem("access_token"); setToken(""); setMe(null); };
  const onLoggedIn = (t) => { localStorage.setItem("access_token", t); setToken(t); setAuthView(null); };

  const Topbar = () => (
    <div className="topbar">
      <div className="brand"><div className="logo">🧾</div><h1>Tax Intake</h1></div>

      {/* неавторизован — только тема */}
      {!me ? (
        <div className="row">
          <button className="secondary" onClick={()=>setDark(v=>!v)}>{dark ? "Light" : "Dark"}</button>
        </div>
      ) : (
        <div className="row">
          {/* выбор года только после входа */}
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

  const Welcome = () => (
    <div className="grid" style={{ maxWidth: 560, margin: "24px auto" }}>
      <div className="card">
        <h2>Welcome</h2>
        <div className="note" style={{marginTop:6}}>Login or create an account to continue.</div>
        <div className="row" style={{gap:12, marginTop:16, flexWrap:"wrap"}}>
          <button onClick={()=>setAuthView("login")}>Login</button>
          <button className="secondary" onClick={()=>setAuthView("register")}>Create account</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={dark ? "dark" : ""}>
      <div className="app">
        <Topbar />
        {!me && (authView ? (
          <Auth API={API} defaultTab={authView} onLoggedIn={onLoggedIn} onBack={()=>setAuthView(null)} />
        ) : <Welcome />)}

        {me && me.role === "driver" && (
          <DriverFlow API={API} token={token} me={me} year={year} />
        )}

        {/* кабинет бухгалтера убран с экрана, чтобы не путать водителя */}
      </div>
    </div>
  );
}
