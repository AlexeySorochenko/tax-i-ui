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
import ChatPanel from "./ChatPanel";

export default function DriverFlow({ API, token, me, year }) {
  const [step, setStep] = useState("dashboard"); // 'market', 'profile', 'business', 'dashboard', 'submitted'
  const [firms, setFirms] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [bp, setBp] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [status, setStatus] = useState(null);
  const [docs, setDocs] = useState([]);
  const [busyDoc, setBusyDoc] = useState({}); // code -> true
  const fileInputs = useRef({});

  // ---------- bootstrap ----------
  useEffect(() => {
    // try to detect whether onboarding is needed
    refreshDashboard();
    // also preload personal to know if empty
    getPersonal(API, token, me.id).then(setProfile).catch(()=>{});
  }, [year]); // eslint-disable-line

  const refreshDashboard = async () => {
    const s = await periodStatus(API, token, me.id, year).catch(()=>null);
    setStatus(s);
    const d = await docsByDriver(API, token, me.id).catch(()=>[]);
    setDocs(d);
  };

  // ---------- MARKETPLACE (Step 2) ----------
  const loadFirms = () => listFirms(API, token).then(setFirms).catch(()=>setFirms([]));
  const pickFirm = async (id) => { await selectFirm(API, token, id); setStep("profile"); };

  // ---------- PERSONAL (Step 3.1) ----------
  const saveProfile = async () => { await putPersonal(API, token, me.id, profile||{}); setStep("business"); };

  // ---------- BUSINESS (Step 3.2) ----------
  const loadBusiness = async () => {
    const list = await listBusinessProfiles(API, token, me.id).catch(()=>[]);
    setProfiles(list||[]);
    const first = (list||[])[0];
    if (first) {
      setBp(first);
      const ex = await getExpenses(API, token, first.id, year).catch(()=>[]);
      setExpenses(ex);
    }
  };
  const addBusiness = async (name, business_code, ein) => {
    const created = await createBusinessProfile(API, token, { name, business_code, ein }).catch(()=>null);
    if (created) { await loadBusiness(); }
  };
  const saveOneExpense = async (code, amount) => {
    const next = expenses.map((e)=> e.code===code ? { ...e, amount } : e);
    setExpenses(next);
    await saveExpenses(API, token, bp.id, year, next.filter(x => x.amount != null));
  };

  // ---------- UPLOAD (Step 5) ----------
  const onPick = async (code, file) => {
    if (!file) return;
    setBusyDoc(m => ({ ...m, [code]: true }));
    try {
      await uploadDoc(API, token, me.id, year, code, file);
      await refreshDashboard();
    } catch (e) {
      alert(parseErr(e));
    } finally {
      setBusyDoc(m => ({ ...m, [code]: false }));
      if (fileInputs.current[code]) fileInputs.current[code].value = "";
    }
  };

  // ---------- SUBMIT (Step 6) ----------
  const canSubmit = useMemo(() => {
    const items = status?.checklist || [];
    return items.length > 0 && !items.some(x => x.status === "missing");
  }, [status]);
  const submitAll = async () => {
    await submitPaymentStub(API, token, year);
    await refreshDashboard();
    setStep("submitted");
  };

  // ---------- Render ----------
  if (step === "market") {
    return (
      <div className="grid">
        <div className="card">
          <h2>Select your accounting firm</h2>
          <div className="note">Pick a firm to work with. You can change later.</div>
          <div className="tilegrid" style={{marginTop:12}}>
            {(firms||[]).map((f)=>(
              <div key={f.id} className="tile">
                <div><b>{f.name}</b><div className="note">{f.description || "—"}</div></div>
                <button onClick={()=>pickFirm(f.id)}>Select</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "profile") {
    return (
      <div className="grid">
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
          <div className="row" style={{justifyContent:"space-between", marginTop:12}}>
            <button className="secondary" onClick={()=>setStep("market")}>Back</button>
            <button onClick={saveProfile}>Save & continue</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "business") {
    return (
      <div className="grid">
        <div className="card">
          <h2>Business setup</h2>
          <div className="row" style={{gap:8, flexWrap:"wrap"}}>
            <input placeholder="Business name" id="bn" />
            <input placeholder="Business code (optional)" id="bc" />
            <input placeholder="EIN (optional)" id="be" />
            <button onClick={()=> addBusiness(
              document.getElementById("bn").value,
              document.getElementById("bc").value,
              document.getElementById("be").value
            )}>Add</button>
            <button className="secondary" onClick={loadBusiness}>Refresh</button>
          </div>
          {!bp && <div className="note" style={{marginTop:8}}>No profiles yet.</div>}
          {bp && <div className="note" style={{marginTop:8}}>Using profile: <b>{bp.name}</b></div>}
        </div>

        {bp && (
          <ExpenseWizard
            year={year}
            items={expenses}
            saving={false}
            onSaveOne={saveOneExpense}
          />
        )}

        <div className="card">
          <div className="row" style={{justifyContent:"flex-end"}}>
            <button onClick={()=>setStep("dashboard")}>Continue to checklist</button>
          </div>
        </div>
      </div>
    );
  }

  // --------- dashboard (Steps 4-5-6-7) ----------
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
        title="Checklist"
        list={status?.checklist || []}
        busy={busyDoc}
        onPick={onPick}
        fileInputs={fileInputs}
      />

      <SubmitBar
        stage={status?.stage}
        canSubmit={canSubmit}
        onSubmit={submitAll}
      />

      <Uploads docs={docs} />

      {status?.stage !== "collection" && (
        <ChatPanel API={API} token={token} driverId={me.id} myUserId={me.id} />
      )}
    </div>
  );
}

function Checklist({ title, list, busy, onPick, fileInputs }) {
  const groups = useMemo(() => {
    const personal = ["DL","SSN Card","US Passport","Green Card","Birth Certificate","CONFIRM_PERSONAL"];
    const isPersonal = (d) => personal.includes(d) || String(d).includes("CONFIRM_PERSONAL");
    return {
      personal: list.filter(x => isPersonal(x.document)),
      tax: list.filter(x => !isPersonal(x.document)),
    };
  }, [list]);

  return (
    <>
      <ChecklistTable caption={`${title} — Personal`} rows={groups.personal} busy={busy} onPick={onPick} fileInputs={fileInputs}/>
      <ChecklistTable caption={`${title} — Tax`} rows={groups.tax} busy={busy} onPick={onPick} fileInputs={fileInputs}/>
    </>
  );
}

const STATUS_PILL = {
  missing: "badge",
  uploaded: "badge warn",
  needs_review: "badge warn",
  approved: "badge ok",
  rejected: "badge err",
};
function ChecklistTable({ caption, rows, busy, onPick, fileInputs }) {
  return (
    <div className="card">
      <h3>{caption}</h3>
      <table>
        <thead><tr><th>Task</th><th>Status</th><th style={{width:180}}>Action</th></tr></thead>
        <tbody>
          {rows?.length ? rows.map((it, i)=>(
            <tr key={i}>
              <td>{it.document}</td>
              <td><span className={STATUS_PILL[it.status] || "badge"}>{it.status}</span></td>
              <td>
                <label className="secondary">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    ref={(el)=>{fileInputs.current[it.document] = el;}}
                    onChange={(e)=> onPick(it.document, e.target.files?.[0])}
                    capture="environment"
                  />
                  {busy[it.document] ? "Uploading…" : "Upload"}
                </label>
              </td>
            </tr>
          )) : <tr><td colSpan={3}><div className="note">No tasks.</div></td></tr>}
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
      {docs?.map((d)=>(
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

function SubmitBar({ stage, canSubmit, onSubmit }) {
  return (
    <div className="card">
      {stage === "collection" ? (
        <div className="row spread">
          <div className="note">Complete all tasks to send your files to the accountant.</div>
          <button disabled={!canSubmit} onClick={onSubmit}>
            Finish & submit
          </button>
        </div>
      ) : (
        <div className="row spread">
          <div className="note">Submitted. Your accountant is reviewing your documents.</div>
          <span className="badge ok">In review</span>
        </div>
      )}
    </div>
  );
}

function parseErr(e){
  try{const j = JSON.parse(String(e.message||e)); return j.detail || e.message;}catch{return String(e.message||e);}
}
