import React, { useEffect, useMemo, useState } from "react";

/**
 * props:
 *  - year: number
 *  - items: [{ code, label, amount|null, hint?, order?, is_custom?, ui_rules?: { input_mode?: "currency"|"decimal"|"integer", validation?: { gte?, lte?, step? } } }]
 *  - onSaveOne: (code, amount|null) => Promise|void
 *  - onFinished: () => Promise|void
 *  - onGoToFirms?: () => void
 */
export default function ExpenseWizard({ year, items = [], onSaveOne, onFinished, onGoToFirms }) {
  // сортируем по order, но сохраняем исходный набор полей
  const sorted = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
    return arr;
  }, [items]);

  const totalSteps = (sorted || []).length || 1;
  const [step, setStep] = useState(0);

  // локальные значения + ответ да/нет
  const [local, setLocal] = useState(() =>
    (sorted || []).map(x => ({ ...x, tempAmount: x.amount ?? "" }))
  );
  const [answerYes, setAnswerYes] = useState(() =>
    (sorted || []).map(x => (x.amount != null ? true : null))
  );

  useEffect(() => {
    setLocal((sorted || []).map(x => ({ ...x, tempAmount: x.amount ?? "" })));
    setAnswerYes((sorted || []).map(x => (x.amount != null ? true : null)));
    setStep(0);
  }, [sorted]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const toNum = (v) => {
    if (v === "" || v == null) return NaN;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    return isNaN(n) ? NaN : n;
  };

  const runningTotal = useMemo(() => {
    const nums = (local || []).map(i => toNum(i.tempAmount));
    const sum = nums.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
    return sum;
  }, [local]);

  const current = local[step] || { code: "", label: "", tempAmount: "", ui_rules: {} };
  const currentAnswer = answerYes[step];
  const inputMode = current?.ui_rules?.input_mode || "currency";
  const v = current?.ui_rules?.validation || {};
  const min = typeof v.gte === "number" ? v.gte : 0;
  const max = typeof v.lte === "number" ? v.lte : undefined;
  const stepAttr = typeof v.step === "number" ? v.step : (inputMode === "integer" ? 1 : 0.01);

  function setAmount(val) {
    setLocal(prev => prev.map((it, idx) => (idx === step ? { ...it, tempAmount: val } : it)));
  }
  function incAmount(delta) {
    setLocal(prev => prev.map((it, idx) => {
      if (idx !== step) return it;
      const cur = toNum(it.tempAmount) || 0;
      const next = Math.max(min, Math.min(max ?? Number.POSITIVE_INFINITY, cur + delta));
      return { ...it, tempAmount: String(next) };
    }));
  }
  function setYesNo(val) {
    setAnswerYes(prev => prev.map((a, idx) => (idx === step ? val : a)));
    if (val === false) setAmount("");
    if (val === true && (current.tempAmount === "" || current.tempAmount == null)) setAmount(String(min ?? 0));
  }

  async function goNext() {
    setErr("");
    const code = current.code;
    try {
      setBusy(true);
      if (currentAnswer === false) {
        await onSaveOne?.(code, null);
      } else if (currentAnswer === true) {
        let num = toNum(current.tempAmount);
        if (isNaN(num)) num = min ?? 0;
        if (typeof min === "number") num = Math.max(min, num);
        if (typeof max === "number") num = Math.min(max, num);
        if (inputMode === "integer") num = Math.round(num);
        await onSaveOne?.(code, num);
      } else {
        // не ответили — трактуем как "нет"
        await onSaveOne?.(code, null);
      }
    } catch (e) {
      setErr(String(e?.message || e));
      setBusy(false);
      return;
    }
    setBusy(false);

    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    } else {
      await onFinished?.();
    }
  }

  function goBack() {
    setErr("");
    if (step > 0) setStep(s => s - 1);
  }

  return (
    <div className="card">
      {/* ---------- ШАПКА ---------- */}
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Expense interview — {year}</div>
        <div style={{
          fontSize: 12,
          padding: "4px 10px",
          background: "var(--chip-bg, rgba(0,0,0,0.06))",
          borderRadius: 9999,
        }}>
          Step {Math.min(step + 1, totalSteps)} / {totalSteps}
        </div>
      </div>
      <div aria-hidden
           style={{ height: 6, borderRadius: 9999, background: "rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: 14 }}>
        <div style={{
          height: "100%",
          width: `${((step + 1) / totalSteps) * 100}%`,
          background: "var(--primary, #2ea7ff)",
          transition: "width .25s ease",
        }}/>
      </div>

      {/* ---------- ТЕЛО ШАГА ---------- */}
      {err && <div className="alert" style={{ marginBottom: 10 }}>{err}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {/* Заголовок категории */}
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {current.label || current.code || "—"}
        </div>

        {/* Описание вопроса */}
        <div className="note" style={{ fontSize: 15 }}>
          Did you have any <b>{current.label || current.code}</b> expenses in {year}?
        </div>

        {/* Hint / Callout */}
        {(current.hint || "").length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: 10,
              padding: "10px 12px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(0,0,0,0.03)",
              borderRadius: 12,
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 9999,
              display: "grid", placeItems: "center",
              background: "rgba(0,0,0,0.06)", fontSize: 12
            }}>💡</div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>What to include</div>
              <div style={{ fontSize: 14.5 }}>{current.hint}</div>
            </div>
          </div>
        )}

        {/* Yes / No */}
        <SegmentedYesNo value={currentAnswer} onChange={setYesNo} />

        {/* Поле суммы при Yes */}
        {currentAnswer === true && (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Amount</div>
            <AmountInput
              value={String(current.tempAmount ?? "")}
              onChange={setAmount}
              onInc={(d) => incAmount(d)}
              inputMode={inputMode}
              step={stepAttr}
            />
            <div className="note" style={{ marginTop: 2 }}>
              {typeof min === "number" ? `Min ${formatMoney(min)}. ` : ""}{typeof max === "number" ? `Max ${formatMoney(max)}. ` : ""}You can adjust later.
            </div>
          </div>
        )}
      </div>

      {/* ---------- ФУТЕР ---------- */}
      <div className="row" style={{ marginTop: 16, alignItems: "center", justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <button className="secondary" onClick={goBack} disabled={busy || step === 0}>Back</button>
          {onGoToFirms && <button className="secondary" onClick={onGoToFirms} disabled={busy}>Change firm</button>}
        </div>
        <div className="row" style={{ gap: 16, alignItems: "center" }}>
          <div className="note">Running total: <b>{formatMoney(runningTotal)}</b></div>
          <button className="primary" onClick={goNext} disabled={busy}>
            {step < totalSteps - 1 ? "Next" : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== UI helpers ===== */

function SegmentedYesNo({ value /* true|false|null */, onChange }) {
  const isYes = value === true;
  const isNo = value === false;
  return (
    <div style={{ display: "inline-flex", borderRadius: 9999, background: "rgba(0,0,0,0.06)", padding: 4, gap: 4 }}>
      <button type="button" onClick={() => onChange(true)}
              style={{ padding: "8px 14px", borderRadius: 9999, border: 0, background: isYes ? "var(--primary, #2ea7ff)" : "transparent", color: isYes ? "#fff" : "inherit", fontWeight: 600 }}>
        Yes
      </button>
      <button type="button" onClick={() => onChange(false)}
              style={{ padding: "8px 14px", borderRadius: 9999, border: 0, background: isNo ? "var(--primary, #2ea7ff)" : "transparent", color: isNo ? "#fff" : "inherit", fontWeight: 600 }}>
        No
      </button>
    </div>
  );
}

function AmountInput({ value, onChange, onInc, inputMode = "currency", step = 0.01 }) {
  const incs = inputMode === "integer" ? [1, 5, 10] : [50, 100, 250];
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ position: "relative", maxWidth: 280 }}>
        <span style={{ position: "absolute", left: 10, top: 10, pointerEvents: "none", opacity: 0.75, fontWeight: 600 }}>
          {inputMode === "integer" ? "#" : "$"}
        </span>
        <input
          inputMode={inputMode === "integer" ? "numeric" : "decimal"}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={step}
          style={{ width: "100%", padding: "10px 12px 10px 24px", fontSize: 18, borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", outline: "none" }}
        />
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {incs.map(v => (
          <button key={v} type="button" className="secondary" onClick={() => onInc(v)} style={{ borderRadius: 9999, padding: "6px 10px" }}>
            +{v}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatMoney(x) {
  const n = typeof x === "number" ? x : Number(x || 0);
  return `$${n.toFixed(2)}`;
}
