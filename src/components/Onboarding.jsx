import React, { useEffect, useState } from "react";
import { listFirms, selectFirm, getPersonal, putPersonal } from "./api";

/**
 * Онбординг:
 * 1) выбор фирмы
 * 2) профиль — спрашиваем только недостающие поля:
 *    ssn, date_of_birth, mailing_address, marital_status
 * 3) done → вызываем onDoneNext() чтобы перейти к визарду расходов
 */
export default function Onboarding({ API, token, me, initialStep = 1, onDoneNext }) {
  const [firms, setFirms] = useState([]);
  const [profile, setProfile] = useState({});
  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    if (initialStep === 1) {
      listFirms(API, token).then((x)=>{ if (alive) setFirms(x||[]); }).catch(()=>{});
    }
    getPersonal(API, token, me.id)
      .then((p)=>{ if (alive) setProfile(p || {}); })
      .catch(()=>{});
    return () => { alive=false; };
    // eslint-disable-next-line
  }, []);

  const pickFirm = async (f) => {
    setBusy(true); setErr("");
    try {
      await selectFirm(API, token, f.id);
      setStep(2);
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  };

  const saveProfile = async () => {
    setBusy(true); setErr("");
    try {
      const payload = {
        ssn: profile?.ssn || "",
        date_of_birth: profile?.date_of_birth || "",
        mailing_address: profile?.mailing_address || "",
        marital_status: profile?.marital_status || "",
      };
      await putPersonal(API, token, me.id, payload);
      setStep(3);
      onDoneNext && onDoneNext(); // ← сразу к визарду расходов
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {step === 1 && (
        <div className="card">
          <h2>Choose your accounting firm</h2>
          {err && <div className="alert" style={{marginTop:8}}>{err}</div>}
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12, marginTop: 8 }}>
            {firms.map((f) => (
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
          <div className="note" style={{marginTop:6}}>
            We only ask for details not provided during registration.
          </div>

          <div className="kv" style={{marginTop:12}}>
            <div className="k">SSN</div>
            <input
              placeholder="123456789 (or last 4)"
              value={profile?.ssn || ""}
              onChange={(e)=>setProfile(p=>({...p, ssn:e.target.value}))}
            />

            <div className="k">Date of birth</div>
            <input
              type="date"
              value={profile?.date_of_birth || ""}
              onChange={(e)=>setProfile(p=>({...p, date_of_birth:e.target.value}))}
            />

            <div className="k">Mailing address</div>
            <input
              placeholder="Street, City, State, ZIP"
              value={profile?.mailing_address || ""}
              onChange={(e)=>setProfile(p=>({...p, mailing_address:e.target.value}))}
            />

            <div className="k">Marital status</div>
            <select
              value={profile?.marital_status || ""}
              onChange={(e)=>setProfile(p=>({...p, marital_status:e.target.value}))}
            >
              <option value="">— choose —</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>

          {err && <div className="alert" style={{marginTop:10}}>{err}</div>}
          <div className="row" style={{marginTop:12, justifyContent:"flex-end"}}>
            <button onClick={saveProfile} disabled={busy}>Save & continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h2>You're all set 🎉</h2>
          <div className="note">Return to your Dashboard to start uploading your documents.</div>
        </div>
      )}
    </div>
  );
}
