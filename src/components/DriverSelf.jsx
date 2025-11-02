import React, { useEffect, useMemo, useRef, useState } from "react";
import { authHeaders, jget, formPost, withQuery } from "./api.js";
import DocCard from "./DocCard.jsx";

// простая эвристика (пока бэк не отдаёт category)
const PERSONAL_CODES = new Set([
  "DL","SSN","SSN_CARD","BIRTH_CERTIFICATE","PASSPORT","US_PASSPORT","GREEN_CARD","EIN_LETTER","CONFIRM_PERSONAL"
]);
function isPersonal(code="") {
  const c = String(code).toUpperCase();
  if (PERSONAL_CODES.has(c)) return true;
  return false;
}

export default function DriverSelf({ API, token, me }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState(null); // {period_id, stage, checklist[]}
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const fileInputs = useRef({});
  const camInputs = useRef({});
  const [busyDoc, setBusyDoc] = useState(null);

  const loadStatus = async () => {
    setError(null);
    const url = `${API}/api/v1/periods/status/${me.id}/${year}`;
    try {
      const data = await jget(url, token);
      setPeriod(data);
    } catch (e) {
      setPeriod(null);
      setError(String(e));
    }
  };
  const loadDocs = async () => {
    const url = `${API}/api/v1/documents/by-driver/${me.id}`;
    try { const list = await jget(url, token); setDocs(Array.isArray(list) ? list : []); }
    catch { setDocs([]); }
  };

  useEffect(() => { loadStatus(); loadDocs(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadStatus(); /* eslint-disable-next-line */ }, [year]);

  const personalChecklist = useMemo(() =>
    (period?.checklist || []).filter(i => isPersonal(i.document)),
  [period]);
  const taxChecklist = useMemo(() =>
    (period?.checklist || []).filter(i => !isPersonal(i.document)),
  [period]);

  const handlePicked = async (code, file) => {
    if (!file) return;
    setError(null); setBusyDoc(code);
    try {
      const form = new FormData();
      form.append("file", file);
      const url = withQuery(`${API}/api/v1/documents/upload/${me.id}`, { year, document_type_code: code });
      await formPost(url, token, form);
      // мгновенное обновление
      await loadStatus();
      await loadDocs();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyDoc(null);
      if (fileInputs.current[code]) fileInputs.current[code].value = "";
      if (camInputs.current[code]) camInputs.current[code].value = "";
    }
  };

  const Section = ({ title, checklist }) => (
    <div className="card" style={{ marginTop: 10 }}>
      <h3 style={{margin:0}}>{title}</h3>
      {!checklist.length && <div className="note" style={{marginTop:6}}>No items.</div>}
      {!!checklist.length && (
        <table style={{marginTop:8}}>
          <thead>
            <tr><th>Document</th><th style={{width:120}}>Status</th><th style={{width:240}}>Action</th></tr>
          </thead>
          <tbody>
            {checklist.map((row) => (
              <tr key={row.document}>
                <td><b>{row.document}</b></td>
                <td><span className={`badge ${row.status==='missing'?'warn':'ok'}`}>{row.status}</span></td>
                <td>
                  {(row.status === "missing" || row.status === "rejected" || row.status === "needs_review") ? (
                    <div className="row" style={{gap:8}}>
                      <label className="secondary" style={{cursor:"pointer"}}>
                        <input type="file" accept="image/*,application/pdf"
                               style={{display:"none"}}
                               ref={el => (fileInputs.current[row.document]=el)}
                               onChange={(e)=>handlePicked(row.document, e.target.files?.[0])}/>
                        {busyDoc===row.document ? "Uploading…" : "Upload"}
                      </label>
                      <label className="secondary" style={{cursor:"pointer"}}>
                        <input type="file" accept="image/*" capture="environment"
                               style={{display:"none"}}
                               ref={el => (camInputs.current[row.document]=el)}
                               onChange={(e)=>handlePicked(row.document, e.target.files?.[0])}/>
                        {busyDoc===row.document ? "Uploading…" : "Photograph"}
                      </label>
                    </div>
                  ) : <span className="note">No action needed</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      <div className="row spread">
        <div className="row" style={{gap:8}}>
          <h2 style={{margin:0}}>My Documents</h2>
          <span className="badge">{me.email}</span>
        </div>
        <input type="number" value={year} onChange={(e)=>setYear(parseInt(e.target.value||"0"))} style={{width:110}} />
      </div>

      <div className="card" style={{marginTop:10}}>
        <h4 style={{marginTop:0}}>Tax period</h4>
        {!period && <div className="note">Loading…</div>}
        {period && (
          <div className="row" style={{gap:10}}>
            <span className="badge">Year {year}</span>
            {period.stage && <span className="badge">{period.stage}</span>}
            {period.period?.id && <span className="badge">ID {period.period.id}</span>}
          </div>
        )}
      </div>

      <Section title="Personal documents" checklist={personalChecklist} />
      <Section title="Tax documents" checklist={taxChecklist} />

      <div className="card" style={{marginTop:10}}>
        <h3 style={{margin:0}}>My uploads</h3>
        {!docs.length && <div className="note" style={{marginTop:6}}>No documents yet.</div>}
        {!!docs.length && docs.map((d)=> (<DocCard key={d.id} d={d} />))}
      </div>

      {error && <div className="alert" style={{marginTop:10}}>{String(error)}</div>}
    </div>
  );
}
