import React, { useEffect, useState } from 'react'
import { authHeaders } from './api.js'

export default function Drivers({ API, token, onPick }) {
  const [list, setList] = useState([])
  const [email, setEmail] = useState('driver1@example.com')
  const [name, setName] = useState('Driver One')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/v1/drivers`, { headers: authHeaders(token) })
      const data = await r.json()
      setList(data)
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(()=>{ load() }, [])

  const create = async () => {
    setBusy(true); setError(null)
    try {
      await fetch(`${API}/api/v1/drivers`, {
        method:'POST',
        headers: authHeaders(token, {'Content-Type':'application/json'}),
        body: JSON.stringify({ email, name })
      })
      await load()
    } catch (e) {
      setError(String(e))
    } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="row spread">
        <h2>Drivers</h2>
        <button className="secondary" onClick={load}>Refresh</button>
      </div>

      <div className="card" style={{margin:'10px 0 14px'}}>
        <div className="row">
          <input placeholder="Driver email" value={email} onChange={e=>setEmail(e.target.value)} style={{minWidth:260}} />
          <input placeholder="Driver name" value={name} onChange={e=>setName(e.target.value)} />
          <button onClick={create} disabled={busy}>Add Driver</button>
        </div>
        <div className="note" style={{marginTop:8}}>Drivers are standard users with the <b>driver</b> role.</div>
      </div>

      {error && <div className="alert">{error}</div>}

      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>
          {list.map(d => (
            <tr key={d.id}>
              <td>{d.id}</td>
              <td>{d.name}</td>
              <td>{d.email}</td>
              <td><span className="badge blue">{d.role}</span></td>
              <td><button onClick={()=>onPick(d)}>Open</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
