// src/pages/Register.jsx
import React, { useState } from "react";
import { register, loginToken } from "../components/api";

export default function Register({ API, onLoggedIn, onBack }) {
  const [identifier, setIdentifier] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const doRegister = async () => {
    setErr("");
    if (p1.length < 6) { setErr("Password must be at least 6 characters"); return; }
    if (p1 !== p2) { setErr("Passwords do not match"); return; }
    setBusy(true);
    try {
      await register(API, { identifier: identifier.trim(), password: p1 });
      const tok = await loginToken(API, identifier.trim(), p1);
      localStorage.setItem("access_token", tok.access_token);
      onLoggedIn(tok.access_token);
    } catch (e) {
      setErr(String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "24px auto" }}>
      <h2>Create account</h2>
      <div className="note" style={{marginTop:6}}>
        One <b>Identifier</b> (Email / SSN-EIN / Phone) + password.
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
          placeholder="Minimum 6 chars"
          value={p1}
          onChange={(e)=>setP1(e.target.value)}
          autoComplete="new-password"
        />
        <div className="k">Re-enter</div>
        <input
          type="password"
          placeholder="Repeat password"
          value={p2}
          onChange={(e)=>setP2(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="row" style={{justifyContent:"space-between", marginTop:12}}>
        <button className="secondary" onClick={onBack} disabled={busy}>Back to login</button>
        <button onClick={doRegister} disabled={busy || !identifier || !p1 || !p2}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </div>
    </div>
  );
}
