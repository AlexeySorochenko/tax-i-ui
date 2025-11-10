// src/pages/ProfilesHome.jsx
import React, { useEffect, useState } from "react";
import { getProfiles } from "../components/api";

export default function ProfilesHome({ API, token, onNew, onOpen, onLogout }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    getProfiles(API, token).then((x) => { if (alive) setItems(x || []); }).catch(()=>{});
    return () => { alive = false; };
  }, [API, token]);

  return (
    <div style={{maxWidth: 720, margin: "24px auto", padding: "0 12px"}}>
      <div className="row" style={{justifyContent:"space-between", alignItems:"center"}}>
        <h2 style={{margin:0}}>Your profiles</h2>
        <div className="row" style={{gap:8}}>
          <button onClick={onNew}>New profile</button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        {(!items || items.length===0) && <div className="note">No profiles yet.</div>}
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 8 }}>
          {items.map((p) => (
            <div key={`${p.type}-${p.id}`} className="tile" style={{cursor:"pointer"}} onClick={() => onOpen(p.id, p.type)}>
              <div>
                <b>{p.name || "(unnamed)"}</b>
                <div className="note">{p.type === "PERSONAL" ? "Personal" : "Business"}</div>
              </div>
              <div className="note">Open</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3 style={{marginTop:0}}>Actions</h3>
        <div className="row" style={{gap:8, flexWrap:"wrap"}}>
          <button disabled>Recordkeeping (soon)</button>
          <button disabled>Taxes (soon)</button>
          <button disabled>Historic Files (soon)</button>
        </div>
      </div>
    </div>
  );
}
