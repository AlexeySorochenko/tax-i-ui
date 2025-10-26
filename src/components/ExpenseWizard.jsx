import React, { useMemo, useState } from "react";

/**
 * Expense Wizard:
 * - явный выбор Yes/No (toggle)
 * - поле суммы только при Yes; запятая → точка
 * - Next сохраняет только валидные изменения
 * - прогресс-бар + подсказки
 * - мобильная удобочитаемость
 */

function normalizeNumberInput(value) {
  if (value === "" || value == null) return null;
  const s = String(value).replace(",", ".").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const HINTS = {
  CAR_PAYMENT: {
    title: "What to include",
    body:
      "Monthly lease or loan payments for your work car. If you use standard mileage, do not double-count depreciation.",
    example: "Example: 12 × $350 = $4,200 for the year.",
  },
  CAR_REPAIRS: {
    title: "What to include",
    body: "Repairs directly related to your work vehicle: brakes, tires, bodywork.",
    example: "Example: new tires $420, brake pads $180.",
  },
  CAR_MAINTENANCE: {
    title: "What to include",
    body: "Routine maintenance: oil changes, filters, wipers, fluids, inspection.",
    example: "Example: 6 oil changes × $55 = $330.",
  },
  FUEL: {
    title: "What to include",
    body:
      "Fuel purchased for work trips. If you claim standard mileage, you usually should NOT add fuel separately.",
    example: "Tip: keep gas station receipts or monthly statements.",
  },
  INSURANCE: {
    title: "What to include",
    body: "Auto insurance premiums for your work car. Add only the business-use portion if mixed use.",
    example: "Example: $120/month × 12 = $1,440.",
  },
  TOLLS: {
    title: "What to include",
    body: "Highway/bridge tolls when working. Download statements from E-ZPass or similar.",
    example: "Example: E-ZPass yearly total $310.",
  },
  PARKING: {
    title: "What to include",
    body: "Parking fees while you were working. Do not include parking tickets.",
    example: "Example: airport lot $75, city meters $62.",
  },
  FEES: {
    title: "What to include",
    body: "Platform fees/commissions (Uber/Lyft/Doordash). Often visible in your driver statements.",
    example: "Tip: export annual summary from the app.",
  },
  ELECTRONICS: {
    title: "What to include",
    body: "Phone mounts, dash cams, chargers used for work.",
    example: "Example: dash cam $90, cables $20.",
  },
  SOFTWARE: {
    title: "What to include",
    body: "Navigation apps, bookkeeping apps, subscriptions used for business.",
    example: "Example: pro navigation plan $60/year.",
  },
  PHONE: {
    title: "What to include",
    body:
      "Cell phone plan — only the business-use portion (common split 50–80%).",
    example: "Example: $60/month × 12 × 60% = $432.",
  },
  INTERNET: {
    title: "What to include",
    body:
      "Home internet used to manage your gig work. Claim only the business-use portion.",
    example: "Example: $45/month × 12 × 50% = $270.",
  },
  OFFICE_RENT: {
    title: "What to include",
    body: "Separate office or workspace rent used only for business.",
    example: "Note: home office rules are more specific — ask your accountant.",
  },
  OFFICE_UTILS: {
    title: "What to include",
    body: "Utilities for a business office (electricity, water, internet at the office).",
    example: "Attach monthly statements if available.",
  },
  DISPATCH_FEES: {
    title: "What to include",
    body: "Dispatch/broker fees for trucking.",
    example: "Use your settlement statements.",
  },
  OTHER: {
    title: "What to include",
    body: "Anything necessary for your work that doesn’t fit other categories.",
    example: "Describe briefly when asked by your accountant.",
  },
};

const DEFAULT_HINT = {
  title: "What to include",
  body: "Enter the amount you paid for this category in the selected tax year.",
  example: "Use receipts, bank statements, or yearly summaries from the app.",
};

export default function ExpenseWizard({ year, items, saving, onSaveOne }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState({}); // code -> 'yes' | 'no'
  const [draft, setDraft] = useState({});       // code -> number|null

  const ordered = useMemo(() => items.slice(), [items]);

  // answered: есть сохранённая сумма, либо выбран yes/no
  const answeredCount = useMemo(() => {
    const saved = ordered.filter(x => x.amount != null).map(x => x.code);
    const chosen = Object.keys(selected);
    return new Set([...saved, ...chosen]).size;
  }, [ordered, selected]);

  const pct = ordered.length ? Math.round((answeredCount / ordered.length) * 100) : 0;
  const total = useMemo(
    () => ordered.reduce((s, x) => s + (typeof x.amount === "number" ? x.amount : 0), 0),
    [ordered]
  );

  if (!ordered.length) {
    return <div className="note" style={{ marginTop: 10 }}>No expense categories.</div>;
  }

  const cur = ordered[step];
  const code = cur.code;
  const savedAmount = cur.amount ?? null;

  const choice = selected[code] ?? (savedAmount != null ? "yes" : undefined);
  const showAmount = choice === "yes";

  const draftVal = draft[code] ?? (savedAmount ?? null);
  const draftStr = draftVal ?? "";

  const onYes = () => {
    setSelected(m => ({ ...m, [code]: "yes" }));
    if (draftVal == null) setDraft(m => ({ ...m, [code]: 0 }));
  };

  const onNo = () => {
    setSelected(m => ({ ...m, [code]: "no" }));
    setDraft(m => ({ ...m, [code]: null }));
  };

  const onChangeAmount = (val) => {
    const n = normalizeNumberInput(val);
    setDraft(m => ({ ...m, [code]: n }));
  };

  const invalid = showAmount && (draftVal == null || draftVal < 0);
  const nextDisabled = saving || (showAmount && (draftVal == null || draftVal < 0)) || !choice;

  const hint = HINTS[String(code || "").toUpperCase()] || DEFAULT_HINT;

  const goNext = async () => {
    // сохраняем при изменении
    if (choice === "no" && savedAmount != null) {
      await onSaveOne(code, null);
    }
    if (choice === "yes" && draftVal != null && draftVal >= 0 && draftVal !== savedAmount) {
      await onSaveOne(code, draftVal);
    }
    setStep(s => Math.min(s + 1, ordered.length - 1));
  };

  const goBack = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div className="card section">
      <div className="row spread" style={{ alignItems: "flex-end" }}>
        <div>
          <h3>Expense interview — {year}</h3>
          <div className="note">Answer one question at a time. You can edit any step later.</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">Step {step + 1}/{ordered.length}</span>
          <span className="badge">Total ${total.toFixed(2)}</span>
        </div>
      </div>

      {/* progress */}
      <div className="progress" aria-label="Interview progress" style={{ marginTop: 10 }}>
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
        <span className="note">{pct}% complete</span>
        <span className="note">{ordered.length - answeredCount} left</span>
      </div>

      <div className="card section" style={{ borderStyle: "solid", borderWidth: 1 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">{code}</span>
          <h2 style={{ margin: 0 }}>{cur.label || code}</h2>
        </div>

        <p style={{ marginTop: 8 }}>
          Did you have any <b>{cur.label || code}</b> expenses in {year}?
        </p>

        <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`toggle ${choice === "yes" ? "active" : ""}`}
            aria-pressed={choice === "yes"}
            onClick={onYes}
            disabled={saving}
          >Yes</button>
          <button
            type="button"
            className={`toggle ${choice === "no" ? "active" : ""}`}
            aria-pressed={choice === "no"}
            onClick={onNo}
            disabled={saving}
          >No</button>
        </div>

        {showAmount && (
          <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="note">Amount</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              className={invalid ? "invalid" : ""}
              value={draftStr}
              onChange={(e) => onChangeAmount(e.target.value)}
              style={{ width: 200, maxWidth: "100%" }}
              disabled={saving}
            />
            <button type="button" className="secondary" onClick={() => onChangeAmount((draftVal || 0) + 50)}  disabled={saving}>+50</button>
            <button type="button" className="secondary" onClick={() => onChangeAmount((draftVal || 0) + 100)} disabled={saving}>+100</button>
            <button type="button" className="secondary" onClick={() => onChangeAmount((draftVal || 0) + 250)} disabled={saving}>+250</button>
            {invalid && <span className="badge err">Enter a valid number</span>}
          </div>
        )}

        {/* hints */}
        <div className="card section" style={{ background: "transparent" }}>
          <h4>{hint.title}</h4>
          <div className="note" style={{ marginTop: 4 }}>{hint.body}</div>
          {hint.example && (
            <div className="note" style={{ marginTop: 4 }}>
              <b>Example:</b> {hint.example}
            </div>
          )}
          <div className="note" style={{ marginTop: 6 }}>
            Why we ask: correct categorization helps your accountant maximize deductions and avoid double counting.
          </div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <button type="button" className="secondary" onClick={goBack} disabled={step === 0 || saving}>Back</button>
        <button type="button" onClick={goNext} disabled={nextDisabled}>
          {step === ordered.length - 1 ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
