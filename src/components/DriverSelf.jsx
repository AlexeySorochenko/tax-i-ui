import React, { useEffect, useRef, useState } from "react";
import { authHeaders } from "./api.js";
import DocCard from "./DocCard.jsx";

/**
 * Driver portal — полностью динамический чек-лист:
 * - НЕ знает типов документов;
 * - Берёт чек-лист с бэка: GET /api/v1/periods/status/{me.id}/{year}
 *   Формат ожидается такой:
 *     1) { status: "not_started", message: "..." }
 *     2) { period_id, stage, checklist: [{ document, status }, ...] }
 * - Кнопки Upload/Photograph активны только при status in ["missing","needs_review","rejected"].
 * - После успешной загрузки перезагружаем статус и список документов.
 */
export default function DriverSelf({ API, token, me }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodStatus, setPeriodStatus] = useState(null); // null | {status:'not_started',message} | {period_id,stage,checklist}
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState(null);
  const [busyDoc, setBusyDoc] = useState(null); // document code currently uploading

  // скрытые инпуты по документ-коду
  const fileInputs = useRef({});
  const camInputs = useRef({});

  const canUploadFor = (itemStatus) =>
    ["missing", "needs_review", "rejected"].includes(itemStatus || "missing");

  const loadStatus = async () => {
    setError(null);
    try {
      const r = await fetch(`${API}/api/v1/periods/status/${me.id}/${year}`, {
        headers: authHeaders(token),
      });
      // Бэкенд может вернуть 200 как для not_started, так и для обычного статуса
      const payload = await r.json().catch(async () => {
        // если тело не JSON
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
    setError(null);
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
  const triggerCam = (code) => camInputs.current[code]?.click();

  const handlePicked = async (code, file) => {
    if (!file) return;
    setError(null);
    setBusyDoc(code);
    try {
      const form = new FormData();
      form.append("file", file);
      // Опционально: если бэк поддерживает маппинг по коду требования — передадим.
      // Это не ломает старый бэк, просто будет проигнорировано.
      form.append("expected_document_code", code);

      await fetch(`${API}/api/v1/documents/upload/${me.id}`, {
        method: "POST",
        headers: authHeaders(token),
        body: form,
      });
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

  // Удобные геттеры
  const isNotStarted =
    periodStatus && typeof periodStatus === "object" && periodStatus.status === "not_started";
  const checklist = !isNotStarted && periodStatus?.checklist ? periodStatus.checklist : []; // [{document, status}]
  const stage = !isNotStarted ? periodStatus?.stage : null;
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

      {/* Блок статуса периода */}
      <div className="card" style={{ marginTop: 10 }}>
        <h3>Tax period</h3>
        {isNotStarted && (
          <div className="note" style={{ marginTop: 6 }}>
            {periodStatus?.message || `Your firm has not enabled your ${year} period yet.`}
          </div>
        )}
        {!isNotStarted && (
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
                const code = item.document; // напр. "W2", "DL", ...
                const st = item.status;     // missing|uploaded|needs_review|approved|rejected
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
                      {/* hidden inputs */}
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
                        capture="environment"   /* на десктопах игнорируется — это норма */
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

      {/* Мои загрузки — чтобы видеть распарсенные поля/качество */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>My uploads</h3>
        {docs.length === 0 && <p className="note">No documents yet.</p>}
        <div>{docs.map((d) => <DocCard key={d.id} d={d} />)}</div>
      </div>
    </div>
  );
}
