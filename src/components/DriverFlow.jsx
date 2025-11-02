import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listFirms, selectFirm,
  getPersonal, putPersonal,
  listBusinessProfiles, createBusinessProfile,
  getExpenses, saveExpenses,
  periodStatus, uploadDoc, docsByDriver,
  submitPaymentStub
} from "./api";
import ExpenseWizard from "./ExpenseWizard";

export default function DriverFlow({ API, token, me, year }) {
  // экраны: фирма → персональные → бизнес-опрос → дашборд
  const [step, setStep] = useState("dashboard"); // 'market' | 'profile' | 'business' | 'dashboard' | 'submitted'

  // данные
  const [firms, setFirms] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [bp, setBp] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [status, setStatus] = useState(null);
  const [docs, setDocs] = useState([]);

  // загрузка конкретного пункта чеклиста
  const [busyDoc, setBusyDoc] = useState({});
  const fileInputs = useRef({});

  // smart bootstrap
  useEffect(() => { bootstrap(); /* eslint-disable-next-line */ }, [year]);

  const bootstrap = async () => {
    try {
      const p = await getPersonal(API, token, me.id).catch(()=>null);
      setProfile(p);

      const bps = await listBusinessProfiles(API, token, me.id).catch(()=>[]);
      setProfiles(bps || []);
      const first = (bps || [])[0];
      if (first) {
        setBp(first);
        const ex = await getExpenses(API, token, first.id, year).catch(()=>[]);
        setExpenses(ex);
      }

      const s = await periodStatus(API, token, me.id, year).catch(()=>null);
      setStatus(s);
      const d = await docsByDriver(API, token, me.id).catch(()=>[]);
      setDocs(d);

      // решаем первый шаг:
      const personalIncomplete = !p || !p.first_name || !p.last_name || !p.address || !p.ssn_last4;

      if (!bps?.length) { setStep("market"); await loadFirms(); return; }
      if (personalIncomplete) { setStep("profile"); return; }
      const hasAnyExpense = (ex => ex && ex.some(e => e.amount != null))(expenses);
      if (!hasAnyExpense) { setStep("business"); return; }
      setStep("dashboard");
    } catch { setStep("dashboard"); }
  };

  const refreshDashboard = async () => {
    const s = await periodStatus(API, token, me.id, year).catch(()=>null);
    setStatus(s);
    const d = await docsByDriver(API, token, me.id).catch(()=>[]);
    setDocs(d);
  };

  /* ---------- MARKET: выбор фирмы (один CTA) ---------- */
  const loadFirms = () => listFirms(API, token).then(setFirms).catch(()=>setFirms([]));
  const [selectedFirm, setSelectedFirm] = useState(null);
  const confirmFirm = async () => {
    if (!selectedFirm) return;
    await selectFirm(API, token, selectedFirm);
    setStep("profile"); // дальше сразу на персональные данные
  };

  /* ---------- PROFILE: короткая форма (один CTA) ---------- */
  const saveProfile = async () => {
    await putPersonal(API, token, me.id, profile || {});
    await loadBusiness(); // создадим/подтянем бизнес-профиль
    setStep("business");
  };

  /* ---------- BUSINESS: создаём профиль в один клик + опрос ---------- */
  const loadBusiness = async () => {
    const list = await listBusinessProfiles(API, token, me.id).catch(()=>[]);
    setProfiles(list || []);
    const first = (list || [])[0];
    if (first) {
      setBp(first);
      const ex = await getExpenses(API, token, first.id, year).catch(()=>[]);
      setExpenses(ex);
    }
  };

  // быстрые пресеты: Taxi / Truck — чтобы не путать пользователя полями
  const startBusinessPreset = async (preset) => {
    const name = preset === "taxi" ? "Taxi business" : "Trucking business";
    const code = preset === "taxi" ? "485310" : "484110";
    const created = await createBusinessProfile(API, token, { name, business_code: code, ein: "" }).catch(()=>null);
    if (created) { await loadBusiness(); }
  };

  // сохраняем один ответ из визарда
  const saveOneExpense = async (code, amount) => {
    const next = expenses.map(e => e.code === code ? { ...e, amount } : e);
    setExpenses(next);
    if (bp?.id) {
      await saveExpenses(API, token, bp.id, year, next.filter(x => x.amount != null));
    }
  };

  /* ---------- DOCUMENT UPLOAD ---------- */
  const onPick = async (code, file) => {
    if (!file) return;
    setBusyDoc(m => ({...m, [code]: true}));
    try {
      await uploadDoc(API, token, me.id, year, code, file);
      await refreshDashboard();
    } catch (e) {
      alert(readErr(e));
    } finally {
      setBusyDoc(m => ({...m, [code]: false}));
      if (fileInputs.current[code]) fileInputs.current[code].value = "";
    }
  };

  /* ---------- SUBMIT ---------- */
  const canSubmit = useMemo(() => {
    const items = status?.checklist || [];
    return items.length > 0 && !items.some(x => x.status === "missing");
  }, [status]);

  const submitAll = async () => {
    await submitPaymentStub(API, token, year);
    await refreshDashboard();
    setStep("submitted");
  };

  /* ---------- RENDER ---------- */

  // 1) Market — выбор одной карточки и кнопка Continue
  if (step === "market") {
    return (
      <div className="grid">
        <div className="card">
          <h2>Choose your accounting firm</h2>
          <div className="note" style={{marginTop:6}}>Pick a firm to get started. You can change later.</div>
          <div className="tilegrid" style={{marginTop:12}}>
            {(firms || []).map(f => (
              <button
                key={f.id}
                className={`tile ${selectedFirm===f.id ? "selected" : ""}`}
                onClick={()=>setSelectedFirm(f.id)}
                style={{textAlign:"left"}}
              >
                <div>
                  <b>{f.name}</b>
                  <div className="note">{f.description || "—"}</div>
                </div>
                <span className="badge">{selectedFirm===f.id ? "Selected" : "Choose"}</span>
              </button>
            ))}
          </div>
          <div className="row" style={{justifyContent:"flex-end", marginTop:12}}>
            <button onClick={confirmFirm} disabled={!selectedFirm}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // 2) Personal — короткая форма, один CTA «Save & continue»
  if (step === "profile") {
    return (
      <div className="grid" style={{maxWidth:720, margin:"0 auto"}}>
        <div className="card">
          <h2>Your details</h2>
          <div className="note" style={{marginTop:6}}>Just a few fields to personalize your checklist.</div>
          <div className="kv" style={{marginTop:10}}>
            <div className="k">First name</div>
            <input value={profile?.first_name || ""} onChange={e=>setProfile(p=>({...p, first_name:e.target.value}))}/>
            <div className="k">Last name</div>
            <input value={profile?.last_name || ""} onChange={e=>setProfile(p=>({...p, last_name:e.target.value}))}/>
            <div className="k">Phone</div>
            <input value={profile?.phone || ""} onChange={e=>setProfile(p=>({...p, phone:e.target.value}))}/>
            <div className="k">SSN (last 4)</div>
            <input value={profile?.ssn_last4 || ""} onChange={e=>setProfile(p=>({...p, ssn_last4:e.target.value}))}/>
            <div className="k">Address</div>
            <input value={profile?.address || ""} onChange={e=>setProfile(p=>({...p, address:e.target.value}))}/>
          </div>
          <div className="row" style={{justifyContent:"flex-end", marginTop:12}}>
            <button onClick={saveProfile}>Save & continue</button>
          </div>
        </div>
      </div>
    );
  }

  // 3) Business — один выбор пресета и сразу визард (без лишних полей/кнопок)
  if (step === "business") {
    return (
      <div className="grid">
        {!bp && (
          <div className="card">
            <h2>Your business</h2>
            <div className="note" style={{marginTop:6}}>Pick what you do — we’ll tailor questions.</div>
            <div className="row" style={{gap:8, marginTop:12, flexWrap:"wrap"}}>
              <button onClick={()=>startBusinessPreset("taxi")}>🚖 I drive taxi/Uber</button>
              <button className="secondary" onClick={()=>startBusinessPreset("truck")}>🚚 I’m a truck driver</button>
            </div>
          </div>
        )}

        {bp && (
          <ExpenseWizard
            year={year}
            items={expenses}
            onSaveOne={saveOneExpense}
            onFinished={()=>setStep("dashboard")}
          />
        )}
      </div>
    );
  }

  // 4) Dashboard — только чек-лист, «Upload» и одна финальная кнопка
  return (
    <div className="grid">
      <div className="card">
        <h2>My dashboard</h2>
        <div className="kv">
          <div className="k">Year</div><div><span className="badge">{year}</span></div>
          <div className="k">Stage</div><div><span className="badge">{status?.stage || "—"}</span></div>
          <div className="k">Period ID</div><div>{status?.period_id ?? "—"}</div>
        </div>
      </div>

      <Checklist
        list={status?.checklist || []}
        busy={busyDoc}
        onPick={onPick}
        fileInputs={fileInputs}
      />

      <div className="card">
        <div className="row spread">
          <div className="note">Done? Send to your accountant.</div>
          <button disabled={!canSubmit} onClick={submitAll}>Finish & submit</button>
        </div>
      </div>

      <Uploads docs={docs} />
    </div>
  );
}

/* ---------- Checklist / Uploads ---------- */

const STATUS_PILL = {
  missing: "badge",
  uploaded: "badge warn",
  needs_review: "badge warn",
  approved: "badge ok",
  rejected: "badge err",
};

function Checklist({ list, busy, onPick, fileInputs }) {
  return (
    <div className="card">
      <h3>Checklist</h3>
      <table>
        <thead>
          <tr><th>Task</th><th>Status</th><th style={{width:140}}>Action</th></tr>
        </thead>
        <tbody>
          {(list||[]).map((it,i)=>(
            <tr key={i}>
              <td>{it.document}</td>
              <td><span className={STATUS_PILL[it.status] || "badge"}>{it.status}</span></td>
              <td>
                <label className="secondary">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    ref={el => { fileInputs.current[it.document] = el; }}
                    onChange={(e)=>onPick(it.document, e.target.files?.[0])}
                    capture="environment"
                  />
                  {busy[it.document] ? "Uploading…" : "Upload"}
                </label>
              </td>
            </tr>
          ))}
          {(!list || !list.length) && (
            <tr><td colSpan={3}><div className="note">No tasks yet.</div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Uploads({ docs }) {
  return (
    <div className="card">
      <h3>My uploads</h3>
      {!docs?.length && <div className="note">No documents yet.</div>}
      {docs?.map(d=>(
        <div key={d.id} className="tile">
          <div className="row" style={{gap:8}}>
            <span className="badge">{d.doc_type || "UNKNOWN"}</span>
            <b>{d.filename}</b>
          </div>
          <div className="rightChip note">
            {d.stored_filename ? <a href={d.stored_filename} target="_blank">Open</a> : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function readErr(e){ try{const j=JSON.parse(String(e.message||e));return j.detail||e.message;}catch{return String(e.message||e);} }
