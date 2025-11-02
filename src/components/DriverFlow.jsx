import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listFirms, selectFirm,
  getExpenses, saveExpenses,
  listBusinessProfiles, createBusinessProfile,
  uploadDoc, docsByDriver,
  periodStatus, submitPaymentStub
} from "./api";
import ExpenseWizard from "./ExpenseWizard";
// import ChatPanel from "./ChatPanel"; // подключи, если уже есть чат

/**
 * Новый упрощённый поток: весь роутинг по экранам идёт от flow_state,
 * который приходит из /api/v1/periods/status/{user_id}/{year}.
 *
 * flow_state:
 *  - NEEDS_FIRM       → экран выбора фирмы
 *  - NEEDS_PROFILE    → интервью по расходам (бэкенд создает/подскажет бизнес-профиль)
 *  - NEEDS_DOCUMENTS  → чек-лист без кнопки submit
 *  - NEEDS_PAYMENT    → чек-лист + кнопка Finish & submit
 *  - IN_REVIEW        → статус «В работе» (+ чат)
 */
export default function DriverFlow({ API, token, me, year }) {
  const [status, setStatus] = useState(null);          // { flow_state, period_id, stage, checklist, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // данные для разных экранов
  const [firms, setFirms] = useState([]);
  const [selectedFirm, setSelectedFirm] = useState(null);

  const [expenses, setExpenses] = useState([]);        // [{code,label,amount}]
  const [bpId, setBpId] = useState(null);              // выбранный/созданный бизнес-профиль

  const [docs, setDocs] = useState([]);
  const [busyDoc, setBusyDoc] = useState({});
  const fileInputs = useRef({});

  // ---- общий refresh статуса ----
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

  // ====== NEEDS_FIRM =======================================================
  useEffect(() => {
    if (status?.flow_state === "NEEDS_FIRM") {
      listFirms(API, token).then(setFirms).catch(() => setFirms([]));
    }
  }, [status?.flow_state]);

  const confirmFirm = async () => {
    if (!selectedFirm) return;
    await selectFirm(API, token, selectedFirm);
    await refreshStatus(); // бэкенд переведёт в следующий flow_state
  };

  // ====== NEEDS_PROFILE (интервью) ========================================
  // тут бэкенд сам решает, какой бизнес-профиль использовать;
  // мы подстрахуемся: возьмём первый; если нет — создадим "Taxi business".
  const bootstrapInterview = async () => {
    try {
      const list = await listBusinessProfiles(API, token, me.id).catch(() => []);
      let useId = list?.[0]?.id || null;
      if (!useId) {
        const created = await createBusinessProfile(API, token, {
          name: "Taxi business",
          business_code: "485310",
          ein: ""
        }).catch(() => null);
        useId = created?.id || null;
      }
      setBpId(useId);
      if (useId) {
        const ex = await getExpenses(API, token, useId, year).catch(() => []);
        setExpenses(ex || []);
      } else {
        setExpenses([]);
      }
    } catch {
      setExpenses([]);
    }
  };

  useEffect(() => {
    if (status?.flow_state === "NEEDS_PROFILE") {
      bootstrapInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.flow_state]);

  const saveOneExpense = async (code, amount) => {
    const next = expenses.map(e => e.code === code ? { ...e, amount } : e);
    setExpenses(next);
    if (bpId) {
      // отправляем только заполненные
      await saveExpenses(API, token, bpId, year, next.filter(x => x.amount != null));
    }
  };

  const finishInterview = async () => {
    // после завершения просто рефрешим статус — бэкенд решает, что дальше
    await refreshStatus();
  };

  // ====== NEEDS_DOCUMENTS / NEEDS_PAYMENT =================================
  const refreshDocs = async () => {
    const d = await docsByDriver(API, token, me.id).catch(() => []);
    setDocs(d);
  };

  useEffect(() => {
    if (status?.flow_state === "NEEDS_DOCUMENTS" || status?.flow_state === "NEEDS_PAYMENT") {
      refreshDocs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.flow_state]);

  const onPick = async (code, file) => {
    if (!file) return;
    setBusyDoc(m => ({ ...m, [code]: true }));
    try {
      await uploadDoc(API, token, me.id, year, code, file);
      await refreshStatus(); // чек-лист обновится с сервера
      await refreshDocs();
    } catch (e) {
      alert(readErr(e));
    } finally {
      setBusyDoc(m => ({ ...m, [code]: false }));
      if (fileInputs.current[code]) fileInputs.current[code].value = "";
    }
  };

  const canSubmit = useMemo(() => {
    const items = status?.checklist || [];
    return items.length > 0 && !items.some(x => x.status === "missing");
  }, [status]);

  const submitAll = async () => {
    await submitPaymentStub(API, token, year);
    await refreshStatus(); // ожидаем переход в IN_REVIEW
  };

  // ========================================================================
  //                                  RENDER
  // ========================================================================
  if (loading && !status) {
    return (<div className="grid"><div className="card"><div className="note">Loading…</div></div></div>);
  }
  if (error) {
    return (<div className="grid"><div className="card"><div className="alert">Error: {error}</div></div></div>);
  }

  const flow = status?.flow_state;

  // --- NEEDS_FIRM ---
  if (flow === "NEEDS_FIRM") {
    return (
      <div className="grid">
        <div className="card">
          <h2>Choose your accounting firm</h2>
          <div className="note" style={{ marginTop: 6 }}>Pick a firm to get started.</div>
          <div className="tilegrid" style={{ marginTop: 12 }}>
            {(firms || []).map(f => (
              <button
                key={f.id}
                className={`tile ${selectedFirm === f.id ? "selected" : ""}`}
                onClick={() => setSelectedFirm(f.id)}
                style={{ textAlign: "left" }}
              >
                <div>
                  <b>{f.name}</b>
                  <div className="note">{f.description || "—"}</div>
                </div>
                <span className="badge">{selectedFirm === f.id ? "Selected" : "Choose"}</span>
              </button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={confirmFirm} disabled={!selectedFirm}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // --- NEEDS_PROFILE ---
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

  // --- NEEDS_DOCUMENTS / NEEDS_PAYMENT ---
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

        <Checklist
          list={status?.checklist || []}
          busy={busyDoc}
          onPick={onPick}
          fileInputs={fileInputs}
        />

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

  // --- IN_REVIEW ---
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

        <Checklist
          list={status?.checklist || []}
          busy={{}}
          onPick={() => {}}
          fileInputs={{ current: {} }}
        />

        {/* <ChatPanel API={API} token={token} driverId={me.id} myUserId={me.id} /> */}
      </div>
    );
  }

  // fallback
  return (
    <div className="grid">
      <div className="card">
        <h2>My dashboard</h2>
        <div className="note">Waiting for instructions…</div>
      </div>
    </div>
  );
}

/* -------------------- Checklist / Uploads --------------------- */

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
          <tr><th>Task</th><th>Status</th><th style={{ width: 140 }}>Action</th></tr>
        </thead>
        <tbody>
          {(list || []).map((it, i) => (
            <tr key={i}>
              <td>{it.document}</td>
              <td><span className={STATUS_PILL[it.status] || "badge"}>{it.status}</span></td>
              <td>
                <label className="secondary">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    ref={el => { fileInputs.current[it.document] = el; }}
                    onChange={(e) => onPick(it.document, e.target.files?.[0])}
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
      {docs?.map(d => (
        <div key={d.id} className="tile">
          <div className="row" style={{ gap: 8 }}>
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

function readErr(e) {
  try { const j = JSON.parse(String(e.message || e)); return j.detail || e.message; }
  catch { return String(e.message || e); }
}
