import React, { useMemo, useState } from "react";

/**
 * Wizard-проход по категориям:
 * - один вопрос на экран
 * - Yes/No → при Yes ввод суммы
 * - Next сохраняет только валидное значение (>=0)
 * - Запятая в дробной части автоматически превращается в точку
 * - Кнопка Next неактивна, пока число невалидно (или выбран No)
 */

function normalizeNumberInput(value) {
  if (value === "" || value == null) return null;
  const s = String(value).replace(",", ".").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function ExpenseWizard({ year, items, saving, onSaveOne }) {
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState({}); // code -> number|null
  const [touched, setTouched] = useState({}); // code -> true

  const ordered = useMemo(() => items.slice(), [items]);
  const total = useMemo(
    () => items.reduce((s, x) => s + (typeof x.amount === "number" ? x.amount : 0), 0),
    [items]
  );

  if (!ordered.length) {
    return <div className="note" style={{ marginTop: 10 }}>No expense categories.</div>;
  }

  const cur = ordered[i];
  const currentSaved = cur.amount ?? null;
  const currentDraft = draft[cur.code] ?? currentSaved; // показываем сохранённое как старт
  const draftStr = currentDraft ?? "";                  // строка в поле ввода

  const yesSelected = currentDraft != null;
  const noSelected  = currentDraft == null;

  const onYes = () => {
    setTouched(m => ({ ...m, [cur.code]: true }));
    if (currentDraft == null) {
      setDraft(m => ({ ...m, [cur.code]: 0 }));
    }
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

    // решаем, изменилось ли значение
    const changed =
      (toSend == null && was != null) ||
      (typeof toSend === "number" && toSend >= 0 && toSend !== was);

    if (changed) {
      await onSaveOne(cur.code, toSend == null ? null : toSend);
    }
    setI(t => Math.min(t + 1, ordered.length - 1));
  };

  const onBack = () => setI(t => Math.max(t - 1, 0));

  return (
    <div className="card section">
      <div className="row spread">
        <h3>Expense interview — {year}</h3>
        <span className="note">Step {i + 1}/{ordered.length} • Total ${total.toFixed(2)}</span>
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
          <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "center" }}>
            <span className="note">Amount</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              className={isInvalid ? "invalid" : ""}
              value={draftStr}
              onChange={(e) => onChangeAmount(e.target.value)}
              style={{ width: 180 }}
              disabled={saving}
            />
            <button className="secondary" onClick={() => onChangeAmount((currentDraft || 0) + 50)}  disabled={saving}>+50</button>
            <button className="secondary" onClick={() => onChangeAmount((currentDraft || 0) + 100)} disabled={saving}>+100</button>
            <button className="secondary" onClick={() => onChangeAmount((currentDraft || 0) + 250)} disabled={saving}>+250</button>
            {isInvalid && <span className="badge err">Enter a valid number</span>}
          </div>
        )}
      </div>

      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <button className="secondary" onClick={onBack} disabled={i === 0 || saving}>Back</button>
        <button onClick={onNext} disabled={nextDisabled}>{i === ordered.length - 1 ? "Finish" : "Next"}</button>
      </div>
    </div>
  );
}
