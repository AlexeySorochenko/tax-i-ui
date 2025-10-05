import React, { useState } from 'react'
import Login from './components/Login.jsx'
import Drivers from './components/Drivers.jsx'
import DriverDetail from './components/DriverDetail.jsx'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export default function App() {
  const [token, setToken] = useState(null)
  const [me, setMe] = useState(null)
  const [driver, setDriver] = useState(null)

  const onLoggedIn = (tok, user) => { setToken(tok); setMe(user) }
  const logout = () => { setToken(null); setMe(null); setDriver(null) }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="logo">🧾</div>
          <h1>Tax Intake</h1>
        </div>
        <div className="row">
          <span className="note">{API}</span>
          {token && <button className="secondary" onClick={logout}>Logout</button>}
        </div>
      </div>

      {!token && (
        <div className="card">
          <Login API={API} onLoggedIn={onLoggedIn} />
        </div>
      )}

      {token && !driver && (
        <div className="grid">
          <div className="card">
            <Drivers API={API} token={token} onPick={(d)=>setDriver(d)} />
          </div>
        </div>
      )}

      {token && driver && (
        <div className="grid">
          <div className="card">
            <DriverDetail API={API} token={token} driver={driver} onBack={()=>setDriver(null)} />
          </div>
        </div>
      )}

      <div className="footer">B2B2C SaaS for accounting firms • MVP</div>
    </div>
  )
}
