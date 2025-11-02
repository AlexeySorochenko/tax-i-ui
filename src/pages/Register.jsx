import React, { useMemo, useState } from "react";
import { login, register } from "../components/api";

export default function Register({ API, onLoggedIn }) {
  const inviteCode = useMemo(() => new URLSearchParams(location.search).get("invite_code") || "", []);
  const [form, setForm] = useState({ email: "", phone: "", first_name: "", last_name: "", patronymic: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const doRegister = async () => {
    setErr(""); setBusy(true);
    try {
      await register(API, form, inviteCode || undefined);
      const tok = await login(API, form.email, form.password);
      localStorage.setItem("access_token", tok.access_token);
      onLoggedIn(tok.access_token);
    } catch (e) {
      setErr(String(awaitExtract(e)));
    } finally { setBusy(false); }
  };

  return (
    <div className="grid" style={{ maxWidth: 520, margin: "24px auto" }}>
      <div className="card">
        <h2>Create account</h2>
        {inviteCode && <div className="hero" style={{marginTop:8}}>
          You are signing up via invite. Your firm link will be created automatically.
        </div>}
        {err && <div className="alert" style={{marginTop:8, wordBreak:"break-all"}}>{err}</div>}
        <div className="kv" style={{marginTop:10}}>
          <div className="k">Email</div><input type="email" value={form.email} onChange={change("email")} placeholder="name@example.com" />
          <div className="k">Phone</div><input value={form.phone} onChange={change("phone")} placeholder="+1 555 123 4567" />
          <div className="k">First name</div><input value={form.first_name} onChange={change("first_name")} />
          <div className="k">Last name</div><input value={form.last_name} onChange={change("last_name")} />
          <div className="k">Middle name</div><input value={form.patronymic} onChange={change("patronymic")} />
          <div className="k">Password</div><input type="password" value={form.password} onChange={change("password")} />
        </div>
        <div className="row" style={{justifyContent:"flex-end", marginTop:12}}>
          <button onClick={doRegister} disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </div>
      </div>
    </div>
  );
}

function awaitExtract(e){
  try{const j = JSON.parse(String(e.message||e)); return j.detail || e.message;}catch{return String(e.message||e);}
}
