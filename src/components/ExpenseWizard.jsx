import React, { useEffect, useMemo, useState } from "react";

/**
 * props:
 *  - year: number
 *  - items: [{ code, label, amount|null }]
 *  - onSaveOne: (code, amount|null) => Promise|void
 *  - onFinished: () => Promise|void
 */
export default function ExpenseWizard({ year, items = [], onSaveOne, onFinished }) {
  const [step, setStep] = useState(0);
  const [local, setLocal] = useState(() => (items || []).map(x => ({ ...x, tempAmount: x.amount ?? "" })));
  const [answerYes, setAnswerYes] = useState(() => (items || []).map(x => (x.amount != null ? true : null)));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLocal((items || []).map(x => ({ ...x, tempAmount: x.amount ?? "" })));
    setAnswerYes((items || []).map(x => (x.amount != null ? true : null)));
    setStep(0);
  }, [items]);

  const len = local.length;
  const cur = local[step] || null;
  const progress = len ? Math.round((step / len) * 100) : 0;

  const total = useMemo(
    () => local.reduce((s, x) => s + (Number(x.tempAmount) || 0), 0),
    [local]
  );

  const canNext = useMemo(() => {
    const a = answerYes[step];
    if (a === null) return false;
    if (a === false) return true;
    const v = Number(local[step]?.tempAmount);
    return Number.isFinite(v) && v >= 0;
  }, [answerYes, step, local]);

  const setYes = (val) => {
    setAnswerYes(arr => arr.map((a, i) => (i === step ? val : a)));
    if (val === false) {
      setLocal(prev => prev.map((x, i) => (i === step ? { ...x, tempAmount: "" } : x)));
    }
  };

  const editAmount = (val) => {
    const clean = String(val).replace(",", ".");
    if (clean === "") {
      setLocal(prev => prev.map((x, i) => (i === step ? { ...x, tempAmount: "" } : x)));
      return;
    }
    const n = Number(clean);
    if (Number.isFinite(n) && n >= 0) {
      setLocal(prev => prev.map((x, i) => (i === step ? { ...x, tempAmount: clean } : x)));
    }
  };

  const bump = (d) => {
    setLocal(prev => prev.map((x, i) => {
      if (i !== step) return x;
      const v = Number(x.tempAmount || 0) + d;
      return { ...x, tempAmount: v < 0 ? 0 : Number(v.toFixed(2)) };
    }));
  };

  const persistCurrent = async () => {
    if (!cur) return;
    const yes = answerYes[step];
    const toSave = yes ? Number(local[step].tempAmount || 0) : null;
    if (onSaveOne) await onSaveOne(cur.code, toSave);
  };

  const next = async () => {
    if (!canNext || busy) return;
    setBusy(true); setErr("");
    try {
      await persistCurrent();
      if (step + 1 < len) setStep(step + 1);
      else if (onFinished) await onFinished();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally { setBusy(false); }
  };

  const back = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      await persistCurrent();
      setStep(s => (s > 0 ? s - 1 : 0));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally { setBusy(false); }
  };

  if (!cur) {
    return (
      <div className="card">
        <h2>Expense interview — {year}</h2>
        <div className="note">No questions for this year.</div>
      </div>
    );
  }

  const hint = HINTS[cur.code] || DEFAULT_HINT;

  return (
    <div className="card wizard">
      <div className="row spread">
        <h2>Expense interview — {year}</h2>
        <span className="badge">{`Step ${step + 1}/${len}`}</span>
      </div>

      <div className="progress"><div className="bar" style={{ width: `${progress}%` }} /></div>

      {err && <div className="alert" style={{marginTop:8}}>Error: {err}</div>}

      <div className="row" style={{ marginTop: 10, alignItems:"baseline", gap:8 }}>
        <span className="chip">{cur.code}</span>
        <h3 className="qtitle">{cur.label}</h3>
      </div>

      <p className="qtext">Did you have any <b>{cur.label}</b> expenses in {year}?</p>

      <div className="seg">
        <button type="button" className={`segbtn ${answerYes[step] === true ? "active" : ""}`} onClick={() => setYes(true)}>Yes</button>
        <button type="button" className={`segbtn ${answerYes[step] === false ? "active" : ""}`} onClick={() => setYes(false)}>No</button>
      </div>

      {answerYes[step] === true && (
        <div className="amountRow">
          <label className="lbl">Amount</label>
          <div className="numRow">
            <div className="numWrap">
              <span className="prefix">$</span>
              <input className="num" inputMode="decimal" placeholder="0.00"
                     value={String(local[step].tempAmount)}
                     onChange={(e)=>editAmount(e.target.value)} />
            </div>
            <div className="quick">
              <button type="button" onClick={()=>bump(50)}>+50</button>
              <button type="button" onClick={()=>bump(100)}>+100</button>
              <button type="button" onClick={()=>bump(250)}>+250</button>
            </div>
          </div>
        </div>
      )}

      <div className="hint">
        <div className="hintTitle">WHAT TO INCLUDE</div>
        <div className="hintText">{hint.text}</div>
        {hint.example && <div className="hintExample"><b>Example:</b> {hint.example}</div>}
      </div>

      <div className="row spread actions" style={{ marginTop: 16 }}>
        <button className="secondary" onClick={back} disabled={busy || step === 0}>Back</button>
        {step + 1 < len
          ? <button className="primary" onClick={next} disabled={busy || !canNext}>{busy ? "Saving…" : "Next"}</button>
          : <button className="primary" onClick={next} disabled={busy || !canNext}>{busy ? "Saving…" : "Finish"}</button>
        }
      </div>

      <div className="row" style={{ justifyContent:"flex-end", marginTop: 10 }}>
        <span className="note">Running total:&nbsp;</span>
        <b>${total.toFixed(2)}</b>
      </div>
    </div>
  );
}

const DEFAULT_HINT = { text: "Enter the amount you actually paid in this tax year." };
const HINTS = {
  CAR_PAYMENT: {
    text: "Monthly payments related to your work vehicle (lease/loan/rent). If you use standard mileage, don’t double-count depreciation.",
  },
  FUEL: { text: "Gas, diesel, charging. Keep receipts or statements." },
  INSURANCE: { text: "Commercial auto, liability, cargo, or other business policies." },
  TOLLS: { text: "Bridge, road, and tunnel tolls used for work." },
};
