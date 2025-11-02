import React, { useEffect, useState } from "react";
import { periodStatus, listFirms, selectFirm } from "../components/api";

/**
 * Показывает нужный экран по flow_state, который отдаёт /periods/status.
 * flow_state:
 *  - NEEDS_FIRM
 *  - NEEDS_PROFILE
 *  - NEEDS_DOCUMENTS
 *  - NEEDS_PAYMENT
 *  - IN_REVIEW
 */
export default function DriverFlow({ API, token, me, year }) {
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState(null); // {flow_state, period_id, stage, checklist}
  const [err, setErr] = useState("");

  async function load() {
    if (!me) return;
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

  const fs = flow.flow_state;

  if (fs === "NEEDS_FIRM") {
    return <ChooseFirm API={API} token={token} onChosen={load} />;
  }
  if (fs === "NEEDS_PROFILE") {
    return (
      <div className="card">
        <h2>Complete your profile</h2>
        <p>We need a few details before we start.</p>
        <a className="primary" href="/profile">Open profile</a>
      </div>
    );
  }
  if (fs === "NEEDS_DOCUMENTS") {
    return (
      <div className="card">
        <h2>Your checklist</h2>
        <p>Please upload requested documents.</p>
        <a className="primary" href="/documents">Open checklist</a>
      </div>
    );
  }
  if (fs === "NEEDS_PAYMENT") {
    return (
      <div className="card">
        <h2>Submit for review</h2>
        <p>All documents are ready. Please submit to your accountant.</p>
        <a className="primary" href="/submit">Submit</a>
      </div>
    );
  }
  if (fs === "IN_REVIEW") {
    return (
      <div className="card">
        <h2>In review</h2>
        <p>Your accountant is working on your return.</p>
        <a className="secondary" href="/chat">Open chat</a>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Dashboard</h2>
      <pre className="note">{JSON.stringify(flow, null, 2)}</pre>
    </div>
  );
}

function formatPrice(services_pricing) {
  if (!services_pricing) return null;
  if (/^\d+(\.\d+)?$/.test(String(services_pricing))) return `$${Number(services_pricing).toFixed(0)}`;
  try {
    const obj = JSON.parse(services_pricing);
    const key = Object.keys(obj)[0];
    const val = obj[key];
    return `$${Number(val).toFixed(0)}`;
  } catch {
    return null;
  }
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
        setFirms(f || []);
      } catch (e) { setErr(String(e?.message || e)); }
      finally { setLoading(false); }
    })();
  }, [API, token]);

  async function choose(id) {
    try {
      await selectFirm(API, token, id);
      onChosen?.();
    } catch (e) { alert(String(e?.message || e)); }
  }

  return (
    <div className="card">
      <h2>Choose your accounting firm</h2>
      {loading && <div className="note">Loading…</div>}
      {err && <div className="alert">{err}</div>}

      <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
        {(firms || []).map(f => (
          <div key={f.id} className="tile">
            <div>
              <div style={{ fontWeight: 700 }}>{f.name}</div>
              <div className="note" style={{ marginTop: 4 }}>{f.description}</div>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                {f.avg_rating != null && <span className="badge">★ {Number(f.avg_rating).toFixed(1)}</span>}
                {formatPrice(f.services_pricing) && <span className="badge">{formatPrice(f.services_pricing)}</span>}
              </div>
            </div>
            <button className="secondary rightChip" onClick={() => choose(f.id)}>Choose</button>
          </div>
        ))}
      </div>
    </div>
  );
}
