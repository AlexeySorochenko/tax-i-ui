import React, { useEffect, useMemo, useState } from "react";

/**
 * items: [{ code, label, amount }]
 * onSaveOne(code, amount|null)
 * onFinished()
 */
export default function ExpenseWizard({ year, items = [], onSaveOne, onFinished }) {
  const [idx, setIdx] = useState(0);
  const [answerYes, setAnswerYes] = useState(null);
  const [amountStr, setAmountStr] = useState("");
  const [saving, setSaving] = useState(false);

  const stepCount = items.length;
  const current = items[idx] || null;

  useEffect(() => {
    if (!current) return;
    const a = current.amount;
    setAnswerYes(a != null);
    setAmountStr(a != null ? String(a) : "");
  }, [idx, current?.code]);

  const progress = useMemo(() => {
    if (!stepCount) return 0;
    const answeredBefore = idx;
    const currentAnswered = answerYes !== null ? 1 : 0;
    return Math.round(((answeredBefore + currentAnswered) / stepCount) * 100);
  }, [idx, stepCount, answerYes]);

  const parseAmount = (s) => {
    const normalized = String(s ?? "").replace(",", ".").trim();
    if (normalized === "") return null;
    const n = Number(normalized);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };

  const canNext = () => {
    if (answerYes === null) return false;
    if (answerYes === false) return true;
    return Number.isFinite(parseAmount(amountStr));
  };

  const saveCurrent = async () => {
    if (!current) return;
    let payload = null;
    if (answerYes === true) {
      const n = parseAmount(amountStr);
      if (!Number.isFinite(n)) throw new Error("Please enter a valid amount.");
      payload = n;
    }
    await onSaveOne(current.code, payload);
  };

  const advance = async (finish = false) => {
    if (!canNext() || !current) return;
    try {
      setSaving(true);
      await saveCurrent();
      setSaving(false);
      if (finish || idx + 1 >= stepCount) {
        onFinished && onFinished();
      } else {
        setIdx(i => i + 1);
      }
    } catch (e) {
      setSaving(false);
      alert(extractErr(e));
    }
  };

  const back = () => { if (idx > 0) setIdx(i => i - 1); };

  if (!current) {
    return (
      <div className="card">
        <h2>Expense interview — {year}</h2>
        <div className="note">No questions for this year.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row spread" style={{alignItems:"center", marginBottom:6}}>
        <h2>Expense interview — {year}</h2>
        <span className="badge">{`Step ${idx+1}/${stepCount}`}</span>
      </div>

      <div className="progress"><div className="bar" style={{width:`${progress}%`}}/></div>
      <div className="note" style={{marginTop:4}}>{progress}% complete</div>

      <div className="wizardCard">
        <div className="row" style={{gap:8, alignItems:"center", flexWrap:"wrap"}}>
          <span className="tag">{current.code}</span>
          <div className="qtitle">{current.label || pretty(current.code)}</div>
        </div>

        <div className="qtext">
          Did you have any <b>{current.label || pretty(current.code)}</b> expenses in {year}?
        </div>

        <div className="seg">
          <button className={answerYes===true ? "on" : ""} onClick={()=>setAnswerYes(true)} type="button">Yes</button>
          <button className={answerYes===false ? "on" : ""} onClick={()=>setAnswerYes(false)} type="button">No</button>
        </div>

        {answerYes === true && (
          <>
            <div className="k" style={{marginTop:8}}>Amount</div>
            <div className="row" style={{gap:8, flexWrap:"wrap"}}>
              <input
                inputMode="decimal" placeholder="0.00"
                value={amountStr} onChange={e=>setAmountStr(e.target.value)}
                style={{flex:"1 1 220px", maxWidth:260}}
              />
              <button className="secondary" type="button" onClick={()=>setAmountStr(adjust(amountStr, 50))}>+50</button>
              <button className="secondary" type="button" onClick={()=>setAmountStr(adjust(amountStr,100))}>+100</button>
              <button className="secondary" type="button" onClick={()=>setAmountStr(adjust(amountStr,250))}>+250</button>
            </div>

            <div className="helper">
              <div className="helperTitle">WHAT TO INCLUDE</div>
              <div className="helperText">
                Monthly payments related to your work vehicle (lease/loan/rent). If you use standard mileage, don’t double-count depreciation.
              </div>
            </div>
          </>
        )}

        <div className="row" style={{justifyContent:"space-between", marginTop:12}}>
          <button className="secondary" type="button" onClick={back} disabled={idx===0 || saving}>Back</button>
          {idx+1<stepCount
            ? <button type="button" onClick={()=>advance(false)} disabled={!canNext() || saving}>{saving ? "Saving…" : "Next"}</button>
            : <button type="button" onClick={()=>advance(true)}  disabled={!canNext() || saving}>{saving ? "Saving…" : "Finish"}</button>
          }
        </div>
      </div>
    </div>
  );
}

function pretty(code){ return String(code).replaceAll("_"," ").toLowerCase(); }
function adjust(s, delta){ const n=Number(String(s||"0").replace(",",".")); const base=Number.isFinite(n)?n:0; return String(Math.max(0, +(base+delta).toFixed(2))); }
function extractErr(e){ try{const j=JSON.parse(String(e.message||e));return j.detail||e.message;}catch{return String(e.message||e);} }
