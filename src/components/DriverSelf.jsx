import React, { useEffect, useState } from "react";
import { authHeaders } from "./api.js";
import DocCard from "./DocCard.jsx";
import StatusPills from "./StatusPills.jsx";

/**
 * Driver portal:
 * - Upload document (image/PDF). On mobile, opens camera (capture='environment').
 * - View tax period status (read-only).
 * - See own documents list.
 *
 * NOTE: ensure/advance period endpoints обычно только для accountant,
 * поэтому здесь их нет, чтобы не ловить 403.
 */
export default function DriverSelf({ API, token, me }) {
  const [docs, setDocs] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

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

  const upload = async () => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await fetch(`${API}/api/v1/documents/upload/${me.id}`, {
        method: "POST",
        headers: authHeaders(token),
        body: form,
      });
      setFile(null);
      await loadDocs();
      await loadStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
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

      <div className="grid grid-cols-2" style={{ marginTop: 10 }}>
        <div className="card">
          <h3>Upload document</h3>
          <div className="row" style={{ marginTop: 8 }}>
            <input
              type="file"
              accept="image/*,.pdf"
              capture="environment"   /* на мобиле откроет камеру */
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button onClick={upload} disabled={!file || busy}>Upload</button>
          </div>
          <p className="note" style={{ marginTop: 8 }}>
            Supports photos and PDFs. We’ll auto-enhance, OCR and extract fields.
          </p>
        </div>

        <div className="card">
          <h3>Tax period status</h3>
          {!status && <div className="note">No status yet for {year}.</div>}
          {status && (
            <div>
              <div className="kv" style={{ marginTop: 6 }}>
                <div className="k">Stage</div>
                <div><span className="badge">{status.period?.stage}</span></div>
                <div className="k">Year</div>
                <div>{status.period?.year}</div>
              </div>
              <StatusPills title="Expected" items={status.period?.expected_docs || []} />
              <StatusPills title="Have" tone="ok" items={status.have || []} />
              <StatusPills title="Missing" tone="warn" items={status.missing || []} />
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Documents</h3>
        {docs.length === 0 && <p className="note">No documents yet.</p>}
        <div>
          {docs.map((d) => <DocCard key={d.id} d={d} />)}
        </div>
      </div>
    </div>
  );
}
