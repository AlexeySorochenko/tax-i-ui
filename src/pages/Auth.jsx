import React, { useState } from "react";
import { login, register } from "../components/api";

/**
 * Экран аутентификации с двумя вкладками.
 * Регистрация отправляет расширенную схему:
 * { email, phone, first_name, last_name, patronymic, password, role: "driver" }
 */
export default function Auth({ API, onLoggedIn, defaultTab = "login" }) {
  const [tab, setTab] = useState(defaultTab); // "login" | "register"

  // Login
  const [lEmail, setLEmail] = useState("");
  const [lPassword, setLPassword] = useState("");

  // Register (расширенные поля)
  const [rEmail, setREmail] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rFirst, setRFirst] = useState("");
  const [rLast, setRLast] = useState("");
  const [rPatr, setRPatr] = useState("");
  const [rPassword, setRPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function doLogin(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setErr("");
    try {
      const tok = await login(API, { email: lEmail, password: lPassword });
      onLoggedIn?.(tok.access_token);
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally { setBusy(false); }
  }

  async function doRegister(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setErr("");
    try {
      await register(API, {
        email: rEmail,
        phone: rPhone,
        first_name: rFirst,
        last_name: rLast,
        patronymic: rPatr,
        password: rPassword,
        role: "driver",
      });
      // автологин
      const tok = await login(API, { email: rEmail, password: rPassword });
      onLoggedIn?.(tok.access_token);
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "24px auto" }}>
      <h2 style={{ marginBottom: 12 }}>Welcome</h2>

      {/* Вкладки рядом */}
      <div className="row" style={{ gap: 8, marginBottom: 12, justifyContent: "center" }}>
        <button
          className={`secondary ${tab === "login" ? "active" : ""}`}
          onClick={() => setTab("login")}
        >
          Login
        </button>
        <button
          className={`secondary ${tab === "register" ? "active" : ""}`}
          onClick={() => setTab("register")}
        >
          Create account
        </button>
      </div>

      {err && <div className="alert" style={{ marginBottom: 10 }}>{err}</div>}

      {tab === "login" ? (
        <form onSubmit={doLogin} className="grid" style={{ gap: 10 }}>
          <div>
            <h4>Email</h4>
            <input
              type="email"
              placeholder="you@example.com"
              value={lEmail}
              onChange={e => setLEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <h4>Password</h4>
            <input
              type="password"
              placeholder="••••••••"
              value={lPassword}
              onChange={e => setLPassword(e.target.value)}
              required
            />
          </div>
          <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
            <div />
            <button className="primary" disabled={busy}>
              {busy ? "Signing in…" : "Login"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={doRegister} className="grid" style={{ gap: 10 }}>
          {/* Имя */}
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <h4>First name</h4>
              <input
                type="text"
                placeholder="John"
                value={rFirst}
                onChange={e => setRFirst(e.target.value)}
                required
              />
            </div>
            <div>
              <h4>Last name</h4>
              <input
                type="text"
                placeholder="Doe"
                value={rLast}
                onChange={e => setRLast(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <h4>Patronymic</h4>
            <input
              type="text"
              placeholder="(optional if your market doesn't use it)"
              value={rPatr}
              onChange={e => setRPatr(e.target.value)}
              required
            />
          </div>

          {/* Контакты */}
          <div>
            <h4>Email</h4>
            <input
              type="email"
              placeholder="you@example.com"
              value={rEmail}
              onChange={e => setREmail(e.target.value)}
              required
            />
          </div>
          <div>
            <h4>Phone</h4>
            <input
              type="tel"
              inputMode="tel"
              placeholder="+1 (555) 000-0000"
              value={rPhone}
              onChange={e => setRPhone(e.target.value)}
              required
            />
          </div>

          {/* Безопасность */}
          <div>
            <h4>Password</h4>
            <input
              type="password"
              placeholder="Minimum 6 chars"
              value={rPassword}
              onChange={e => setRPassword(e.target.value)}
              required
            />
          </div>

          <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
            <button
              type="button"
              className="secondary"
              onClick={() => setTab("login")}
            >
              Back to login
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
