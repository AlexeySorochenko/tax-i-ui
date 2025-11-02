import React, { useState } from "react";
import { login, register } from "../components/api";

export default function Auth({ API, onLoggedIn, defaultTab = "login" }) {
  const [tab, setTab] = useState(defaultTab); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // для регистрации
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const doLogin = async (e) => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setErr("");
    try {
      const tok = await login(API, { email, password });
      onLoggedIn?.(tok.access_token);
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally { setBusy(false); }
  };

  const doRegister = async (e) => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setErr("");
    try {
      if (!name.trim()) { setErr("Please enter your name"); setBusy(false); return; }
      await register(API, { email, name: name.trim(), password, role: "driver" });
      // после успешной регистрации сразу логинимся
      const tok = await login(API, { email, password });
      onLoggedIn?.(tok.access_token);
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally { setBusy(false); }
  };

  return (
    <div className="card" style={{ maxWidth: 460, margin: "24px auto" }}>
      <h2 style={{ marginBottom: 12 }}>Welcome</h2>

      <div className="tabbar" style={{ marginBottom: 12 }}>
        <button className={`secondary ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Login</button>
        <button className={`secondary ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Create account</button>
      </div>

      {err && <div className="alert" style={{ marginBottom: 10 }}>{err}</div>}

      {tab === "login" ? (
        <form onSubmit={doLogin} className="grid" style={{ gap: 10 }}>
          <div>
            <h4>Email</h4>
            <input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <h4>Password</h4>
            <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="primary" disabled={busy}>{busy ? "Signing in…" : "Login"}</button>
          </div>
        </form>
      ) : (
        <form onSubmit={doRegister} className="grid" style={{ gap: 10 }}>
          <div>
            <h4>Name</h4>
            <input type="text" placeholder="John Driver" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div>
            <h4>Email</h4>
            <input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <h4>Password</h4>
            <input type="password" placeholder="Minimum 6 chars" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="primary" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
