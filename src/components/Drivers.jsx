import React, { useEffect, useState } from "react";
import { authHeaders } from "./api.js";

export default function Drivers({ API, token, onPick }) {
  const [list, setList] = useState([]);
  const [email, setEmail] = useState("driver1@example.com");
  const [name, setName] = useState("Driver One");
  const [password, setPassword] = useState("Passw0rd!");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch(`${API}/api/v1/drivers`, { headers: authHeaders(token) });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = await r.json();
      setList(Array.isArray(data) ? data : []);
      if (!Array.isArray(data)) setError("Unexpected response shape");
    } catch (e) {
      setList([]);
      setError(String(e));
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true); setError(null);
    try {
      await fetch(`${API}/api/v1/drivers`, {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({ email, name, password }),
      });
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="row spread">
        <h2>Drivers</h2>
        <button className="secondary" onClick={load}>Refresh</button>
      </div>

      <div className="card" style={{ margin: "10px 0 14px" }}>
        <div className="row">
          <input placeholder="Driver email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ minWidth: 240 }} />
          <input placeholder="Driver name" value={name} onChange={(e) => setName(e.target.value)} style={{ minWidth: 180 }} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ minWidth: 160 }} />
          <button onClick={create} disabled={busy || !email || !name || !password}>Add Driver</button>
        </div>
        <div className="note" style={{ marginTop: 8 }}>
          Drivers are standard users with the <b>driver</b> role.
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>
          {list.map((d) => (
            <tr key={d.id}>
              <td>{d.id}</td>
              <td>{d.name}</td>
              <td>{d.email}</td>
              <td><span className="badge blue">{d.role}</span></td>
              <td><button onClick={() => onPick(d)}>Open</button></td>
            </tr>
          ))}
          {!list.length && !error && (
            <tr><td colSpan="5" className="note">No drivers yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
