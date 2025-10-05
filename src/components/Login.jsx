import React, { useState } from "react";

export default function Login({ API, onLoggedIn }) {
  const [email, setEmail] = useState("acc@example.com");
  const [password, setPassword] = useState("pwd");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      await onLoggedIn(data.access_token);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    setBusy(true);
    setError(null);
    try {
      const fallbackName = (email || "").split("@")[0] || "User";
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: fallbackName,
          password,
          role: "accountant",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("Registered. Now sign in.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Sign in</h2>
      <div className="row">
        <input
          placeholder="Email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <input
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ minWidth: 200 }}
        />
      </div>
      <div className="row right" style={{ marginTop: 12 }}>
        <button onClick={login} disabled={busy || !email || !password}>Sign in</button>
        {/* если регистрации на бэке нет — удалите кнопку ниже */}
        <button className="secondary" onClick={register} disabled={busy || !email || !password}>
          Register
        </button>
      </div>
      {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
