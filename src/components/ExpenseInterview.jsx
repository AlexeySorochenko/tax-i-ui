import React, { useMemo, useState } from "react";

/**
 * Умный опрос:
 * - для каждой категории: Да/Нет → при "Да" раскрывается поле суммы
 * - onChangeAmount(code, amount) — родитель делает PUT { expenses: [...] }
 */

function formatMoney(n) {
  if (typeof n !== "number" || isNaN(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function QuickChips({ onPick }) {
  const chips = [50, 100, 250, 500, 1000];
  return (
    <div className="row" style={{ gap: 6, marginTop: 6 }}>
      {chips.map((c) => (
        <button key={c} className="secondary" type="button" onClick={() => onPick(c)}>
          +{c}
        </button>
      ))}
    </div>
  );
}

export default function ExpenseInterview({ year, items, saving, onChangeAmount }) {
  const [answered, setAnswered] = useState({}); // code -> true

  const ordered = useMemo(() => {
    const without = items.filter((i) => i.amount == null);
    const withAmt = items.filter((i) => i.amount != null);
    return [...without, ...withAmt];
  }, [items]);

  const total = useMemo(
    () => items.reduce((s, i) => s + (typeof i.amount === "number" ? i.amount : 0), 0),
    [items]
  );

  const progress = useMemo(() => {
    const totalQ = items.length;
    const doneQ = Object.keys(answered).length + items.filter(i => i.amount != null).length;
    const pct = totalQ ? Math.min(100, Math.round((doneQ / totalQ) * 100)) : 0;
    return { totalQ, doneQ, pct };
  }, [items, answered]);

  const setAmount = (code, val) => {
    const num = val === "" ? null : Number(val);
    if (num === null || !isFinite(num) || num < 0) {
      onChangeAmount(code, null);
    } else {
      onChangeAmount(code, num);
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="row spread">
        <h4>Interview for {year}</h4>
        <span className="note">
          Progress: {progress.pct}% ({progress.doneQ}/{progress.totalQ}) • Total: {formatMoney(total)}
        </span>
      </div>

      {!ordered.length && <div className="note" style={{ marginTop: 6 }}>No expense categories configured.</div>}

      {!!ordered.length && (
        <div className="grid" style={{ marginTop: 8, gap: 12 }}>
          {ordered.map((it) => {
            const code = it.code;
            const has = it.amount != null;
            const seen = !!answered[code];
            const showAmount = has || seen;

            return (
              <div key={code} className="card" style={{ border: "1px solid var(--border)", padding: 12 }}>
                <div className="row spread">
                  <div className="row" style={{ gap: 8 }}>
                    <span className="badge">{code}</span>
                    <b>{it.label || code}</b>
                  </div>
                  <div className="note">{has ? "Saved" : seen ? "Answered" : "New"}</div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div>Did you have any <b>{it.label || code}</b> expenses in {year}?</div>
                  <div className="row" style={{ gap: 8, marginTop: 6 }}>
                    <button className={showAmount ? "" : "secondary"} onClick={() => setAnswered(m => ({ ...m, [code]: true }))} disabled={saving}>Yes</button>
                    <button className={!showAmount ? "" : "secondary"} onClick={() => setAnswered(m => ({ ...m, [code]: true }))} disabled={saving}>No</button>
                  </div>
                </div>

                {showAmount && (
                  <div style={{ marginTop: 10 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center" }}>
                      <span className="note">Amount</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0.00"
                        value={it.amount ?? ""}
                        onChange={(e) => setAmount(code, e.target.value)}
                        style={{ width: 160 }}
                        disabled={saving}
                      />
                      <span className="note">quick add</span>
                      <QuickChips onPick={(n) => setAmount(code, (it.amount || 0) + n)} />
                    </div>
                    <div className="note" style={{ marginTop: 6 }}>
                      You can attach receipts later if needed.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
