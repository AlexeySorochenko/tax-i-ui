import React, { useEffect, useState } from "react";
import { listFirms, selectFirm, getPersonal, putPersonal } from "./api";

export default function Onboarding({ API, token, me, initialStep=1, onDone }) {
  const [firms, setFirms] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [profile, setProfile] = useState(null);
  const [step, setStep] = useState(initialStep); // 1 marketplace, 2 profile, 3 done
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listFirms(API, token).then((x)=>{ if (alive) setFirms(x||[]); }).catch(()=>{});
    getPersonal(API, token, me.id).then((p)=>{ if (alive) setProfile(p||{}); }).catch(()=>{});
    return () => { alive=false; };
  }, []); // eslint-disable-line

  const pickFirm = async (firm) => {
    setBusy(true);
    try {
      await selectFirm(API, token, firm.id);
      setChosen(firm);
      setStep(2);
    } catch (e) {
      alert("Failed to select firm");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await putPersonal(API, token, me.id, profile || {});
      setStep(3);
    } catch (e) {
      alert("Failed to save profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid">
      {step === 1 && (
        <div className="card">
          <h2>Choose your accounting firm</h2>
          <div className="note">Pick a firm to work with. You can change later.</div>
          <div className="tilegrid" style={{marginTop:12}}>
            {(firms||[]).map((f)=>(
              <div key={f.id} className="tile">
                <div>
                  <b>{f.name}</b>
                  <div className="note">{f.description || "—"}</div>
                </div>
                <button disabled={busy} onClick={()=>pickFirm(f)}>Select</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Personal profile</h2>
          <div className="kv" style={{marginTop:8}}>
            <div className="k">First name</div>
            <input value={profile?.first_name || ""} onChange={(e)=>setProfile(p=>({...p, first_name:e.target.value}))}/>
            <div className="k">Last name</div>
            <input value={profile?.last_name || ""} onChange={(e)=>setProfile(p=>({...p, last_name:e.target.value}))}/>
            <div className="k">Phone</div>
            <input value={profile?.phone || ""} onChange={(e)=>setProfile(p=>({...p, phone:e.target.value}))}/>
            <div className="k">SSN (last 4)</div>
            <input value={profile?.ssn_last4 || ""} onChange={(e)=>setProfile(p=>({...p, ssn_last4:e.target.value}))}/>
            <div className="k">Address</div>
            <input value={profile?.address || ""} onChange={(e)=>setProfile(p=>({...p, address:e.target.value}))}/>
          </div>
          <div className="row" style={{marginTop:12, justifyContent:"flex-end"}}>
            <button onClick={saveProfile} disabled={busy}>Save & continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        onDone && onDone(),
        <div className="card">
          <h2>You're all set 🎉</h2>
          <div className="note">Return to your Dashboard to start uploading your documents.</div>
        </div>
      )}
    </div>
  );
}
