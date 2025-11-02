import React, { useEffect, useMemo, useRef, useState } from "react";
import { periodStatus, docsByDriver, uploadDoc } from "./api";

export default function DriverHome({ API, token, me, year }) {
  const [status, setStatus] = useState(null);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState({}); // code -> true
  const fileInputs = useRef({});

  const load = async () => {
    const s = await periodStatus(API, token, me.id, year).catch(()=>null);
    setStatus(s);
    const d = await docsByDriver(API, token, me.id).catch(()=>[]);
    setDocs(d);
  };

  useEffect(() => { load(); }, [year]); // eslint-disable-line

  const onPick = async (code, file) => {
    if (!file) return;
    setBusy(m => ({ ...m, [code]: true }));
    try {
      await uploadDoc(API, token, me.id, year, code, file);
      await load();
    } catch (e) {
      alert(parseErr(e));
    } finally {
      setBusy(m => ({ ...m, [code]: false }));
      if (fileInputs.current[code]) fileInputs.current[code].value = "";
    }
  };

  const byType = useMemo(() => {
    const p = (status?.checklist || []).map(c => c.document);
    const personal = p.filter(d => d.includes("CONFIRM_PERSONAL") || d==="DL" || d==="SSN Card" || d==="US Passport" || d==="Green Card" || d==="Birth Certificate");
    const tax = p.filter(d => !personal.includes(d));
    return { personal, tax };
  }, [status]);

  return (
    <div className="grid">
      <div className="card">
        <h2>My Documents</h2>
        <div className="kv">
          <div className="k">Email</div><div>{me.email}</div>
          <div className="k">Year</div><div><span className="badge">{year}</span></div>
          <div className="k">Stage</div><div><span className="badge">{status?.stage || "—"}</span></div>
          <div className="k">Period ID</div><div>{status?.period_id ?? "—"}</div>
        </div>
      </div>

      <Checklist
        title="Personal documents"
        me={me}
        year={year}
        checklist={(status?.checklist || []).filter(x => byType.personal.includes(x.document))}
        onPick={onPick}
        busy={busy}
        fileInputs={fileInputs}
      />

      <Checklist
        title="Tax documents"
        me={me}
        year={year}
        checklist={(status?.checklist || []).filter(x => byType.tax.includes(x.document))}
        onPick={onPick}
        busy={busy}
        fileInputs={fileInputs}
      />

      <Uploads docs={docs} />
    </div>
  );
}

const STATUS_PILL = {
  missing: "badge",
  uploaded: "badge warn",
  needs_review: "badge warn",
  approved: "badge ok",
  rejected: "badge err",
};

function Checklist({ title, checklist, onPick, busy, fileInputs }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <table>
        <thead><tr><th>Task</th><th>Status</th><th style={{width:180}}>Action</th></tr></thead>
        <tbody>
        {checklist?.length ? checklist.map((it, idx) => {
          const st = STATUS_PILL[it.status] || "badge";
          return (
            <tr key={idx}>
              <td>{it.document}</td>
              <td><span className={st}>{it.status}</span></td>
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
          );
        }) : (
          <tr><td colSpan={3}><div className="note">No tasks.</div></td></tr>
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
      {docs?.map((d)=>(
        <div key={d.id} className="tile">
          <div className="row" style={{gap:8}}>
            <span className="badge">{d.doc_type || "UNKNOWN"}</span>
            <b>{d.filename}</b>
          </div>
          <div className="rightChip note">{d.stored_filename ? <a href={d.stored_filename} target="_blank">Open</a> : "—"}</div>
        </div>
      ))}
    </div>
  );
}

function parseErr(e){
  try { const j = JSON.parse(String(e.message||e)); return j.detail || e.message; } catch { return String(e.message||e); }
}
