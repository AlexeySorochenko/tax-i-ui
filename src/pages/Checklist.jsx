// src/pages/Checklist.jsx
import React, { useEffect, useState } from "react";
import { getRequirements, uploadToRequirement } from "../components/api";

export default function Checklist({ API, token, profileId, profileType, onDone, onBack }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const list = await getRequirements(API, token, profileId, profileType);
      setItems(list || []);
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [API, token, profileId, profileType]);

  const pickFile = (reqId) => async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      await uploadToRequirement(API, token, reqId, f);
      await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const allUploaded = items.length>0 && items.every(i => i.status !== "missing");

  return (
    <div style={{maxWidth:720, margin:"24px auto", padding:"0 12px"}}>
      <div className="card">
        <h2 style={{marginTop:0}}>Verify the new profile</h2>
        <div className="note">Profile type: <b>{profileType}</b>. Upload the required documents.</div>
        {err && <div className="alert" style={{marginTop:8}}>{err}</div>}

        <div className="grid" style={{gridTemplateColumns:"1fr", gap:8, marginTop:12}}>
          {items.map((r) => (
            <div key={r.id} className="tile">
              <div>
                <b>{r.document_type_code}</b>
                <div className="note">Status: {r.status}</div>
              </div>
              <label className={`button ${busy?"disabled":""}`} style={{cursor:"pointer"}}>
                <input type="file" style={{display:"none"}} onChange={pickFile(r.id)} disabled={busy}/>
                Upload
              </label>
            </div>
          ))}
        </div>

        <div className="row" style={{justifyContent:"space-between", marginTop:12}}>
          <button onClick={onBack}>Back</button>
          <button className="primary" onClick={onDone} disabled={!allUploaded}>Done</button>
        </div>
      </div>
    </div>
  );
}
