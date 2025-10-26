import React, { useEffect, useMemo, useState } from "react";
import { authHeaders, jput } from "./api.js";
import ExpenseInterview from "./ExpenseInterview.jsx";

/**
 * Панель бизнес-профиля и расходов:
 * - Если бизнес-эндпоинты отсутствуют (404), показываем дружелюбное сообщение.
 * - Режимы: Interview (умный опрос), Table (табличный ввод).
 */

export default function BusinessPanel({ API, token, me }) {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState(null);

  const [year, setYear] = useState(new Date().getFullYear());
  const [profileDetails, setProfileDetails] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [unavailable, setUnavailable] = useState(false); // модуль не включён/нет эндпоинтов
  const [mode, setMode] = useState("interview"); // 'interview' | 'table'

  // ---- LOADERS ----
  const loadProfiles = async () => {
    setError(null);
    setLoadingProfiles(true);
    setUnavailable(false);
    try {
      const r = await fetch(`${API}/api/v1/business/profiles/${me.id}`, {
        headers: authHeaders(token),
      });
      if (r.status === 404) {
        setUnavailable(true);
        setProfiles([]);
        setProfileId(null);
        return;
      }
      if (!r.ok) throw new Error(await r.text());
      const arr = await r.json();
      const list = Array.isArray(arr) ? arr : [];
      setProfiles(list);
      if (!profileId && list.length) setProfileId(list[0].id);
    } catch (e) {
      setError(String(e));
      setProfiles([]);
      setProfileId(null);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const loadProfileDetails = async (pid) => {
    if (!pid) { setProfileDetails(null); return; }
    try {
      const r = await fetch(`${API}/api/v1/business/profiles/${pid}`, {
        headers: authHeaders(token),
      });
      if (!r.ok) throw new Error(await r.text());
      setProfileDetails(await r.json());
    } catch {
      setProfileDetails(null);
    }
  };

  const loadExpenses = async (pid = profileId, y = year) => {
    if (!pid) { setExpenses([]); return; }
    setLoadingExpenses(true);
    setError(null);
    try {
      const r = await fetch(`${API}/api/v1/business/${pid}/expenses/${y}`, {
        headers: authHeaders(token),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e) {
      setExpenses([]);
      setError(String(e));
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => { loadProfiles(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (profileId) { loadProfileDetails(profileId); loadExpenses(profileId, year); } /* eslint-disable-next-line */ }, [profileId]);
  useEffect(() => { if (profileId) loadExpenses(profileId, year); /* eslint-disable-next-line */ }, [year]);

  const totalEntered = useMemo(
    () => expenses.reduce((sum, e) => sum + (typeof e.amount === "number" && !isNaN(e.amount) ? e.amount : 0), 0),
    [expenses]
  );

  // автосохранение одной категории (используется в Interview)
  const saveSingle = async (code, amount) => {
    if (!profileId) return;
    setSaving(true);
    setError(null);
    try {
      const url = `${API}/api/v1/business/${profileId}/expenses/${year}`;
      await jput(url, token, [{ code, amount }]);
      setExpenses(prev => prev.map(e => e.code === code ? { ...e, amount } : e));
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  // массовое сохранение в табличном режиме
  const saveAll = async () => {
    if (!profileId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = expenses
        .filter((e) => typeof e.amount === "number" && !isNaN(e.amount))
        .map((e) => ({ code: e.code, amount: e.amount }));
      const url = `${API}/api/v1/business/${profileId}/expenses/${year}`;
      await jput(url, token, payload);
      await loadExpenses(profileId, year);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  // ===== RENDER =====

  if (unavailable) {
    return (
      <div className="card">
        <h3>Business</h3>
        <div className="note" style={{ marginTop: 6 }}>
          Your firm hasn’t enabled the <b>Business expenses</b> module yet.
          Once it’s available, you’ll see a guided interview here.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row spread">
        <h3>Business</h3>
        <div className="row" style={{ gap: 8 }}>
          <button
            className={mode === "interview" ? "" : "secondary"}
            onClick={() => setMode("interview")}
            disabled={!profileId || loadingExpenses}
          >
            Interview
          </button>
          <button
            className={mode === "table" ? "" : "secondary"}
            onClick={() => setMode("table")}
            disabled={!profileId || loadingExpenses}
          >
            Table
          </button>
        </div>
      </div>

      {/* выбор профиля и года */}
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <select
          value={profileId || ""}
          onChange={(e) => setProfileId(e.target.value ? Number(e.target.value) : null)}
          disabled={loadingProfiles}
          style={{ minWidth: 240 }}
        >
          {!profiles.length && <option value="">No profiles</option>}
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.business_code || "—"})
            </option>
          ))}
        </select>

        <input
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value || "0"))}
          style={{ width: 110 }}
          disabled={!profileId || loadingExpenses}
        />

        <button
          className="secondary"
          onClick={() => loadExpenses(profileId, year)}
          disabled={!profileId || loadingExpenses}
        >
          {loadingExpenses ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Summary */}
      {profileId && (
        <div className="card" style={{ marginTop: 10 }}>
          <h4>Summary</h4>
          {!profileDetails && <div className="note">Loading profile…</div>}
          {profileDetails && (
            <div className="kv" style={{ marginTop: 6 }}>
              <div className="k">Name</div><div>{profileDetails.name || "—"}</div>
              <div className="k">Business code</div><div>{profileDetails.business_code || "—"}</div>
              <div className="k">EIN</div><div>{profileDetails.ein || "—"}</div>
              <div className="k">Type</div><div>{profileDetails.type || "—"}</div>
              {profileDetails.last_confirmed_year && (
                <>
                  <div className="k">Last confirmed</div><div>{profileDetails.last_confirmed_year}</div>
                </>
              )}
              <div className="k">Total (entered)</div><div>${totalEntered.toFixed(2)}</div>
            </div>
          )}
        </div>
      )}

      {/* Контент */}
      {!profileId && !loadingProfiles && (
        <div className="note" style={{ marginTop: 10 }}>
          No profiles yet. Ask your accountant to create one for you.
        </div>
      )}

      {profileId && mode === "interview" && (
        <ExpenseInterview
          year={year}
          items={expenses}
          saving={saving}
          onChangeAmount={(code, amount) => saveSingle(code, amount)}
        />
      )}

      {profileId && mode === "table" && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>Expenses for {year}</h4>
          {!expenses.length && <div className="note">No categories.</div>}
          {!!expenses.length && (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 240 }}>Category</th>
                      <th style={{ width: 160 }}>Amount</th>
                      <th style={{ width: 140 }}>Requires docs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.code}>
                        <td><b>{e.label || e.code}</b></td>
                        <td>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder="0.00"
                            value={e.amount ?? ""}
                            onChange={(ev) =>
                              setExpenses(prev =>
                                prev.map(x => x.code === e.code
                                  ? { ...x, amount: ev.target.value === "" ? null : Number(ev.target.value) }
                                  : x
                                )
                              )
                            }
                            style={{ width: 140 }}
                            disabled={saving}
                          />
                        </td>
                        <td>
                          <span className={`badge ${e.requires_docs ? "warn" : ""}`}>
                            {e.requires_docs ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="row" style={{ marginTop: 10, gap: 8 }}>
                <button className="secondary" onClick={() => loadExpenses(profileId, year)} disabled={saving}>
                  Refresh
                </button>
                <button onClick={saveAll} disabled={saving || !expenses.length}>
                  {saving ? "Saving…" : "Save all"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && <div className="alert" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
