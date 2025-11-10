// src/pages/Auth.jsx
import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";

export default function Auth({ API, onLoggedIn }) {
  const [tab, setTab] = useState("login");
  return (
    <div style={{ maxWidth: 480, margin: "32px auto" }}>
      <div className="row" style={{ gap: 8, justifyContent:"center", marginBottom:12 }}>
        <button className={tab==="login" ? "active" : ""} onClick={()=>setTab("login")}>Login</button>
        <button className={tab==="register" ? "active" : ""} onClick={()=>setTab("register")}>Create account</button>
      </div>
      {tab==="login"
        ? <Login API={API} onLoggedIn={onLoggedIn} />
        : <Register API={API} onLoggedIn={onLoggedIn} onBack={()=>setTab("login")} />
      }
    </div>
  );
}
