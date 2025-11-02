import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listFirms, selectFirm,
  getExpenses, saveExpenses,
  listBusinessProfiles, createBusinessProfile,
  uploadDoc, docsByDriver,
  periodStatus, submitPaymentStub
} from "./api";
import ExpenseWizard from "./ExpenseWizard";

export default function DriverFlow({ API, token, me, year }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [firms, setFirms] = useState([]);
  const [selectedFirm, setSelectedFirm] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [bpId, setBpId] = useState(null);

  const [docs, setDocs] = useState([]);
  const [busyDoc, setBusyDoc] = useState({});
  const fileInputs = useRef({});

  const refreshStatus = async () => {
    try {
      setLoading(true);
      const s = await periodStatus(API, token, me.id, year);
      setStatus(s);
      setError("");
    } catch (e) {
      setError(readErr(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refreshStatus(); /* eslint-disable-next-line */ }, [year]);

  // NEEDS_FIRM
  useEffect(() => {
    if (status?.flow_state === "NEEDS_FIRM") {
      listFirms(API, token).then(setFirms).catch(() => setFirms([]));
    }
  }, [status?.flow_state]);
  const confirmFirm = async () => {
    if (!selectedFirm) return;
    await selectFirm(API, token, selectedFirm);
    await refreshStatus();
  };

  // NEEDS_PROFILE (интервью)
  const bootstrapInterview = async () => {
    try {
      const list = await listBusinessProfiles(API, token, me.id).catch(() => []);
      let useId = list?.[0]?.id || null;
      if (!useId) {
        const created = await createBusinessProfile(API, token, {
          name: "Taxi business", business_code: "485310", ein: ""
        }).catch(() => null);
        useId = created?.id || null;
      }
      setBpId(useId);
      const ex = useId ? await getExpenses(API, token, useId, year).catch(() => []) : [];
      setExpenses(ex || []);
    } catch { setExpenses([]); }
  };
  useEffect(() => { if (status?.flow_state === "NEEDS_PROFILE") bootstrapInterview(); }, [status?.flow_state]);

  const saveOneExpense = async (code, amount) => {
    const next = expenses.map(e => e.code === code ? { ...e, amount } : e);
    setExpenses(next);
    if (bpId) await saveExpenses(API, token, bpId, year, next.filter(x => x.amount != null));
  };
  const finishInterview = async () => { await refreshStatus(); };

  // NEEDS_DOCUMENTS / NEEDS_PAYMENT
  const refreshDocs = async () => { setDocs(await docsByDriver(API, token, me.id).catch(() => [])); };
  useEffect(() => {
    if (["NEEDS_DOCUMENTS","NEEDS_PAYMENT"].includes(status?.flow_state)) refreshDocs();
    // eslint-disable-next-line
  }, [status?.flow_state]);

  const onPick = async (code, file) => {
    if (!file) return;
    setBusyDoc(m => ({ ...m, [code]: true }));
    try {
      await uploadDoc(API, token, me.id, year, code, file);
      await refreshStatus();
      await refreshDocs();
    } catch (e) { alert(readErr(e)); }
    finally {
      setBusyDoc(m => ({ ...m, [code]: false }));
      if (fileInputs.current[code]) fileInputs.current[code].value = "";
    }
  };

  const canSubmit = useMemo(() => {
    const items = status?.checklist || [];
    return items.length > 0 && !items.some(x => x.status === "missing");
  }, [status]);
  const submitAll = async () => { await submitPaymentStub(API, token, year); await refreshStatus(); };

  if (loading && !status) return (<div className="grid"><div className="card"><div className="note">Loading…</div></div></div>);
  if (error) return (<div className="grid"><div className="card"><div className="alert">Error: {error}</div></div></div>);

  const flow = status?.flow_state;

  // ================== NEEDS_FIRM (one column + price + rating) ==================
  if (flow === "NEEDS_FIRM") {
    return (
      <div className="grid">
        <div className="card">
          <h2>Choose your accounting firm</h2>
          <div className="note" style={{marginTop:6}}>Pick a firm to get started.</div>

          <div className="tilegrid market" style={{marginTop:12}}>
            {(firms || []).map(f => {
              const price = formatPrice(f.services_pricing);
              const rating = f.avg_rating ?? null;
              return (
                <button
                  key={f.id}
                  className={`tile ${selectedFirm===f.id ? "selected" : ""}`}
                  onClick={()=>setSelectedFirm(f.id)}
                  style={{textAlign:"left"}}
                >
                  <div style={{flex:1, minWidth:0}}>
                    <div className="row" style={{justifyContent:"space-between", alignItems:"baseline"}}>
                      <b style={{fontSize:16, lineHeight:1.2}}>{f.name}</b>
                      <div className="row" style={{gap:10}}>
                        {price && <span className="price">{price}</span>}
                        {rating != null && <RatingBadge value={rating} />}
                      </div>
                    </div>
                    <div className="note" style={{marginTop:4}}>{f.description || "—"}</div>
                  </div>
                  <span className="badge">{selectedFirm===f.id ? "Selected" : "Choose"}</span>
                </button>
              );
            })}
          </div>

          <div className="row" style={{justifyContent:"flex-end", marginTop:12}}>
            <button onClick={confirmFirm} disabled={!selectedFirm}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // ================== NEEDS_PROFILE ==================
  if (flow === "NEEDS_PROFILE") {
    return (
      <div className="grid">
        <ExpenseWizard
          year={year}
          items={expenses}
          onSaveOne={saveOneExpense}
          onFinished={finishInterview}
        />
      </div>
    );
  }

  // ================== NEEDS_DOCUMENTS / NEEDS_PAYMENT ==================
  if (flow === "NEEDS_DOCUMENTS" || flow === "NEEDS_PAYMENT") {
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

        <Checklist list={status?.checklist || []} busy={busyDoc} onPick={onPick} fileInputs={fileInputs} />

        <div className="card">
          <div className="row spread">
            <div className="note">
              {flow === "NEEDS_PAYMENT"
                ? "All set. Send your files to the accountant."
                : "Upload required documents to continue."}
            </div>
            {flow === "NEEDS_PAYMENT" && (
              <button disabled={!canSubmit} onClick={submitAll}>Finish & submit</button>
            )}
          </div>
        </div>

        <Uploads docs={docs} />
      </div>
    );
  }

  // ================== IN_REVIEW ==================
  if (flow === "IN_REVIEW") {
    return (
      <div className="grid">
        <div className="card">
          <h2>Status</h2>
          <div className="row spread" style={{ marginTop: 6 }}>
            <div className="note">Submitted. Your accountant is reviewing your documents.</div>
            <span className="badge ok">In review</span>
          </div>
        </div>

        <Checklist list={status?.checklist || []} busy={{}} onPick={()=>{}} fileInputs={{ current: {} }} />
        {/* Тут можно подключить ChatPanel */}
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card"><h2>My dashboard</h2><div className="note">Waiting for instructions…</div></div>
    </div>
  );
}

/* ---------------- UI blocks ---------------- */

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
        <thead><tr><th>Task</th><th>Status</th><th style={{width:140}}>Action</th></tr></thead>
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

/* ---------------- helpers ---------------- */

function readErr(e){ try{const j=JSON.parse(String(e.message||e));return j.detail||e.message;}catch{return String(e.message||e);} }

// f.services_pricing может быть "1000", 1000, или JSON-строка {"standard":250}
function formatPrice(raw){
  if (raw == null) return null;
  try {
    if (typeof raw === "number") return `$${raw}`;
    if (typeof raw === "string") {
      const t = raw.trim();
      // число строкой
      if (/^\d+(\.\d+)?$/.test(t)) return `$${t}`;
      // JSON-объект
      const obj = JSON.parse(t);
      const val = obj.standard ?? obj.flat_rate ?? obj.premium ?? obj.hourly ?? Object.values(obj)[0];
      return val != null ? `$${val}` : null;
    }
    if (typeof raw === "object") {
      const val = raw.standard ?? raw.flat_rate ?? raw.premium ?? raw.hourly ?? Object.values(raw)[0];
      return val != null ? `$${val}` : null;
    }
  } catch {}
  return null;
}

function RatingBadge({ value }) {
  const v = Math.max(0, Math.min(5, Number(value)||0));
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="rating">
      {"★".repeat(full)}{half ? "☆" : ""}{"✩".repeat(empty)}
      <span className="ratingNum">{v.toFixed(1)}</span>
    </span>
  );
}
