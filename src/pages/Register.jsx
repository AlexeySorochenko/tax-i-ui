import React, { useMemo, useState } from "react";
import { login, register } from "../components/api";

export default function Register({ API, onLoggedIn }) {
  const inviteCode = useMemo(
    () => new URLSearchParams(location.search).get("invite_code") || "",
    []
  );

  const [form, setForm] = useState({
    email: "",
    phone: "",
    first_name: "",
    last_name: "",
    patronymic: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErr, setFieldErr] = useState({});

  const change = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // phone: оставляем только + и цифры, один ведущий +
  const changePhone = (e) => {
    let v = e.target.value.replace(/[^\d+]/g, "");
    if (!v.startsWith("+")) v = "+" + v.replace(/\+/g, "");
    v = v.slice(0, 16); // + и до 15 цифр
    setForm((f) => ({ ...f, phone: v }));
  };

  const validate = () => {
    const fe = {};
    const emailOk = /\S+@\S+\.\S+/.test(form.email.trim());
    if (!emailOk) fe.email = "Invalid email.";

    const phoneOk = /^\+\d{6,15}$/.test(form.phone);
    if (!phoneOk) fe.phone = "Use international format like +15551234567.";

    if (!form.first_name.trim()) fe.first_name = "First name is required.";
    if (!form.last_name.trim()) fe.last_name = "Last name is required.";

    if (!form.password || form.password.length < 8) {
      fe.password = "Password must be at least 8 characters.";
    }
    setFieldErr(fe);
    return Object.keys(fe).length === 0;
  };

  const doRegister = async () => {
    setErr(""); setFieldErr({});
    if (!validate()) return;

    setBusy(true);
    try {
      // регистрация драйвера
      await register(API, {
        email: form.email.trim(),
        phone: form.phone,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        patronymic: form.patronymic.trim(),
        password: form.password, // min 8 уже проверили
      });

      // логин (ВАЖНО: передаём объект, не 2 аргумента)
      const tok = await login(API, { email: form.email.trim(), password: form.password });
      localStorage.setItem("access_token", tok.access_token);
      onLoggedIn?.(tok.access_token);
    } catch (e) {
      setErr(extractErr(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid" style={{ maxWidth: 520, margin: "24px auto" }}>
      <div className="card">
        <h2>Create account</h2>

        {inviteCode && (
          <div className="hero" style={{ marginTop: 8 }}>
            You are signing up via invite. Your firm link will be created automatically.
          </div>
        )}

        {err && (
          <div className="alert" style={{ marginTop: 8, wordBreak: "break-all" }}>
            {err}
          </div>
        )}

        <div className="kv" style={{ marginTop: 10 }}>
          <div className="k">Email</div>
          <div>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={change("email")}
            />
            {fieldErr.email && <div className="alert" style={{ marginTop: 6 }}>{fieldErr.email}</div>}
          </div>

          <div className="k">Phone</div>
          <div>
            <input
              type="tel"
              inputMode="tel"
              placeholder="+1 555 123 4567"
              value={form.phone}
              onChange={changePhone}
            />
            {fieldErr.phone && <div className="alert" style={{ marginTop: 6 }}>{fieldErr.phone}</div>}
          </div>

          <div className="k">First name</div>
          <div>
            <input value={form.first_name} onChange={change("first_name")} autoComplete="given-name" />
            {fieldErr.first_name && <div className="alert" style={{ marginTop: 6 }}>{fieldErr.first_name}</div>}
          </div>

          <div className="k">Last name</div>
          <div>
            <input value={form.last_name} onChange={change("last_name")} autoComplete="family-name" />
            {fieldErr.last_name && <div className="alert" style={{ marginTop: 6 }}>{fieldErr.last_name}</div>}
          </div>

          <div className="k">Middle name</div>
          <input value={form.patronymic} onChange={change("patronymic")} autoComplete="additional-name" />

          <div className="k">Password</div>
          <div>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={change("password")}
              autoComplete="new-password"
            />
            {fieldErr.password && <div className="alert" style={{ marginTop: 6 }}>{fieldErr.password}</div>}
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={doRegister} disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function extractErr(e) {
  try {
    const j = JSON.parse(String(e.message || e));
    return j.detail || e.message || "Error";
  } catch {
    return String(e.message || e);
  }
}
