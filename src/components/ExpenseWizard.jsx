import React, { useMemo, useState } from "react";

/**
 * Wizard-проход по категориям:
 * - один вопрос на экран
 * - Yes/No → при Yes ввод суммы
 * - Next сохраняет ТОЛЬКО если сумма указана (PUT {expenses:[{code,amount}]})
 * - можно редактировать назад через Back
 */

export default function ExpenseWizard({ year, items, saving, onSaveOne, onSaveAll }) {
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState({}); // code -> number|null

  const ordered = useMemo(() => items.slice(), [items]);
  const total = useMemo(
    () => items.reduce((s,x)=> s + (typeof x.amount==='number'?x.amount:0), 0),
    [items]
  );

  if (!ordered.length) return <div className="note" style={{marginTop:10}}>No expense categories.</div>;

  const cur = ordered[i];
  const draftVal = draft[cur.code] ?? (cur.amount ?? null);

  const chooseYes = () => { if (draftVal == null) setDraft(d=>({...d,[cur.code]: 0})) };
  const chooseNo  = () => { setDraft(d=>({...d,[cur.code]: null})) };

  const onNext = async () => {
    // сохраняем, если число валидно (>=0) и отличается от сохранённого
    const val = draft[cur.code];
    const isNum = typeof val === "number" && !isNaN(val) && val >= 0;
    const changed = isNum ? (cur.amount !== val) : (cur.amount != null);
    if (changed) await onSaveOne(cur.code, isNum ? val : null);
    setI(t => Math.min(t+1, ordered.length-1));
  };
  const onBack = () => setI(t => Math.max(t-1, 0));

  const atEnd = i === ordered.length - 1;

  return (
    <div className="card" style={{marginTop:12}}>
      <div className="row spread">
        <h4>Expense interview — {year}</h4>
        <span className="note">Step {i+1}/{ordered.length} • Total ${total.toFixed(2)}</span>
      </div>

      <div className="card" style={{marginTop:10, borderStyle:"solid", borderWidth:1}}>
        <div className="row" style={{gap:8}}>
          <span className="badge">{cur.code}</span>
          <b>{cur.label || cur.code}</b>
        </div>
        <div style={{marginTop:8}}>Did you have any <b>{cur.label || cur.code}</b> expenses in {year}?</div>
        <div className="row" style={{gap:8, marginTop:8}}>
          <button className={draftVal!=null ? "" : "secondary"} onClick={chooseYes} disabled={saving}>Yes</button>
          <button className={draftVal==null ? "" : "secondary"} onClick={chooseNo} disabled={saving}>No</button>
        </div>

        {draftVal!=null && (
          <div className="row" style={{gap:8, marginTop:10, alignItems:"center"}}>
            <span className="note">Amount</span>
            <input
              type="number" inputMode="decimal" step="0.01" placeholder="0.00"
              value={draftVal ?? ""} onChange={(e)=>setDraft(d=>({...d, [cur.code]: e.target.value===""? null : Number(e.target.value)}))}
              style={{width:160}} disabled={saving}
            />
            <button className="secondary" onClick={()=>setDraft(d=>({...d,[cur.code]:(draftVal||0)+50}))} disabled={saving}>+50</button>
            <button className="secondary" onClick={()=>setDraft(d=>({...d,[cur.code]:(draftVal||0)+100}))} disabled={saving}>+100</button>
            <button className="secondary" onClick={()=>setDraft(d=>({...d,[cur.code]:(draftVal||0)+250}))} disabled={saving}>+250</button>
          </div>
        )}
      </div>

      <div className="row" style={{marginTop:10, gap:8}}>
        <button className="secondary" onClick={onBack} disabled={i===0 || saving}>Back</button>
        <button onClick={onNext} disabled={saving}>{atEnd ? "Finish" : "Next"}</button>
      </div>
    </div>
  );
}
