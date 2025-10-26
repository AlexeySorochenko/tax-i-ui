import React, { useEffect, useMemo, useState } from "react";
import { authHeaders } from "./api.js";

/**
 * Панель бизнес-профилей и расходов для водителя.
 * Бэк ожидается с эндпоинтами:
 *  - GET  /api/v1/business/profiles/{user_id}
 *  - POST /api/v1/business/profiles              body: { name, business_code, ein? }
 *  - GET  /api/v1/business/{business_profile_id}/expenses/{year}
 *  - PUT  /api/v1/business/{business_profile_id}/expenses/{year} body: [{ code, amount }, ...]
 *  - GET  /api/v1/business/profiles/{business_profile_id}
 */

export default function BusinessPanel({ API, token, me }) {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState(null);

  const [year, setYear] = useState(new Date().getFullYear());
  const [profileDetails, setProfileDetails] = useState(null);

  const [expenses, setExpenses] = useState([]); // [{ code, label, amount, requires_docs }]
  const [dirty, setDirty] = useState(false);

  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [saving, setSaving] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");  // e.g. "TAXI", "TRUCKING" (NAICS/own code)
  const [newEIN, setNewEIN] = useState("");

  const [error, setError] = useState(null);

  // ---- LOADERS ----
  const loadProfiles = async () => {
    setError(null);
    setLoadingProfiles(true);
    try {
      const r = await fetch(`${API}/api/v1/business/profiles/${me.id}`, {
        headers: authHeaders(token),
      });
      if (!r.ok) throw new Error(await r.text());
      const arr = await r.json();
      setProfiles(Array.isArray(arr) ? arr : []);
      // если профиля ещё нет — не выбираем ничего
      if (!profileId && Array.isArray(arr) && arr.length) {
        setProfileId(arr[0].id);
      }
    } catch (e) {
      setProfiles([]);
      setError(String(e));
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
    } catch (e) {
      setProfileDetails(null);
      setError(String(e));
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
      setDirty(false);
    } catch (e) {
      setExpenses([]);
      setError(String(e));
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => { loadProfiles(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadProfileDetails(profileId); loadExpenses(profileId, year); /* eslint-disable-next-line */ }, [profileId]);
  useEffect(() => { if (profileId) loadExpenses(profileId, year); /* eslint-disable-next-line */ }, [year]);

  // ---- CREATE PROFILE ----
  const createProfile = async () => {
    if (!newName || !newCode) return;
    setCreating(true);
    setError(null);
    try {
      const body = { name: newName, business_code: newCode };
      if (newEIN) body.ein = newEIN;

      const r = await fetch(`${API}/api/v1/business/profiles`, {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());

      setNewName(""); setNewCode(""); setNewEIN("");
      await loadProfiles();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  // ---- EDIT EXPENSES ----
  const updateAmount = (code, value) => {
    setExpenses((prev) =>
      prev.map((it) =>
        it.code === code ? { ...it, amount: value === "" ? null : Number(value) } : it
      )
    );
    setDirty(true);
  };

  const canSave = useMemo(() => {
    if (!dirty || !profileId) return false;
    // валидация: все amounts должны быть либо null, либо валидными числами
    return expenses.every((e) => e.amount === null || (typeof e.amount === "number" && !isNaN(e.amount)));
  }, [dirty, profileId, expenses]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      // Отправляем только введённые суммы
      const payload = expenses
        .filter((e) => e.amount !== null && e.amount !== undefined && !isNaN(e.amount))
        .map((e) => ({ code: e.code, amount: e.amount }));

      const r = await fetch(`${API}/api/v1/business/${profileId}/expenses/${year}`, {
        method: "PUT",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());

      // Обновим с бэка после сохранения
      await loadExpenses(profileId, year);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3>Business</h3>
      {error && <div className="alert" style={{ marginTop: 6 }}>{error}</div>}

      {/* Профили */}
      <div className="grid grid-cols-2" style={{ marginTop: 8 }}>
        <div>
          <h4 style={{ marginBottom: 6 }}>Profiles</h4>
          {loadingProfiles && <div className="note">Loading profiles…</div>}
          {!loadingProfiles && (
            <div className="row" style={{ gap: 8 }}>
              <select
                value={profileId || ""}
                onChange={(e) => setProfileId(e.target.value ? Number(e.target.value) : null)}
                style={{ minWidth: 220 }}
              >
                {!profiles.length && <option value="">No profiles</option>}
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.business_code || "—"})</option>
                ))}
              </select>

              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value || "0"))}
                style={{ width: 110 }}
                disabled={!profileId || loadingExpenses || saving}
              />
            </div>
          )}

          {/* Создание профиля */}
          <div className="card" style={{ marginTop: 10 }}>
            <h4>Create profile</h4>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <input placeholder="Business name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input placeholder="Business code (e.g. TAXI)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
              <input placeholder="EIN (optional)" value={newEIN} onChange={(e) => setNewEIN(e.target.value)} />
              <button onClick={createProfile} disabled={creating || !newName || !newCode}>
                {creating ? "Creating…" : "Add"}
              </button>
            </div>
            <div className="note" style={{ marginTop: 4 }}>
              Code can be NAICS or internal marker (e.g. TAXI / TRUCKING).
            </div>
          </div>
        </div>

        {/* Summary Block */}
        <div>
          <h4 style={{ marginBottom: 6 }}>Summary</h4>
          {!profileId && <div className="note">Select a business profile</div>}
          {profileId && !profileDetails && <div className="note">Loading profile…</div>}
          {profileId && profileDetails && (
            <div className="kv">
              <div className="k">Name</div><div>{profileDetails.name || "—"}</div>
              <div className="k">Business code</div><div>{profileDetails.business_code || "—"}</div>
              <div className="k">EIN</div><div>{profileDetails.ein || "—"}</div>
              <div className="k">Type</div><div>{profileDetails.type || "—"}</div>
              <div className="k">Address</div><div>{profileDetails.address || "—"}</div>
              {profileDetails.last_confirmed_year && (
                <>
                  <div className="k">Last confirmed</div><div>{profileDetails.last_confirmed_year}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expenses */}
      <div className="card" style={{ marginTop: 12 }}>
        <h4>Expenses for {year}</h4>

        {!profileId && <div className="note">Create or select a profile to manage expenses.</div>}

        {profileId && loadingExpenses && <div className="note">Loading expenses…</div>}

        {profileId && !loadingExpenses && !expenses.length && (
          <div className="note">No expense categories for this year.</div>
        )}

        {profileId && !loadingExpenses && !!expenses.length && (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Category</th>
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
                          onChange={(ev) => updateAmount(e.code, ev.target.value)}
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
              <button className="secondary" onClick={() => loadExpenses(profileId, year)} disabled={loadingExpenses || saving}>
                Refresh
              </button>
              <button onClick={save} disabled={!canSave}>
                {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
