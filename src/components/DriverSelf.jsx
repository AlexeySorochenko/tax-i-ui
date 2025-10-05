import React, { useEffect, useMemo, useRef, useState } from "react";
import { authHeaders } from "./api.js";
import DocCard from "./DocCard.jsx";
import StatusPills from "./StatusPills.jsx";

/**
 * Driver portal — checklist UX:
 * - Показывает список требуемых документов (из /periods/status), если статуса нет — ["W2","1099NEC","DL"].
 * - Для каждого документа: Upload (файлы/пдф) и Photograph (камера на мобиле).
 * - После удачной загрузки — перезагружаем статус и подсвечиваем строку зелёным (Uploaded).
 */
export default function DriverSelf({ API, token, me }) {
  const [docs, setDocs] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState(null);
  const [busyMap, setBusyMap] = useState({});
  const [error, setError] = useState(null);

  const fileInputs = useRef({});
  const camInputs = useRef({});

  const setBusy = (docType, v) =>
    setBusyMap((m) => ({ ...m, [docType]: v }));

  const loadDocs = async () => {
    try {
      const r = await fetch(`${API}/api/v1/documents/by-driver/${me.id}`, {
        headers: authHeaders(token),
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      setDocs(await r.json());
    } catch (e) {
      setError(String(e));
    }
  };

  const loadStatus = async () => {
    try {
      const r = await fetch(`${API}/api/v1/periods/status/${me.id}/${year}`, {
        headers: authHeaders(token),
      });
      if (!r.ok) { setStatus(null); return; }
      setStatus(await r.json());
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => { loadDocs(); loadStatus(); }, [me.id, year]);

  const expectedDocs = useMemo(() => {
    return status?.period?.expected_docs?.length
      ? status.period.expected_docs
      : ["W2", "1099NEC", "DL"];
  }, [status]);

  const haveSet = useMemo(() => new Set(status?.have || []), [status]);

  const triggerFile = (docType) => fileInputs.current[docType]?.click();
  const triggerCam  = (docType) => camInputs.current[docType]?.click();

  const handlePicked = async (docType, file) => {
    if (!file) return;
    setError(null);
    setBusy(docType, true);
    try {
      const form = new FormData();
      form.append("file", file);
      await fetch(`${API}/api/v1/documents/upload/${me.id}`, {
        method: "POST",
        headers: authHeaders(token),
        body: form,
      });
      await loadDocs();
      await loadStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(docType, false);
      if (fileInputs.current[docType]) fileInputs.current[docType].value = "";
      if (camInputs.current[docType])  camInputs.current[docType].value  = "";
    }
  };

  return (
    <div>
      <div className="row spread">
        <div className="row" style={{ gap: 10 }}>
          <h2>My Documents</h2>
          <span className="badge">{me.email}</span>
        </div>
        <div className="row">
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value || "0"))}
            style={{ width: 120 }}
          />
        </div>
      </div>

      {error && <div className="alert" style={{ margin: "10px 0" }}>{error}</div>}

      <div className="card" style={{ marginTop: 10 }}>
        <h3>Checklist</h3>
        <p className="note" style={{ marginTop: 4 }}>
          Upload or photograph each required document. Rows turn green when uploaded successfully.
        </p>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Document</th>
              <th>Status</th>
              <th style={{ width: 320 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {expectedDocs.map((dt) => {
              const uploaded = haveSet.has(dt);
              return (
                <tr
                  key={dt}
                  style={{ background: uploaded ? "rgba(16,185,129,.08)" : "transparent" }}
                >
                  <td><b>{dt}</b></td>
                  <td>
                    <span className={`badge ${uploaded ? "ok" : "warn"}`}>
                      {uploaded ? "Uploaded" : "Missing"}
                    </span>
                  </td>
                  <td>
                    <input
                      ref={(el) => (fileInputs.current[dt] = el)}
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => handlePicked(dt, e.target.files?.[0])}
                    />
                    <input
                      ref={(el) => (camInputs.current[dt] = el)}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: "none" }}
                      onChange={(e) => handlePicked(dt, e.target.files?.[0])}
                    />
                    <div className="row">
                      <button
                        className="secondary"
                        onClick={() => triggerFile(dt)}
                        disabled={!!busyMap[dt]}
                      >
                        Upload
                      </button>
                      <button
                        onClick={() => triggerCam(dt)}
                        disabled={!!busyMap[dt]}
                      >
                        Photograph
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!expectedDocs.length && (
              <tr><td colSpan="3" className="note">No required documents configured for this year.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Tax period status</h3>
          {!status && (
            <div className="note">No status yet for {year}. Your firm will enable your period soon.</div>
          )}
          {status && (
            <div>
              <div className="kv" style={{ marginTop: 6 }}>
                <div className="k">Stage</div><div><span className="badge">{status.period?.stage}</span></div>
                <div className="k">Year</div><div>{status.period?.year}</div>
              </div>
              <StatusPills title="Expected" items={status.period?.expected_docs || []} />
              <StatusPills title="Have" tone="ok" items={status.have || []} />
              <StatusPills title="Missing" tone="warn" items={status.missing || []} />
            </div>
          )}
        </div>

        <div className="card">
          <h3>My uploads</h3>
          {docs.length === 0 && <p className="note">No documents yet.</p>}
          <div>{docs.map((d) => <DocCard key={d.id} d={d} />)}</div>
        </div>
      </div>
    </div>
  );
}
