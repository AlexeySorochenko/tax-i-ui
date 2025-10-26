import React, { useMemo, useState } from "react";

/**
 * Wizard по расходам:
 * • один вопрос на экран
 * • Yes/No → при Yes ввод суммы
 * • Next сохраняет только валидное значение (>=0)
 * • Запятая в дробной части → точка
 * • Прогресс-бар + подсказки по категории, «почему спрашиваем» и что считается «обычно»
 */

function normalizeNumberInput(value) {
  if (value === "" || value == null) return null;
  const s = String(value).replace(",", ".").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Короткие подсказки по категориям (можно расширять на бэке — фронт просто покажет текст)
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
      "Cell phone plan — only the business-use portion (common split 50–80% depending on usage).",
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
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState({});   // code -> number|null
  const [touched, setTouched] = useState({}); // code -> true

  const ordered = useMemo(() => items.slice(), [items]);

  // прогресс: считаем вопрос «отвеченным», если есть сохранённая сумма или пользователь выбрал Yes/No (есть запись в draft)
  const answeredCount = useMemo(() => {
    const codesWithAnswer = new Set([
      ...ordered.filter(x => x.amount != null).map(x => x.code),
      ...Object.keys(draft),
    ]);
    return codesWithAnswer.size;
  }, [ordered, draft]);

  const pct = ordered.length ? Math.round((answeredCount / ordered.length) * 100) : 0;

  const total = useMemo(
    () => ordered.reduce((s, x) => s + (typeof x.amount === "number" ? x.amount : 0), 0),
    [ordered]
  );

  if (!ordered.length) {
    return <div className="note" style={{ marginTop: 10 }}>No expense categories.</div>;
  }

  const cur = ordered[i];
  const currentSaved = cur.amount ?? null;
  const currentDraft = draft[cur.code] ?? currentSaved;
  const draftStr = currentDraft ?? "";

  const yesSelected = currentDraft != null;
  const noSelected  = currentDraft == null;

  const onYes = () => {
    setTouched(m => ({ ...m, [cur.code]: true }));
    if (currentDraft == null) setDraft(m => ({ ...m, [cur.code]: 0 }));
  };
  const onNo = () => {
    setTouched(m => ({ ...m, [cur.code]: true }));
    setDraft(m => ({ ...m, [cur.code]: null }));
  };

  const onChangeAmount = (val) => {
    setTouched(m => ({ ...m, [cur.code]: true }));
    const n = normalizeNumberInput(val);
    setDraft(m => ({ ...m, [cur.code]: n }));
  };

  const isInvalid = touched[cur.code] && yesSelected && (currentDraft == null || currentDraft < 0);
  const nextDisabled = saving || (yesSelected && (currentDraft == null || currentDraft < 0));

  const onNext = async () => {
    const toSend = draft[cur.code];
    const was = currentSaved;

    const changed =
      (toSend == null && was != null) ||
      (typeof toSend === "number" && toSend >= 0 && toSend !== was);

    if (changed) {
      await onSaveOne(cur.code, toSend == null ? null : toSend);
    }
    setI(t => Math.min(t + 1, ordered.length - 1));
  };

  const onBack = () => setI(t => Math.max(t - 1, 0));

  // подсказки
  const hintKey = String(cur.code || "").toUpperCase();
  const hint = HINTS[hintKey] || DEFAULT_HINT;

  return (
    <div className="card section">
      <div className="row spread" style={{ alignItems: "flex-end" }}>
        <div>
          <h3>Expense interview — {year}</h3>
          <div className="note">Answer one question at a time. You can edit any step later.</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">Step {i + 1}/{ordered.length}</span>
          <span className="badge">Total ${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Прогресс-бар */}
      <div className="progress" aria-label="Interview progress" style={{ marginTop: 10 }}>
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
        <span className="note">{pct}% complete</span>
        <span className="note">{ordered.length - answeredCount} left</span>
      </div>

      <div className="card section" style={{ borderStyle: "solid", borderWidth: 1 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">{cur.code}</span>
          <h2 style={{ margin: 0 }}>{cur.label || cur.code}</h2>
        </div>

        <p style={{ marginTop: 8 }}>
          Did you have any <b>{cur.label || cur.code}</b> expenses in {year}?
        </p>

        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <button className={yesSelected ? "" : "secondary"} onClick={onYes} disabled={saving}>Yes</button>
          <button className={noSelected  ? "" : "secondary"} onClick={onNo}  disabled={saving}>No</button>
        </div>

        {yesSelected && (
          <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="note">Amount</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              className={isInvalid ? "invalid" : ""}
              value={draftStr}
              onChange={(e) => onChangeAmount(e.target.value)}
              style={{ width: 200 }}
              disabled={saving}
            />
            <button className="secondary" onClick={() => onChangeAmount((currentDraft || 0) + 50)}  disabled={saving}>+50</button>
            <button className="secondary" onClick={() => onChangeAmount((currentDraft || 0) + 100)} disabled={saving}>+100</button>
            <button className="secondary" onClick={() => onChangeAmount((currentDraft || 0) + 250)} disabled={saving}>+250</button>
            {isInvalid && <span className="badge err">Enter a valid number</span>}
          </div>
        )}

        {/* Подсказки */}
        <div className="card section" style={{ background: "transparent" }}>
          <h4>{hint.title}</h4>
          <div className="note" style={{ marginTop: 4 }}>{hint.body}</div>
          {hint.example && <div className="note" style={{ marginTop: 4 }}><b>Example:</b> {hint.example}</div>}
          <div className="note" style={{ marginTop: 6 }}>
            Why we ask: correct categorization helps your accountant maximize deductions and avoid double counting.
          </div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <button className="secondary" onClick={onBack} disabled={i === 0 || saving}>Back</button>
        <button onClick={onNext} disabled={nextDisabled}>{i === ordered.length - 1 ? "Finish" : "Next"}</button>
      </div>
    </div>
  );
}
