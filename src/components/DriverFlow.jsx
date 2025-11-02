import React, { useEffect, useMemo, useState } from "react";
import {
  fetchMe, periodStatus, listFirms, selectFirm,
  getExpenses, saveExpenses
} from "../components/api";
import ExpenseWizard from "../components/ExpenseWizard";

export default function DriverFlow({ API, token, year }) {
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overrideView, setOverrideView] = useState(null); // 'firms' | null

  // --- bootstrap
  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const u = await fetchMe(API, token);
      setMe(u);
      const st = await periodStatus(API, token, u.id, year);
      setStatus(st);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [API, token, year]);

  // --- Firms view (override or flow_state)
  const [firms, setFirms] = useState([]);
  const loadFirms = async () => {
    try { setFirms(await listFirms(API, token)); }
    catch (e) { setError(String(e?.message || e)); }
  };

  const chooseFirm = async (firmId) => {
    try {
      await selectFirm(API, token, firmId);
      setOverrideView(null);
      await loadAll(); // рефрешим flow_state
    } catch (e) { setError(String(e?.message || e)); }
  };

  // --- Expenses
  const [exp, setExp] = useState({ businessProfileId: null, items: [] });

  const startExpenses = async (businessProfileId) => {
    const data = await getExpenses(API, token, businessProfileId, year);
    setExp({ businessProfileId, items: data || [] });
  };

  const saveOneExpense = async (code, amount) => {
    const next = exp.items.map(x => (x.code === code ? { ...x, amount } : x));
    setExp({ ...exp, items: next });
    // батчим по одному элементу — бэкенд принимает subset
    const payload = [{ code, amount }];
    await saveExpenses(API, token, exp.businessProfileId, year, payload);
  };

  const finishExpenses = async () => {
    await saveExpenses(API, token, exp.businessProfileId, year,
      exp.items.filter(x => x.amount != null).map(x => ({ code: x.code, amount: x.amount }))
    );
    await loadAll();
  };

  // ---- RENDER ----
  if (loading) return <div className="card"><div className="note">Loading…</div></div>;
  if (error)   return <div className="card"><div className="alert">{error}</div></div>;
  if (!me)     return null;

  // явный возврат к выбору фирмы
  if (overrideView === "firms") {
    return <FirmsPicker
      firms={firms}
      onLoad={loadFirms}
      onChoose={chooseFirm}
    />;
  }

  const flow = status?.flow_state;

  // 1) Нужно выбрать фирму
  if (flow === "NEEDS_FIRM") {
    return <FirmsPicker
      firms={firms}
      onLoad={loadFirms}
      onChoose={chooseFirm}
    />;
  }

  // 2) Нужно заполнить опрос / расходы
  if (flow === "NEEDS_PROFILE" || flow === "NEEDS_EXPENSES" || exp.items.length) {
    // если ещё не загрузили список расходов — попробуем стартануть
    if (!exp.items.length && status?.business_profile_id) {
      startExpenses(status.business_profile_id);
      return <div className="card"><div className="note">Loading interview…</div></div>;
    }
    return (
      <ExpenseWizard
        year={year}
        items={exp.items}
        onSaveOne={saveOneExpense}
        onFinished={finishExpenses}
        onGoToFirms={() => { setOverrideView("firms"); loadFirms(); }} // <— кнопка внизу визарда
      />
    );
  }

  // 3) Документы / оплата / ревью — здесь может быть твой текущий рендер
  return (
    <div className="card">
      <h2>Next steps</h2>
      <div className="note">Flow state: <b>{flow || "unknown"}</b></div>
      <div className="section">
        <button className="secondary" onClick={() => { setOverrideView("firms"); loadFirms(); }}>
          Change firm
        </button>
      </div>
    </div>
  );
}

/** ───────── Sub: Firms picker ───────── **/
function FirmsPicker({ firms, onLoad, onChoose }) {
  useEffect(() => { onLoad?.(); }, [onLoad]);

  return (
    <div className="card">
      <h2>Choose your accounting firm</h2>
      <div className="grid firmgrid">
        {(firms || []).map(f => (
          <div key={f.id} className="tile firm">
            <div className="firmBody">
              <div className="firmTop">
                <div className="firmName">{f.name}</div>
                {(f.avg_rating != null) && <div className="rating">★ {Number(f.avg_rating).toFixed(1)}</div>}
              </div>
              <div className="firmDescr">{f.description}</div>
              <div className="firmPrice">{formatPrice(f.services_pricing)}</div>
            </div>
            <div className="firmAct">
              <button className="primary" onClick={() => onChoose?.(f.id)}>Choose</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPrice(sp) {
  // server may return "1000" or '{"standard":250}'
  if (!sp) return "";
  try {
    const num = Number(sp);
    if (Number.isFinite(num)) return `$${num}`;
  } catch {}
  try {
    const obj = JSON.parse(sp);
    const [k, v] = Object.entries(obj)[0] || [];
    if (v != null) return `${k}: $${v}`;
  } catch {}
  return String(sp);
}
