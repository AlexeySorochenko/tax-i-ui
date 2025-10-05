import React, { useEffect, useRef, useState } from "react";
import { authHeaders } from "./api.js";
import DocCard from "./DocCard.jsx";

/**
 * Полностью динамический чек-лист:
 * - НЕ содержит хардкода типов документов;
 * - Берёт чек-лист с бэка: GET /api/v1/periods/status/{me.id}/{year}
 *   Форматы ответов:
 *     1) { status: "not_started", message }
 *     2) { period_id, stage, checklist: [{ document, status }, ...] }
 * - Кнопки Upload/Photograph активны только при status ∈ {"missing","needs_review","rejected"}.
 * - После успешной загрузки перезагружаем чек-лист и список документов.
 */
export default function DriverSelf({ API, token, me }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodStatus, setPeriodStatus] = useState(null);  // null | not_started | нормальный объект
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState(null);
  const [busyDoc, setBusyDoc] = useState(null); // document code currently uploading

  // скрытые инпуты по коду документа
  const fileInputs = useRef({});
  const camInputs  = useRef({});

  const canUploadFor = (st) => ["missing", "needs_review", "rejected"].includes(st || "missing");

  const loadStatus = async () => {
    setError(null);
    try {
      const r = await fetch(`${API}/api/v1/periods/status/${me.id}/${year}`, {
        headers: authHeaders(token),
      });
      const payload = await r.json().catch(async () => {
        const txt = await r.text();
        throw new Error(txt || `${r.status} ${r.statusText}`);
      });
      setPeriodStatus(payload);
    } catch (e) {
      setPeriodStatus(null);
      setError(String(e));
    }
  };

  const loadDocs = async () => {
    try {
      const r = await fetch(`${API}/api/v1/documents/by-driver/${me.id}`, {
        headers: authHeaders(token),
      });
      if (!r.ok) throw new Error(await r.text());
      setDocs(await r.json());
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    loadStatus();
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id, year]);

  const triggerFile = (code) => fileInputs.current[code]?.click();
  const triggerCam  = (code) => camInputs.current[code]?.click();

  const handlePicked = async (code, file) => {
    if (!file) return;
    setError(null);
    setBusyDoc(code);
    try {
      const form = new FormData();
      // имя поля ДОЛЖНО быть "file"
      form.append("file", file);

      // твоя идея: передать год и тип документа через query — это безопасно
      const url = `${API}/api/v1/documents/upload/${me.id}?year=${encodeURIComponent(
        year
      )}&document_type_code=${encodeURIComponent(code)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(token), // НЕ ставить Content-Type вручную!
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Upload failed", res.status, txt);
        throw new Error(`Upload failed: ${res.status} ${txt}`);
      }

      await loadStatus();
      await loadDocs();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyDoc(null);
      if (fileInputs.current[code]) fileInputs.current[code].value = "";
      if (camInputs.current[code])  camInputs.current[code].value  = "";
    }
  };

  const isNotStarted =
    periodStatus && typeof periodStatus === "object" && periodStatus.status === "not_started";
  const checklist = !isNotStarted && Array.isArray(periodStatus?.checklist)
    ? periodStatus.checklist
    : []; // [{document, status}]
  const stage    = !isNotStarted ? periodStatus?.stage : null;
  const periodId = !isNotStarted ? periodStatus?.period_id : null;

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

      {/* Статус периода */}
      <div className="card" style={{ marginTop: 10 }}>
        <h3>Tax period</h3>
        {isNotStarted ? (
          <div className="note" style={{ marginTop: 6 }}>
            {periodStatus?.message || `Your firm has not enabled your ${year} period yet.`}
          </div>
        ) : (
          <div className="kv" style={{ marginTop: 6 }}>
            <div className="k">Year</div><div>{year}</div>
            <div className="k">Stage</div><div><span className="badge">{stage}</span></div>
            {periodId && (<><div className="k">Period ID</div><div>{periodId}</div></>)}
          </div>
        )}
      </div>

      {/* Чек-лист */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Checklist</h3>

        {isNotStarted && (
          <p className="note" style={{ marginTop: 4 }}>
            Once your firm enables the period, required documents will appear here.
          </p>
        )}

        {!isNotStarted && !checklist.length && (
          <p className="note" style={{ marginTop: 4 }}>No required documents for this year.</p>
        )}

        {!isNotStarted && !!checklist.length && (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ width: 200 }}>Document</th>
                <th>Status</th>
                <th style={{ width: 340 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((item) => {
                const code = item.document; // "W2", "DL", ...
                const st   = item.status;   // missing|uploaded|needs_review|approved|rejected
                const done = st === "uploaded" || st === "approved";
                const actionable = canUploadFor(st);

                return (
                  <tr
                    key={code}
                    style={{ background: done ? "rgba(16,185,129,.08)" : "transparent" }}
                  >
                    <td><b>{code}</b></td>
                    <td>
                      <span className={`badge ${done ? "ok" : st === "needs_review" || st === "rejected" ? "warn" : "warn"}`}>
                        {done ? "Uploaded" : st.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {/* скрытые инпуты */}
                      <input
                        ref={(el) => (fileInputs.current[code] = el)}
                        type="file"
                        accept="image/*,.pdf"
                        style={{ display: "none" }}
                        onChange={(e) => handlePicked(code, e.target.files?.[0])}
                      />
                      <input
                        ref={(el) => (camInputs.current[code] = el)}
                        type="file"
                        accept="image/*"
                        capture="environment"   /* на десктопах игнорируется — норма */
                        style={{ display: "none" }}
                        onChange={(e) => handlePicked(code, e.target.files?.[0])}
                      />

                      {actionable ? (
                        <div className="row">
                          <button
                            className="secondary"
                            onClick={() => triggerFile(code)}
                            disabled={busyDoc === code}
                          >
                            Upload
                          </button>
                          <button
                            onClick={() => triggerCam(code)}
                            disabled={busyDoc === code}
                          >
                            Photograph
                          </button>
                        </div>
                      ) : (
                        <span className="note">No action required</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* История загрузок */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>My uploads</h3>
        {docs.length === 0 && <p className="note">No documents yet.</p>}
        <div>{docs.map((d) => <DocCard key={d.id} d={d} />)}</div>
      </div>
    </div>
  );
}
