import React, { useEffect, useMemo, useState } from "react";
import { authHeaders } from "./api.js";

/**
 * Панель бухгалтера:
 * - Создание водителя (email, name, password)
 * - Список водителей с прогрессом загрузок за выбранный год
 * - Поиск по email и фильтр по статусу (All/Ready/In progress/Waiting)
 */

const API_DEFAULT = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function computeProgress(statusPayload) {
  if (!statusPayload || statusPayload.status === "not_started") {
    return { uploaded: 0, total: 0, state: "waiting" };
  }
  const checklist = Array.isArray(statusPayload.checklist) ? statusPayload.checklist : [];
  const total = checklist.length;
  const uploaded = checklist.filter((i) => i.status === "uploaded" || i.status === "approved").length;

  let state = "waiting";
  if (total > 0 && uploaded === total) state = "ready";
  else if (uploaded > 0) state = "in_progress";
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
  // список и статусы
  const [list, setList] = useState([]);
  const [statuses, setStatuses] = useState({}); // id -> { uploaded, total, state }

  // фильтры
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all|ready|in_progress|waiting
  const [year, setYear] = useState(new Date().getFullYear());

  // создание водителя
  const [newEmail, setNewEmail] = useState("driver1@example.com");
  const [newName, setNewName] = useState("Driver One");
  const [newPwd, setNewPwd] = useState("Passw0rd!");

  // загрузчики/ошибки
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // === data loaders ===
  const loadDrivers = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/v1/drivers`, { headers: authHeaders(token) });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = await r.json();
      const arr = Array.isArray(data) ? data : [];
      setList(arr);
      await loadStatuses(arr);
    } catch (e) {
      setError(String(e));
      setList([]);
    } finally {
      setBusy(false);
    }
  };

  const loadStatuses = async (drivers = list) => {
    const entries = await Promise.all(
      drivers.map(async (d) => {
        try {
          const r = await fetch(`${API}/api/v1/periods/status/${d.id}/${year}`, {
            headers: authHeaders(token),
          });
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
    setStatuses(Object.fromEntries(entries));
  };

  useEffect(() => { loadDrivers(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (list.length) loadStatuses(list); /* eslint-disable-next-line */ }, [year]);

  // === create driver ===
  const createDriver = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/drivers`, {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({ email: newEmail, name: newName, password: newPwd }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewEmail("");
      setNewName("");
      setNewPwd("");
      await loadDrivers();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  // === filters ===
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

      {/* create driver */}
      <div className="card" style={{ margin: "12px 0" }}>
        <h3>Create driver</h3>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ minWidth: 180 }}
          />
          <input
            placeholder="Password"
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            style={{ minWidth: 160 }}
          />
          <button onClick={createDriver} disabled={creating || !newEmail || !newName || !newPwd}>
            {creating ? "Creating…" : "Add driver"}
          </button>
        </div>
        <div className="note" style={{ marginTop: 6 }}>
          New users are created with the <b>driver</b> role.
        </div>
      </div>

      {error && <div className="alert" style={{ marginTop: 8 }}>{error}</div>}

      {/* table */}
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
                <td><button onClick={() => onPick(d)}>Open</button></td>
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
