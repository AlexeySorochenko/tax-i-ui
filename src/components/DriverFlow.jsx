import React, { useEffect, useState } from "react";
import {
  periodStatus,
  listFirms,
  selectFirm,
  getBusinessProfiles,
  createBusinessProfile,
  getBusinessExpenses,
  putBusinessExpenses,
} from "../components/api";
import Onboarding from "./Onboarding";
import DriverSelf from "./DriverSelf";
import ExpenseWizard from "./ExpenseWizard"; // ← используем существующий визард

/**
 * Состояния флоу по /periods/status:
 *  - NEEDS_FIRM        → выбор фирмы
 *  - NEEDS_PROFILE     → авто-открываем форму профиля (шаг 2 онбординга)
 *  - (локально) expenses → ExpenseWizard (опросник расходов)
 *  - NEEDS_DOCUMENTS   → чек-лист документов
 *  - NEEDS_PAYMENT     → отправка на проверку + чат
 *  - IN_REVIEW         → статус + чат
 */
export default function DriverFlow({ API, token, me, year }) {
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState(null);
  const [err, setErr] = useState("");
  const [firms, setFirms] = useState([]);
  const [subview, setSubview] = useState(null); // "profile" | "expenses" | "documents" | "chat" | null

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const st = await periodStatus(API, token, me?.id, year);
      setFlow(st?.flow_state || "NEEDS_FIRM");
    } catch (e) {
      setErr(String(e?.message || e));
      setFlow(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [year]);

  // Подгружаем фирмы при NEEDS_FIRM
  useEffect(() => {
    if (flow === "NEEDS_FIRM") {
      listFirms(API, token)
        .then((x) => setFirms(Array.isArray(x) ? x : []))
        .catch((e) => { setErr(String(e?.message || e)); setFirms([]); });
    }
    // eslint-disable-next-line
  }, [flow]);

  // Авто-открываем профиль ОДИН РАЗ
  useEffect(() => {
    if (flow === "NEEDS_PROFILE" && subview == null) {
      setSubview("profile");
    }
  }, [flow, subview]);

  async function choose(firmId) {
    try {
      await selectFirm(API, token, firmId);
      await refresh(); // бэкенд переключит на NEEDS_PROFILE → выше откроется форма (один раз)
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  // ====== Встроенные саб-экраны без переходов ======
  if (subview === "profile") {
    return (
      <Onboarding
        API={API}
        token={token}
        me={me}
        initialStep={2}
        onDoneNext={() => { setSubview("expenses"); }} // после профиля → к визарду расходов
      />
    );
  }

  if (subview === "expenses") {
    // Локальная логика для визарда расходов (без нового компонента)
    const [busy, setBusy] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [biz, setBiz] = useState(null);   // { id, name, ... }
    const [items, setItems] = useState([]); // [{ code, label, amount|null }]

    useEffect(() => {
      let alive = true;
      (async () => {
        setBusy(true); setError("");
        try {
          // 1) гарантируем, что есть бизнес-профиль
          const list = await getBusinessProfiles(API, token, me.id);
          let bp = (Array.isArray(list) && list[0]) || null;
          if (!bp) {
            bp = await createBusinessProfile(API, token, {
              name: "My Business",
              business_code: "TAXI_EXPENSES",
            });
          }
          if (!alive) return;
          setBiz(bp);

          // 2) тянем список расходов за год
          const ex = await getBusinessExpenses(API, token, bp.id, year);
          if (!alive) return;
          setItems(Array.isArray(ex) ? ex : []);
        } catch (e) {
          if (!alive) return;
          setError(String(e?.message || e));
        } finally {
          if (alive) setBusy(false);
        }
      })();
      return () => { alive = false; };
      // eslint-disable-next-line
    }, [year]);

    const onSaveOne = async (code, amountOrNull) => {
      if (!biz) return;
      setSaving(true); setError("");
      try {
        const next = (items || []).map(i => i.code === code ? { ...i, amount: amountOrNull } : i);
        setItems(next);
        await putBusinessExpenses(
          API, token, biz.id, year,
          next.map(i => ({ code: i.code, amount: i.amount ?? 0 }))
        );
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setSaving(false);
      }
    };

    const onFinished = () => {
      setSubview("documents"); // после «Finish» идём на загрузку документов
    };

    return (
      <div>
        {error && <div className="alert" style={{ marginBottom: 8 }}>{error}</div>}
        {busy
          ? <div className="card"><div className="note">Loading…</div></div>
          : (
            <ExpenseWizard
              year={year}
              items={items}
              onSaveOne={onSaveOne}
              onFinished={onFinished}
              // по желанию можно добавить кнопку смены фирмы:
              // onGoToFirms={() => { setSubview(null); setFlow("NEEDS_FIRM"); }}
            />
          )
        }
      </div>
    );
  }

  if (subview === "documents") {
    return (
      <div className="card">
        <DriverSelf API={API} token={token} me={me} />
      </div>
    );
  }

  if (subview === "chat") {
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

  // ====== Основные состояния ======
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
                  {f.avg_rating != null && (
                    <span className="badge" style={{ marginRight: 8 }}>★ {Number(f.avg_rating).toFixed(1)}</span>
                  )}
                  {priceBadge(f.services_pricing) && (
                    <span className="badge">{priceBadge(f.services_pricing)}</span>
                  )}
                  {f.description && (
                    <div className="note" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{f.description}</div>
                  )}
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
            <button onClick={() => setSubview("chat")}>Ask a question</button>
            <button className="primary" onClick={() => setFlow("IN_REVIEW")}>Submit</button>
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
