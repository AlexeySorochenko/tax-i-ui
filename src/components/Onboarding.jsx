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
  const [errors, setErrors] = useState({}); // <-- отдельные ошибки полей

  // ---- helpers for masks/validation
  const onlyDigits = (s) => (s || "").replace(/\D+/g, "");
  const formatSSN = (raw) => {
    const d = onlyDigits(raw).slice(0, 9);
    if (d.length <= 4) return d; // last4
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  };
  const isValidSSN = (raw) => {
    const d = onlyDigits(raw);
    return d.length === 4 || d.length === 9;
  };

  useEffect(() => {
    let alive = true;
    if (initialStep === 1) {
      listFirms(API, token).then((x) => { if (alive) setFirms(x || []); }).catch(() => {});
    }
    getPersonal(API, token, me.id)
      .then((p) => { if (alive) setProfile(p || {}); })
      .catch(() => {});
    return () => { alive = false; };
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
    setBusy(true); setErr(""); setErrors({});
    try {
      // validate
      const vErr = {};
      if (!isValidSSN(profile?.ssn)) vErr.ssn = "Please enter full SSN (9 digits) or last 4 digits.";
      if (!profile?.date_of_birth) vErr.dob = "Date of birth is required.";
      if (!profile?.mailing_address || profile?.mailing_address.length < 5) vErr.addr = "Mailing address looks too short.";
      if (!profile?.marital_status) vErr.marital = "Please select marital status.";
      if (Object.keys(vErr).length) { setErrors(vErr); setBusy(false); return; }

      // normalize + save
      const payload = {
        ssn: onlyDigits(profile?.ssn),            // backend получает только цифры
        date_of_birth: profile?.date_of_birth,    // YYYY-MM-DD
        mailing_address: profile?.mailing_address,
        marital_status: profile?.marital_status,
      };
      await putPersonal(API, token, me.id, payload);

      setStep(3);
      onDoneNext && onDoneNext(); // → визард расходов
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {step === 1 && (
        <div className="card">
          <h2>Choose your accounting firm</h2>
          {err && <div className="alert" style={{ marginTop: 8 }}>{err}</div>}
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12, marginTop: 8 }}>
            {firms.map((f) => (
              <div key={f.id} className="tile">
                <div>
                  <b>{f.name}</b>
                  <div className="note">{f.description || "—"}</div>
                </div>
                <button disabled={busy} onClick={() => pickFirm(f)}>Select</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Personal profile</h2>
          <div className="note" style={{ marginTop: 6 }}>
            We only ask for details not provided during registration.
          </div>

          <div className="kv" style={{ marginTop: 12 }}>
            {/* SSN */}
            <div className="k">SSN</div>
            <div>
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="123-45-6789 or last 4"
                value={formatSSN(profile?.ssn)}
                onChange={(e) => setProfile(p => ({ ...p, ssn: e.target.value }))}
                maxLength={11}
              />
              <div className="note">Enter full SSN (9 digits) or last 4 digits.</div>
              {errors.ssn && <div className="alert" style={{ marginTop: 6 }}>{errors.ssn}</div>}
            </div>

            {/* Date of birth */}
            <div className="k">Date of birth</div>
            <div>
              <input
                type="date"
                value={profile?.date_of_birth || ""}
                onChange={(e) => setProfile(p => ({ ...p, date_of_birth: e.target.value }))}
                max={new Date().toISOString().slice(0, 10)}
              />
              {errors.dob && <div className="alert" style={{ marginTop: 6 }}>{errors.dob}</div>}
            </div>

            {/* Mailing address */}
            <div className="k">Mailing address</div>
            <div>
              <input
                placeholder="Street, City, State/Region, ZIP/Postal"
                value={profile?.mailing_address || ""}
                onChange={(e) => setProfile(p => ({ ...p, mailing_address: e.target.value }))}
              />
              {errors.addr && <div className="alert" style={{ marginTop: 6 }}>{errors.addr}</div>}
            </div>

            {/* Marital status */}
            <div className="k">Marital status</div>
            <div>
              <select
                value={profile?.marital_status || ""}
                onChange={(e) => setProfile(p => ({ ...p, marital_status: e.target.value }))}
              >
                <option value="">— choose —</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
              {errors.marital && <div className="alert" style={{ marginTop: 6 }}>{errors.marital}</div>}
            </div>
          </div>

          {err && <div className="alert" style={{ marginTop: 10 }}>{err}</div>}
          <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
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
