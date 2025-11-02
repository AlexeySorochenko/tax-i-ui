import React, { useEffect, useState } from "react";
import { periodStatus, listFirms, selectFirm } from "../components/api";
import Onboarding from "./Onboarding";
import DriverSelf from "./DriverSelf";

/**
 * Отрисовывает экран в зависимости от flow_state из /periods/status:
 *  - NEEDS_FIRM        => выбор бухгалтерской фирмы
 *  - NEEDS_PROFILE     => CTA на профиль
 *  - NEEDS_DOCUMENTS   => CTA на чек-лист документов
 *  - NEEDS_PAYMENT     => CTA на оплату/отправку
 *  - IN_REVIEW         => статус + чат
 */
export default function DriverFlow({ API, token, me, year }) {
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState(null);
  const [subview, setSubview] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    if (!me?.id) return;
    setLoading(true); setErr("");
    try {
      const st = await periodStatus(API, token, me.id, year);
      setFlow(st);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [API, token, me?.id, year]);

  if (loading) return <div className="card">Loading…</div>;
  if (err) return <div className="card alert">{err}</div>;
  if (!flow) return <div className="card">No data</div>;

  switch (flow.flow_state) {
    case "NEEDS_FIRM":
      return <ChooseFirm API={API} token={token} onChosen={load} />;
    case "NEEDS_PROFILE":
      return (
        <div className="card">
          <h2>Complete your profile</h2>
          <p>We need a few details before we start.</p>
          <a className="primary" onClick={()=>setSubview("profile")}>Open profile</a>
        </div>
      );
    case "NEEDS_DOCUMENTS":
      return (
        <div className="card">
          <h2>Your checklist</h2>
          <p>Please upload requested documents.</p>
          <a className="primary" onClick={()=>setSubview("documents")}>Open checklist</a>
        </div>
      );
    case "NEEDS_PAYMENT":
      return (
        <div className="card">
          <h2>Submit for review</h2>
          <p>All documents are ready. Please submit to your accountant.</p>
          <div className="row" style={{ gap: 8 }}>
            <button onClick={() => setSubview("chat")}>Ask a question</button>
            <button
              className="primary"
              onClick={async () => {
                try {
                  await submitPaymentStub(API, token, year);
                  await refresh(); // вернётся IN_REVIEW из /periods/status
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
          <p>Your accountant is working on your return.</p>
          <a className="secondary" onClick={()=>setSubview("chat") }>Open chat</a>
        </div>
      );
    default:
      return (
        <div className="card">
          <h2>Dashboard</h2>
          <pre className="note">{JSON.stringify(flow, null, 2)}</pre>
        </div>
      );
  }
}

function priceBadge(services_pricing) {
  if (!services_pricing) return null;
  // Поддержка как "1000", так и JSON-строки {"standard":250}
  const str = String(services_pricing);
  if (/^\d+(\.\d+)?$/.test(str)) return `$${Number(str).toFixed(0)}`;
  try {
    const obj = JSON.parse(str);
    const key = Object.keys(obj)[0];
    const val = obj[key];
    if (val == null || isNaN(Number(val))) return null;
    return `$${Number(val).toFixed(0)}`;
  } catch { return null; }
}

function ChooseFirm({ API, token, onChosen }) {
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const f = await listFirms(API, token);
        setFirms(Array.isArray(f) ? f : []);
      } catch (e) {
        setErr(String(e?.message || e));
      } finally { setLoading(false); }
    })();
  }, [API, token]);

  async function choose(id) {
    try {
      await selectFirm(API, token, id);
      onChosen?.();
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

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
}
