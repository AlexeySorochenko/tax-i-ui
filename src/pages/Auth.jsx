import React, { useState } from "react";
import { login, register } from "../components/api";

export default function Auth({ API, onLoggedIn }) {
  const [tab, setTab] = useState("login"); // 'login' | 'register'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // --- Login form ---
  const [lemail, setLEmail] = useState("");
  const [lpass, setLPass] = useState("");

  // --- Register form ---
  const [r, setR] = useState({
    email: "", phone: "", first_name: "", last_name: "", patronymic: "", password: ""
  });

  const doLogin = async () => {
    setErr(""); setBusy(true);
    try {
      const tok = await login(API, lemail.trim(), lpass);
      onLoggedIn(tok.access_token);
    } catch (e) {
      setErr(extractErr(e));
    } finally { setBusy(false); }
  };

  const doRegister = async () => {
    setErr(""); setBusy(true);
    try {
      await register(API, r, new URLSearchParams(location.search).get("invite_code") || undefined);
      const tok = await login(API, r.email.trim(), r.password);
      onLoggedIn(tok.access_token);
    } catch (e) {
      setErr(extractErr(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="grid" style={{ maxWidth: 520, margin: "24px auto" }}>
      <div className="card">
        <div className="tabbar" style={{marginBottom:12}}>
          <button className={tab==="login"?"active":""} onClick={()=>setTab("login")}>Login</button>
          <button className={tab==="register"?"active":""} onClick={()=>setTab("register")}>Register</button>
        </div>

        {err && <div className="alert" style={{marginBottom:12, wordBreak:"break-all"}}>{err}</div>}

        {tab === "login" ? (
          <>
            <div className="kv">
              <div className="k">Email</div>
              <input type="email" placeholder="name@example.com" value={lemail} onChange={e=>setLEmail(e.target.value)} />
              <div className="k">Password</div>
              <input type="password" placeholder="••••••••" value={lpass} onChange={e=>setLPass(e.target.value)} />
            </div>
            <div className="row" style={{justifyContent:"flex-end", marginTop:12}}>
              <button onClick={doLogin} disabled={busy || !lemail || !lpass}>{busy ? "Signing in…" : "Login"}</button>
            </div>
          </>
        ) : (
          <>
            <div className="kv">
              <div className="k">Email</div>
              <input type="email" value={r.email} onChange={e=>setR(s=>({...s, email:e.target.value}))} placeholder="name@example.com" />
              <div className="k">Phone</div>
              <input value={r.phone} onChange={e=>setR(s=>({...s, phone:e.target.value}))} placeholder="+1 555 123 4567" />
              <div className="k">First name</div>
              <input value={r.first_name} onChange={e=>setR(s=>({...s, first_name:e.target.value}))} />
              <div className="k">Last name</div>
              <input value={r.last_name} onChange={e=>setR(s=>({...s, last_name:e.target.value}))} />
              <div className="k">Middle name</div>
              <input value={r.patronymic} onChange={e=>setR(s=>({...s, patronymic:e.target.value}))} />
              <div className="k">Password</div>
              <input type="password" value={r.password} onChange={e=>setR(s=>({...s, password:e.target.value}))} />
            </div>
            <div className="row" style={{justifyContent:"flex-end", marginTop:12}}>
              <button onClick={doRegister} disabled={busy || !r.email || !r.password}>{busy ? "Creating…" : "Create account"}</button>
            </div>
          </>
        )}

        <div className="note" style={{marginTop:12}}>
          API: {API}
        </div>
      </div>
    </div>
  );
}

function extractErr(e){
  try{const j = JSON.parse(String(e.message||e)); return j.detail || e.message;}catch{return String(e.message||e);}
}
