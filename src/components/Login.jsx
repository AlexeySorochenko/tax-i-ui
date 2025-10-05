import React, { useState } from 'react'

export default function Login({ API, onLoggedIn }) {
  const [email, setEmail] = useState('acc@example.com')
  const [password, setPassword] = useState('pwd')
  const [name, setName] = useState('Accounting Co')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const register = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, name, password, role: 'accountant' })
      })
      if (!res.ok) throw new Error(await res.text())
      alert('Registered. Now sign in.')
    } catch (e) {
      setError(String(e))
    } finally { setBusy(false) }
  }

  const login = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`${API}/auth/token`, {
        method: 'POST',
        headers: {'Content-Type':'application/x-www-form-urlencoded'},
        body: new URLSearchParams({ username: email, password })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      onLoggedIn(data.access_token, { email })
    } catch (e) {
      setError(String(e))
    } finally { setBusy(false) }
  }

  return (
    <div>
      <h2>Sign in</h2>
      <p className="note">Use your accountant account. For demo, you can register below.</p>
      <div className="row">
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Name (for registration)" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      <div className="row right" style={{marginTop:12}}>
        <button onClick={login} disabled={busy}>Sign in</button>
        <button className="secondary" onClick={register} disabled={busy}>Register</button>
      </div>
      {error && <div className="alert" style={{marginTop:12}}>{error}</div>}
    </div>
  )
}
