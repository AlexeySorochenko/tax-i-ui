import React, { useEffect, useState } from "react";
import { fetchMe, login } from "./components/api";
import DriverFlow from "./components/DriverFlow";
import AccountantHome from "./components/AccountantHome";
import Register from "./pages/Register";

const API = import.meta.env.VITE_API || "https://tax-i.onrender.com";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("access_token") || "");
  const [me, setMe] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState("auto"); // auto | register | driver | accountant

  useEffect(() => {
    if (!token) { setMe(null); return; }
    fetchMe(API, token).then(setMe).catch(()=>{ localStorage.removeItem("access_token"); setToken(""); });
  }, [token]);

  useEffect(() => {
    if (!me) return;
    setMode(me.role === "driver" ? "driver" : me.role === "accountant" ? "accountant" : "driver");
  }, [me]);

  const logout = () => { localStorage.removeItem("access_token"); setToken(""); setMe(null); };
  const onLoggedIn = (t) => { setToken(t); };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="app">
        <div className="topbar">
          <div className="brand"><div className="logo">🧾</div><h1>Tax Intake</h1></div>
          <div className="row">
            <select value={year} onChange={(e)=>setYear(Number(e.target.value))}>
              {Array.from({length:3}).map((_,i)=> {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <button className="secondary" onClick={()=>setDark(v=>!v)}>{dark ? "Light" : "Dark"}</button>
            {me ? <button onClick={logout}>Logout</button> : (
              <button onClick={async ()=>{
                const email = prompt("Email"); if(!email) return;
                const password = prompt("Password"); if(!password) return;
                const tok = await login(API, email, password);
                localStorage.setItem("access_token", tok.access_token);
                setToken(tok.access_token);
              }}>Login</button>
            )}
          </div>
        </div>

        {!me && mode !== "register" && (
          <div className="grid">
            <div className="card">
              <h2>Welcome</h2>
              <div className="note">Login or create an account to continue.</div>
              <div className="row" style={{marginTop:10}}>
                <button onClick={()=>setMode("register")}>Create account</button>
              </div>
              <div className="divider"></div>
              <div className="kv"><div className="k">API</div><div>{API}</div></div>
            </div>
          </div>
        )}

        {!me && mode === "register" && <Register API={API} onLoggedIn={onLoggedIn} />}

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
