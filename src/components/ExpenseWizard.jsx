import React, { useEffect, useMemo, useState } from "react";

/**
 * props:
 *  - year: number
 *  - items: [{ code, label, amount|null, description?: string }]
 *  - onSaveOne: (code, amount|null) => Promise|void
 *  - onFinished: () => Promise|void
 *  - onGoToFirms?: () => void   // (необязательно) кнопка "Change firm"
 */
export default function ExpenseWizard({ year, items = [], onSaveOne, onFinished, onGoToFirms }) {
  const totalSteps = (items || []).length || 1;
  const [step, setStep] = useState(0);

  // локальная копия значений (чтобы не дёргать бек на каждый ввод)
  const [local, setLocal] = useState(() =>
    (items || []).map(x => ({ ...x, tempAmount: x.amount ?? "" }))
  );
  const [answerYes, setAnswerYes] = useState(() =>
    (items || []).map(x => (x.amount != null ? true : null)) // null=не отвечал, true/false=да/нет
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // если пришёл новый список items (перезагрузили), синхронизируем
  useEffect(() => {
    setLocal((items || []).map(x => ({ ...x, tempAmount: x.amount ?? "" })));
    setAnswerYes((items || []).map(x => (x.amount != null ? true : null)));
  }, [items]);

  const runningTotal = useMemo(() => {
    const nums = (local || []).map(i => toNum(i.tempAmount));
    const sum = nums.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
    return sum;
  }, [local]);

  const current = local[step] || { code: "", label: "", tempAmount: "" };
  const currentAnswer = answerYes[step];

  function toNum(v) {
    if (v === "" || v === null || v === undefined) return NaN;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    return isNaN(n) ? NaN : n;
  }

  function setAmount(v) {
    setLocal(prev =>
      prev.map((it, idx) => (idx === step ? { ...it, tempAmount: v } : it))
    );
  }

  function incAmount(delta) {
    setLocal(prev =>
      prev.map((it, idx) => {
        if (idx !== step) return it;
        const cur = toNum(it.tempAmount) || 0;
        return { ...it, tempAmount: String(Math.max(0, cur + delta)) };
      })
    );
  }

  function setYesNo(val /* true | false */) {
    setAnswerYes(prev => prev.map((a, idx) => (idx === step ? val : a)));
    if (val === false) {
      // если "No" — очищаем сумму
      setAmount("");
    } else if (val === true && (current.tempAmount === "" || current.tempAmount == null)) {
      // при первом "Yes" подставим 0 для фокуса
      setAmount("0");
    }
  }

  async function goNext() {
    setErr("");
    const code = current.code;

    // сохраняем ответ текущего шага
    try {
      setBusy(true);
      if (answerYes[step] === false) {
        await onSaveOne?.(code, null);
      } else if (answerYes[step] === true) {
        const val = toNum(current.tempAmount);
        await onSaveOne?.(code, isNaN(val) ? 0 : val);
      }
    } catch (e) {
      setErr(String(e?.message || e));
      setBusy(false);
      return;
    }
    setBusy(false);

    // переход
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

  // простые подсказки (можно расширять)
  const DEFAULT_HINT = { text: "Enter the amount you actually paid in this tax year." };
  const HINTS = {
    CAR_PAYMENT: {
      text:
        "Monthly payments related to your work vehicle (lease/loan). If you use standard mileage, don’t double-count depreciation.",
    },
    FUEL: { text: "Gas, diesel, charging. Keep receipts or bank/aggregator statements." },
    INSURANCE: { text: "Commercial auto, liability, cargo, or other business policies." },
    TOLLS: { text: "Bridge, road, and tunnel tolls used for work." },
  };
  const hint = HINTS[current.code] || DEFAULT_HINT;

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
      <div
        aria-hidden
        style={{
          height: 6,
          borderRadius: 9999,
          background: "rgba(0,0,0,0.08)",
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((step + 1) / totalSteps) * 100}%`,
            background: "var(--primary, #2ea7ff)",
            transition: "width .25s ease",
          }}
        />
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
            <div style={{ fontSize: 14.5 }}>{hint.text}</div>
          </div>
        </div>

        {/* Yes / No переключатель */}
        <SegmentedYesNo
          value={currentAnswer}
          onChange={setYesNo}
        />

        {/* Поле суммы — показываем только при Yes */}
        {currentAnswer === true && (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Amount</div>
            <AmountInput
              value={String(current.tempAmount ?? "")}
              onChange={setAmount}
              onInc={incAmount}
            />
            <div className="note" style={{ marginTop: 2 }}>You can adjust later.</div>
          </div>
        )}
      </div>

      {/* ---------- ФУТЕР ---------- */}
      <div className="row" style={{ marginTop: 16, alignItems: "center", justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <button className="secondary" onClick={goBack} disabled={busy || step === 0}>Back</button>
          {onGoToFirms && (
            <button className="secondary" onClick={onGoToFirms} disabled={busy}>Change firm</button>
          )}
        </div>

        <div className="row" style={{ gap: 16, alignItems: "center" }}>
          <div className="note">
            Running total:&nbsp;
            <b>${runningTotal.toFixed(2)}</b>
          </div>
          <button className="primary" onClick={goNext} disabled={busy}>
            {step < totalSteps - 1 ? "Next" : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
 * UI-подкомпоненты (локальные)
 * ========================= */

function SegmentedYesNo({ value /* true|false|null */, onChange }) {
  const isYes = value === true;
  const isNo = value === false;

  return (
    <div style={{
      display: "inline-flex",
      borderRadius: 9999,
      background: "rgba(0,0,0,0.06)",
      padding: 4,
      gap: 4,
      width: "fit-content"
    }}>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{
          padding: "8px 14px",
          borderRadius: 9999,
          border: 0,
          background: isYes ? "var(--primary, #2ea7ff)" : "transparent",
          color: isYes ? "#fff" : "inherit",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{
          padding: "8px 14px",
          borderRadius: 9999,
          border: 0,
          background: isNo ? "var(--primary, #2ea7ff)" : "transparent",
          color: isNo ? "#fff" : "inherit",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        No
      </button>
    </div>
  );
}

function AmountInput({ value, onChange, onInc }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ position: "relative", maxWidth: 280 }}>
        <span style={{
          position: "absolute", left: 10, top: 10, pointerEvents: "none",
          opacity: 0.75, fontWeight: 600
        }}>$</span>
        <input
          inputMode="decimal"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px 10px 24px",
            fontSize: 18,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)",
            outline: "none",
          }}
        />
      </div>
      <div className="row" style={{ gap: 8 }}>
        {[50, 100, 250].map(v => (
          <button
            key={v}
            type="button"
            className="secondary"
            onClick={() => onInc(v)}
            style={{ borderRadius: 9999, padding: "6px 10px" }}
          >
            +{v}
          </button>
        ))}
      </div>
    </div>
  );
}
