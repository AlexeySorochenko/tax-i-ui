import React, { useState } from "react";
import Login from "./components/Login.jsx";
import Drivers from "./components/Drivers.jsx";
import DriverDetail from "./components/DriverDetail.jsx";
import DriverSelf from "./components/DriverSelf.jsx";
import BusinessPanel from "./components/BusinessPanel.jsx";
import { fetchMe } from "./components/api.js";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null);
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState(null);

  // вкладки в драйверском кабинете
  const [driverTab, setDriverTab] = useState("documents"); // 'documents' | 'business'

  const onLoggedIn = async (tok) => {
    setToken(tok);
    setError(null);
    try {
      const user = await fetchMe(API, tok);
      setMe(user);
      setDriverTab("documents");
    } catch (e) {
      setError(String(e));
    }
  };

  const logout = () => {
    setToken(null);
    setMe(null);
    setDriver(null);
    setError(null);
    setDriverTab("documents");
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="logo">🧾</div>
          <h1>Tax Intake</h1>
        </div>
        <div className="row">
          <span className="note">{API}</span>
          {token && <button className="secondary" onClick={logout}>Logout</button>}
        </div>
      </div>

      {!token && (
        <div className="card">
          <Login API={API} onLoggedIn={onLoggedIn} />
        </div>
      )}

      {token && me?.role === "accountant" && !driver && (
        <div className="grid">
          <div className="card">
            <Drivers API={API} token={token} onPick={(d) => setDriver(d)} />
          </div>
        </div>
      )}

      {token && me?.role === "accountant" && driver && (
        <div className="grid">
          <div className="card">
            <DriverDetail
              API={API}
              token={token}
              driver={driver}
              onBack={() => setDriver(null)}
            />
          </div>
        </div>
      )}

      {token && me?.role === "driver" && (
        <div className="grid">
          {/* переключатель вкладок */}
          <div className="card">
            <div className="row spread">
              <div className="row" style={{ gap: 8 }}>
                <button
                  className={driverTab === "documents" ? "" : "secondary"}
                  onClick={() => setDriverTab("documents")}
                >
                  Documents
                </button>
                <button
                  className={driverTab === "business" ? "" : "secondary"}
                  onClick={() => setDriverTab("business")}
                >
                  Business
                </button>
              </div>
              <span className="badge">{me.email}</span>
            </div>
          </div>

          {driverTab === "documents" && (
            <div className="card">
              <DriverSelf API={API} token={token} me={me} />
            </div>
          )}

          {driverTab === "business" && (
            <BusinessPanel API={API} token={token} me={me} />
          )}
        </div>
      )}

      {error && <div className="alert" style={{ marginTop: 12 }}>{String(error)}</div>}

      <div className="footer">B2B2C SaaS for accounting firms • MVP</div>
    </div>
  );
}
