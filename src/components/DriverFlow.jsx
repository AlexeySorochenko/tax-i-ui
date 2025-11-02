import React, { useEffect, useState } from "react";
import { periodStatus, listFirms, selectFirm } from "../components/api";
import Onboarding from "./Onboarding";
import DriverSelf from "./DriverSelf";
import DriverQuestionnaire from "./DriverQuestionnaire";

/**
 * Экран водителя по состоянию флоу из /periods/status:
 *  - NEEDS_FIRM        => выбор бухгалтерской фирмы
 *  - NEEDS_PROFILE     => сразу открываем форму профиля (шаг 2 онбординга)
 *  - NEEDS_DOCUMENTS   => чек-лист документов
 *  - NEEDS_PAYMENT     => отправка на проверку + чат
 *  - IN_REVIEW         => статус + чат
 */
export default function DriverFlow({ API, token, me, year }) {
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState(null);
  const [err, setErr] = useState("");
  const [firms, setFirms] = useState([]);
  const [subview, setSubview] = useState(null); // "profile" | "questionnaire" | "documents" | "chat" | null

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

  // Авто-открываем форму профиля ОДИН РАЗ
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
        onDoneNext={() => { setSubview("questionnaire"); }} // сразу к опроснику
      />
    );
  }

  if (subview === "questionnaire") {
    return (
      <DriverQuestionnaire
        API={API}
        token={token}
        me={me}
        year={year}
        onBack={() => setSubview("profile")}
        onDone={() => { setSubview("documents"); }}
      />
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
