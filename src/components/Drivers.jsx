import React, { useEffect, useMemo, useState } from "react";
import { authHeaders } from "./api.js";

/**
 * Список водителей для бухгалтера:
 * - загружает /api/v1/drivers
 * - для каждого водителя запрашивает /api/v1/periods/status/{id}/{year}
 * - вычисляет общий статус: Ready / In progress / Waiting
 * - поиск по email + фильтр по статусу
 */

const API_DEFAULT = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function computeProgress(statusPayload) {
  // not_started -> Waiting с прогрессом 0/0
  if (!statusPayload || statusPayload.status === "not_started") {
    return { uploaded: 0, total: 0, state: "waiting" };
  }
  const checklist = Array.isArray(statusPayload.checklist) ? statusPayload.checklist : [];
  const total = checklist.length;
  const uploaded = checklist.filter((i) => i.status === "uploaded" || i.status === "approved").length;

  let state = "waiting";
  if (total > 0 && uploaded === total) state = "ready";
  else if (uploaded > 0) state = "in_progress";
  else state = "waiting";

  return { uploaded, total, state };
}

function StatusBadge({ state }) {
  const map = {
    ready: { cls: "ok", text: "Ready" },
    in_progress: { cls: "warn", text: "In progress" },
    waiting: { cls: "warn", text: "Waiting" },
  };
  const v = map[state] || map.waiting;
  return <span className={`badge ${v.cls}`}>{v.text}</span>;
}

export default function Drivers({ API = API_DEFAULT, token, onPick }) {
  const [list, setList] = useState([]);
  const [statuses, setStatuses] = useState({}); // id -> { uploaded, total, state }
  const [year, setYear] = useState(new Date().getFullYear());
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all|ready|in_progress|waiting
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // загрузка списка водителей
  const loadDrivers = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/v1/drivers`, { headers: authHeaders(token) });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = await r.json();
      const arr = Array.isArray(data) ? data : [];
      setList(arr);
      // после получения списка подтянем статусы
      await loadStatuses(arr);
    } catch (e) {
      setError(String(e));
      setList([]);
    } finally {
      setBusy(false);
    }
  };

  // загрузка статусов для всех водителей на выбранный год
  const loadStatuses = async (drivers = list) => {
    const entries = await Promise.all(
      drivers.map(async (d) => {
        try {
          const r = await fetch(`${API}/api/v1/periods/status/${d.id}/${year}`, {
            headers: authHeaders(token),
          });
          // ответ может быть 200 и в формате not_started или с checklist
          const payload = await r.json().catch(async () => {
            const txt = await r.text();
            throw new Error(txt || `${r.status} ${r.statusText}`);
          });
          return [d.id, computeProgress(payload)];
        } catch {
          return [d.id, { uploaded: 0, total: 0, state: "waiting" }];
        }
      })
    );
    const map = Object.fromEntries(entries);
    setStatuses(map);
  };

  useEffect(() => {
    loadDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // при смене года просто перезагружаем статусы
  useEffect(() => {
    if (list.length) loadStatuses(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const filtered = useMemo(() => {
    const normQ = q.trim().toLowerCase();
    return list.filter((d) => {
      const st = statuses[d.id]?.state || "waiting";
      const matchesQ = !normQ || (d.email || "").toLowerCase().includes(normQ);
      const matchesStatus = statusFilter === "all" || st === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [list, statuses, q, statusFilter]);

  return (
    <div>
      <div className="row spread">
        <h2>Drivers</h2>
        <div className="row" style={{ gap: 8 }}>
          <input
            placeholder="Filter by email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="ready">Ready</option>
            <option value="in_progress">In progress</option>
            <option value="waiting">Waiting</option>
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value || "0"))}
            style={{ width: 110 }}
          />
          <button className="secondary" onClick={loadDrivers} disabled={busy}>
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="alert" style={{ marginTop: 10 }}>{error}</div>}

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th style={{ width: 80 }}>ID</th>
            <th style={{ width: 260 }}>Email</th>
            <th style={{ width: 200 }}>Name</th>
            <th style={{ width: 140 }}>Progress</th>
            <th style={{ width: 140 }}>Status</th>
            <th style={{ width: 120 }}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d) => {
            const pr = statuses[d.id] || { uploaded: 0, total: 0, state: "waiting" };
            return (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.email}</td>
                <td>{d.name}</td>
                <td>{pr.uploaded}/{pr.total}</td>
                <td><StatusBadge state={pr.state} /></td>
                <td>
                  <button onClick={() => onPick(d)}>Open</button>
                </td>
              </tr>
            );
          })}
          {!filtered.length && (
            <tr>
              <td colSpan="6" className="note">
                {busy ? "Loading…" : "No drivers match your filters."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
