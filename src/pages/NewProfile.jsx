// src/pages/NewProfile.jsx
import React, { useState } from "react";
import { createPersonalProfile, createBusinessProfile } from "../components/api";

export default function NewProfile({ API, token, onCreated, onCancel }) {
  const [mode, setMode] = useState("PERSONAL"); // PERSONAL | BUSINESS
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // формы
  const [pf, setPf] = useState({
    first_name: "", last_name: "", ssn: "", date_of_birth: "", phone_number: "",
    contact_email: "", mailing_address: "", marital_status: "", number_of_dependents: 0
  });

  const [bf, setBf] = useState({
    ein: "", business_name: "", mailing_address: "", business_phone: "",
    business_email: "", industry_code: "" // "Taxi driver" | "Truck driver"
  });

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      if (mode === "PERSONAL") {
        // минимальный набор: first/last + (остальное optional)
        if (!pf.first_name || !pf.last_name) throw new Error("Please fill first and last name.");
        const payload = {
          ...pf,
          number_of_dependents: Number(pf.number_of_dependents || 0) || 0,
          marital_status: pf.marital_status || null
        };
        const created = await createPersonalProfile(API, token, payload);
        onCreated(created.id, "PERSONAL");
      } else {
        if (!bf.business_name) throw new Error("Please fill business name.");
        const payload = { ...bf, industry_code: bf.industry_code || null };
        const created = await createBusinessProfile(API, token, payload);
        onCreated(created.id, "BUSINESS");
      }
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{maxWidth: 720, margin: "24px auto", padding:"0 12px"}}>
      <div className="card">
        <h2 style={{marginTop:0}}>Create a new profile</h2>

        <div className="row" style={{gap:8, margin:"8px 0"}}>
          <button className={mode==="PERSONAL"?"primary":""} onClick={()=>setMode("PERSONAL")}>Personal / SSN</button>
          <button className={mode==="BUSINESS"?"primary":""} onClick={()=>setMode("BUSINESS")}>Business / EIN</button>
        </div>

        {err && <div className="alert" style={{marginTop:8}}>{err}</div>}

        {mode === "PERSONAL" ? (
          <div className="kv" style={{marginTop:12}}>
            <div className="k">First name</div><input value={pf.first_name} onChange={e=>setPf(p=>({...p, first_name:e.target.value}))} />
            <div className="k">Last name</div><input value={pf.last_name} onChange={e=>setPf(p=>({...p, last_name:e.target.value}))} />
            <div className="k">SSN</div><input inputMode="numeric" placeholder="123456789" value={pf.ssn} onChange={e=>setPf(p=>({...p, ssn:e.target.value.replace(/\D+/g,"").slice(0,9)}))} />
            <div className="k">DOB</div><input type="date" value={pf.date_of_birth} onChange={e=>setPf(p=>({...p, date_of_birth:e.target.value}))} max={new Date().toISOString().slice(0,10)} />
            <div className="k">Phone</div><input value={pf.phone_number} onChange={e=>setPf(p=>({...p, phone_number:e.target.value}))} />
            <div className="k">Email</div><input type="email" value={pf.contact_email} onChange={e=>setPf(p=>({...p, contact_email:e.target.value}))} />
            <div className="k">Mailing address</div><input value={pf.mailing_address} onChange={e=>setPf(p=>({...p, mailing_address:e.target.value}))} />
            <div className="k">Marital status</div>
            <select value={pf.marital_status} onChange={e=>setPf(p=>({...p, marital_status:e.target.value}))}>
              <option value="">— choose —</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
            </select>
            <div className="k">Dependents</div>
            <select value={pf.number_of_dependents} onChange={e=>setPf(p=>({...p, number_of_dependents:e.target.value}))}>
              {Array.from({length:10}, (_,i)=><option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        ) : (
          <div className="kv" style={{marginTop:12}}>
            <div className="k">Business name</div><input value={bf.business_name} onChange={e=>setBf(p=>({...p, business_name:e.target.value}))} />
            <div className="k">EIN</div><input inputMode="numeric" placeholder="9 digits" value={bf.ein} onChange={e=>setBf(p=>({...p, ein:e.target.value.replace(/\D+/g,"").slice(0,9)}))} />
            <div className="k">Mailing address</div><input value={bf.mailing_address} onChange={e=>setBf(p=>({...p, mailing_address:e.target.value}))} />
            <div className="k">Business phone</div><input value={bf.business_phone} onChange={e=>setBf(p=>({...p, business_phone:e.target.value}))} />
            <div className="k">Business email</div><input type="email" value={bf.business_email} onChange={e=>setBf(p=>({...p, business_email:e.target.value}))} />
            <div className="k">Industry</div>
            <select value={bf.industry_code} onChange={e=>setBf(p=>({...p, industry_code:e.target.value}))}>
              <option value="">— choose —</option>
              <option value="Taxi driver">Taxi driver</option>
              <option value="Truck driver">Truck driver</option>
            </select>
          </div>
        )}

        <div className="row" style={{justifyContent:"flex-end", gap:8, marginTop:12}}>
          <button onClick={onCancel}>Back</button>
          <button className="primary" onClick={submit} disabled={busy}>{busy?"Creating…":"Create & continue"}</button>
        </div>
      </div>
    </div>
  );
}
