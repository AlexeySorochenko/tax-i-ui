// src/pages/Login.jsx
import React, { useState } from "react";
import { loginToken } from "../components/api";

export default function Login({ API, onLoggedIn }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const doLogin = async () => {
    setErr(""); setBusy(true);
    try {
      const tok = await loginToken(API, identifier.trim(), password);
      localStorage.setItem("access_token", tok.access_token);
      onLoggedIn(tok.access_token);
    } catch (e) {
      setErr(String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "24px auto" }}>
      <h2>Login</h2>
      <div className="note" style={{marginTop:6}}>
        Use <b>Email</b>, <b>SSN/EIN</b> (9 digits) or <b>Phone</b>.
      </div>
      {err && <div className="alert" style={{marginTop:8, wordBreak:"break-all"}}>{err}</div>}
      <div className="kv" style={{marginTop:12}}>
        <div className="k">Identifier</div>
        <input
          placeholder="email • 123456789 • +1 555 123 4567"
          value={identifier}
          onChange={(e)=>setIdentifier(e.target.value)}
          autoComplete="username"
        />
        <div className="k">Password</div>
        <input
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="row" style={{justifyContent:"flex-end", marginTop:12}}>
        <button onClick={doLogin} disabled={busy || !identifier || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
