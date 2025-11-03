import React, { useEffect, useState } from "react";
import {
  periodStatus,
  listFirms,
  selectFirm,
  getBusinessProfiles,
  createBusinessProfile,
  getBusinessExpenses,
  putBusinessExpenses,
  getBusinessSummary,
  submitPaymentStub,
} from "../components/api";
import Onboarding from "./Onboarding";
import DriverSelf from "./DriverSelf";
import ExpenseWizard from "./ExpenseWizard";

/**
 * Flow:
 * NEEDS_FIRM → NEEDS_PROFILE → (subview: expenses) → (subview: summary) → NEEDS_DOCUMENTS → NEEDS_PAYMENT → IN_REVIEW (чат)
 */
export default function DriverFlow({ API, token, me, year }) {
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState(null);
  const [err, setErr] = useState("");
  const [firms, setFirms] = useState([]);
  const [subview, setSubview] = useState(null); // "profile" | "expenses" | "summary" | "documents" | "chat" | null

  // Состояние визарда расходов
  const [expBusy, setExpBusy] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const [expError, setExpError] = useState("");
  const [expBiz, setExpBiz] = useState(null);
  const [expItems, setExpItems] = useState([]);

  // Состояние Summary
  const [sumBusy, setSumBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [sumError, setSumError] = useState("");

  async function refresh() {
    setLoading(true); setErr("");
    try {
      const st = await periodStatus(API, token, me?.id, year);
      setFlow(st?.flow_state || "NEEDS_FIRM");
    } catch (e) {
      setErr(String(e?.message || e)); setFlow(null);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [year]);

  // Загрузка фирм
  useEffect(() => {
    if (flow === "NEEDS_FIRM") {
      listFirms(API, token)
        .then((x) => setFirms(Array.isArray(x) ? x : []))
        .catch((e) => { setErr(String(e?.message || e)); setFirms([]); });
    }
    // eslint-disable-next-line
  }, [flow]);

  // Открываем онбординг профиля один раз
  useEffect(() => {
    if (flow === "NEEDS_PROFILE" && subview == null) setSubview("profile");
  }, [flow, subview]);

  // Подготовка визарда расходов: бизнес-профиль + список расходов (mode=full)
  useEffect(() => {
    let alive = true;
    async function loadExpenses() {
      setExpBusy(true); setExpError("");
      try {
        // 1) берём/создаем бизнес-профиль
        const list = await getBusinessProfiles(API, token, me.id);
        let bp = (Array.isArray(list) && list[0]) || null;
        if (!bp) {
          // по умолчанию используем TAXI; если нужна развилка Taxi/Truck — добавим позже отдельным шагом
          bp = await createBusinessProfile(API, token, { name: "My Business", business_code: "TAXI" });
        }
        if (!alive) return;
        setExpBiz(bp);

        // 2) тянем новый "умный" список
        const full = await getBusinessExpenses(API, token, bp.id, year, { full: true });
        if (!alive) return;
        setExpItems(Array.isArray(full) ? full : []);
      } catch (e) {
        if (!alive) return;
        setExpError(String(e?.message || e));
      } finally {
        if (alive) setExpBusy(false);
      }
    }
    if (subview === "expenses") loadExpenses();
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [subview, year]);

  // Загрузка бизнес-сводки после визарда
  useEffect(() => {
    let alive = true;
    async function loadSummary() {
      if (!expBiz) return;
      setSumBusy(true); setSumError(""); setSummary(null);
      try {
        const sum = await getBusinessSummary(API, token, expBiz.id, year);
        if (!alive) return;
        setSummary(sum || null);
      } catch (e) {
        if (!alive) return;
        setSumError(String(e?.message || e));
      } finally {
        if (alive) setSumBusy(false);
      }
    }
    if (subview === "summary" && expBiz?.id) loadSummary();
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [subview, expBiz, year]);

  async function choose(firmId) {
    try {
      await selectFirm(API, token, firmId);
      await refresh(); // бэк переключит на NEEDS_PROFILE
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  // Сохранение одной позиции расходов (посылаем весь снапшот из визарда выше в DriverFlow)
  async function onSaveOneExpense(code, amountOrNull) {
    if (!expBiz) return;
    setExpSaving(true); setExpError("");
    try {
      const next = (expItems || []).map(i => i.code === code ? { ...i, amount: amountOrNull } : i);
      setExpItems(next);
      await putBusinessExpenses(
        API, token, expBiz.id, year,
        next.map(i => {
          const payload = { code: i.code, amount: i.amount ?? 0 };
          if (i.is_custom) { payload.is_custom = true; if (i.custom_label) payload.custom_label = i.custom_label; }
          return payload;
        })
      );
    } catch (e) {
      setExpError(String(e?.message || e));
    } finally {
      setExpSaving(false);
    }
  }

  /* ===== Сабвью ===== */

  if (subview === "profile") {
    return (
      <Onboarding
        API={API}
        token={token}
        me={me}
        initialStep={2}
        onDoneNext={() => { setSubview("expenses"); }} // → визард расходов
      />
    );
  }

  if (subview === "expenses") {
    return (
      <div>
        {expError && <div className="alert" style={{ marginBottom: 8 }}>{expError}</div>}
        {expBusy
          ? <div className="card"><div className="note">Loading…</div></div>
          : (
            <ExpenseWizard
              year={year}
              items={expItems}
              saving={expSaving}
              onSaveOne={onSaveOneExpense}
              onFinished={() => setSubview("summary")} // после визарда → сводка
            />
          )
        }
      </div>
    );
  }

  if (subview === "summary") {
    return (
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Business summary — {year}</h2>
          <div className="note">{expBiz?.name || ""}</div>
        </div>

        {sumError && <div className="alert" style={{ marginTop: 8 }}>{sumError}</div>}
        {sumBusy && <div className="note" style={{ marginTop: 8 }}>Loading…</div>}

        {!sumBusy && summary && (
          <div style={{ marginTop: 12 }}>
            <div className="tile" style={{ alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Total</div>
              <div style={{ marginLeft: "auto", fontWeight: 700 }}>${Number(summary.total || 0).toFixed(2)}</div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 8 }}>
              {(summary.categories || []).map((c) => (
                <div key={c.code} className="tile" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <div>{c.label || c.code}</div>
                  <div style={{ fontWeight: 600 }}>${Number(c.amount || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="note" style={{ marginTop: 8 }}>
              Filled: <b>{summary.filled ?? 0}</b> • Missing: <b>{summary.missing ?? 0}</b> • Custom: <b>{summary.has_custom ? "Yes" : "No"}</b>
            </div>

            <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button className="secondary" onClick={() => setSubview("expenses")}>Edit</button>
              <button className="primary" onClick={() => setSubview("documents")} style={{ marginLeft: 8 }}>Proceed</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Чеклист документов
  if (subview === "documents") {
    return (
      <div className="card">
        <DriverSelf API={API} token={token} me={me} />
      </div>
    );
  }

  // Чат — только после оплаты
  if (subview === "chat") {
    if (flow !== "IN_REVIEW") {
      setSubview(null); // защита
    } else {
      return (
        <div className="card">
          <h2>Chat</h2>
          <div className="note">Your accountant will see your messages.</div>
          <textarea style={{ width: "100%", minHeight: 120 }} placeholder="Type a message..." />
          <div className="row" style={{ marginTop: 8, justifyContent: "flex-end" }}>
            <button className="secondary" onClick={() => setSubview(null)}>Back</button>
            <button onClick={() => alert("Message sent")}>Send</button>
          </div>
        </div>
      );
    }
  }

  /* ===== Основные состояния по flow ===== */

  function priceBadge(pricing) {
    if (!pricing) return null;
    const v = Number(pricing?.tax_return) || Number(pricing?.base);
    if (!v || Number.isNaN(v)) return null;
    return `$${v}`;
  }

  switch (flow) {
    case "NEEDS_FIRM":
      return (
        <div className="card">
          <h2>Choose your accounting firm</h2>
          {loading && <div className="note">Loading…</div>}
          {err && <div className="alert">{err}</div>}

          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
            {firms.map(f => (
              <div key={f.id} className="tile" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, wordBreak: "break-word" }}>{f.name}</div>
                  {f.avg_rating != null && (<span className="badge" style={{ marginRight: 8 }}>★ {Number(f.avg_rating).toFixed(1)}</span>)}
                  {priceBadge(f.services_pricing) && (<span className="badge">{priceBadge(f.services_pricing)}</span>)}
                  {f.description && (<div className="note" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{f.description}</div>)}
                </div>
                <button className="secondary rightChip" onClick={() => choose(f.id)}>Choose</button>
              </div>
            ))}
          </div>
        </div>
      );

    case "NEEDS_DOCUMENTS":
      return (
        <div className="card">
          <h2>Your checklist</h2>
          <p>Please upload requested documents.</p>
          <button className="primary" onClick={() => setSubview("documents")}>Open checklist</button>
        </div>
      );

    case "NEEDS_PAYMENT":
      return (
        <div className="card">
          <h2>Submit for review</h2>
          <p>All documents are ready. Please submit to your accountant.</p>
          <div className="row" style={{ gap: 8 }}>
            {/* ЧАТА здесь нет — появится после успешного Submit */}
            <button
              className="primary"
              onClick={async () => {
                try {
                  await submitPaymentStub(API, token, year);
                  await refresh(); // ожидается переход в IN_REVIEW
                } catch (e) {
                  alert(String(e));
                }
              }}
            >
              Submit
            </button>
          </div>
        </div>
      );

    case "IN_REVIEW":
      return (
        <div className="card">
          <h2>In review</h2>
          <div className="note">Your accountant is reviewing your documents.</div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button onClick={() => setSubview("chat")}>Open chat</button>
            <button className="secondary" onClick={() => setSubview("documents")}>View documents</button>
          </div>
        </div>
      );

    default:
      return (
        <div className="card">
          <h2>Welcome</h2>
          <div className="note">Select a firm to get started.</div>
          <button className="primary" onClick={() => setFlow("NEEDS_FIRM")}>Pick a firm</button>
        </div>
      );
  }
}
