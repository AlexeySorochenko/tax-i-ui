import React, { useState } from "react";
import Login from "./components/Login.jsx";
import Drivers from "./components/Drivers.jsx";
import DriverDetail from "./components/DriverDetail.jsx";
import DriverSelf from "./components/DriverSelf.jsx";
import BusinessPanel from "./components/BusinessPanel.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import { fetchMe } from "./components/api.js";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null);
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState(null);

  const [driverTab, setDriverTab] = useState("intro"); // intro | documents | business

  const onLoggedIn = async (tok) => {
    setToken(tok);
    setError(null);
    try {
      const user = await fetchMe(API, tok);
      setMe(user);
      setDriverTab(user.role === "driver" ? "intro" : "documents");
    } catch (e) {
      setError(String(e));
    }
  };

  const logout = () => {
    setToken(null); setMe(null); setDriver(null); setError(null); setDriverTab("intro");
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="logo">🧾</div>
          <h1>Tax Intake</h1>
        </div>
        <div className="row">
          <ThemeToggle />
          <span className="note">{API}</span>
          {token && <button className="secondary" onClick={logout}>Logout</button>}
        </div>
      </div>

      {!token && <div className="card"><Login API={API} onLoggedIn={onLoggedIn} /></div>}

      {token && me?.role === "accountant" && !driver && (
        <div className="grid"><div className="card"><Drivers API={API} token={token} onPick={(d) => setDriver(d)} /></div></div>
      )}
      {token && me?.role === "accountant" && driver && (
        <div className="grid"><div className="card"><DriverDetail API={API} token={token} driver={driver} onBack={() => setDriver(null)} /></div></div>
      )}

      {token && me?.role === "driver" && (
        <div className="grid">
          {/* intro hero */}
          {driverTab === "intro" && (
            <div className="card hero">
              <h2 style={{marginTop:0}}>Welcome, {me.email}</h2>
              <p className="note">Step 1 — upload your required documents. Step 2 — answer a few questions about business expenses.</p>
              <div className="tilegrid" style={{marginTop:8}}>
                <div className="tile">
                  <div><h3>Documents</h3><div className="note">Personal & tax documents</div></div>
                  <button className="primary" onClick={() => setDriverTab("documents")}>Open</button>
                </div>
                <div className="tile">
                  <div><h3>Business</h3><div className="note">Guided expense interview</div></div>
                  <button className="primary" onClick={() => setDriverTab("business")}>Open</button>
                </div>
              </div>
            </div>
          )}

          {/* tabs */}
          {driverTab !== "intro" && (
            <div className="card">
              <div className="row spread">
                <div className="tabbar">
                  <button className={driverTab === "documents" ? "active" : ""} onClick={() => setDriverTab("documents")}>Documents</button>
                  <button className={driverTab === "business" ? "active" : ""} onClick={() => setDriverTab("business")}>Business</button>
                </div>
                <span className="badge">{me.email}</span>
              </div>
            </div>
          )}

          {driverTab === "documents" && (<div className="card"><DriverSelf API={API} token={token} me={me} /></div>)}
          {driverTab === "business" && (<BusinessPanel API={API} token={token} me={me} />)}
        </div>
      )}

      {error && <div className="alert" style={{ marginTop: 12 }}>{String(error)}</div>}

      <div className="footer" />
    </div>
  );
}
