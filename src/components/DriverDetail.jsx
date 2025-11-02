import React, { useEffect, useState } from 'react'
import { authHeaders } from './api.js'
import DocCard from './DocCard.jsx'
import StatusPills from './StatusPills.jsx'

export default function DriverDetail({ API, token, driver, onBack }) {
  const [docs, setDocs] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [status, setStatus] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const loadDocs = async () => {
    try {
      const r = await fetch(`${API}/api/v1/documents/by-driver/${driver.id}`, { headers: authHeaders(token) })
      setDocs(await r.json())
    } catch (e) {
      setError(String(e))
    }
  }
  const loadStatus = async () => {
    try {
      const r = await fetch(`${API}/api/v1/periods/status/${driver.id}/${year}`, { headers: authHeaders(token) })
      setStatus(await r.json())
    } catch (e) {
      setStatus(null)
    }
  }
  const ensurePeriod = async () => {
    await fetch(`${API}/api/v1/periods/ensure/${driver.id}/${year}`, { method:'POST', headers: authHeaders(token) })
    await loadStatus()
  }
  const advanceStage = async () => {
    if (!status?.period?.id) return
    await fetch(`${API}/api/v1/periods/advance/${status.period.id}`, { method:'POST', headers: authHeaders(token) })
    await loadStatus()
  }

  useEffect(()=>{ loadDocs(); loadStatus() }, [driver.id, year])

  const upload = async () => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      await fetch(`${API}/api/v1/documents/upload/${driver.id}`, { method:'POST', headers: authHeaders(token), body: form })
      await loadDocs(); await loadStatus()
      setFile(null)
    } catch (e) {
      setError(String(e))
    } finally { setBusy(false) }
  }

  const exportCsv = () => {
    window.open(`${API}/api/v1/exports/csv/${driver.id}`, '_blank')
  }

  return (
    <div>
      <div className="row spread">
        <div className="row" style={{gap:10}}>
          <button className="ghost" onClick={onBack}>← Back</button>
          <h2>{driver.name}</h2>
          <span className="badge">{driver.email}</span>
        </div>
        <div className="row">
          <input type="number" value={year} onChange={e=>setYear(parseInt(e.target.value||'0'))} style={{width:120}} />
          <button className="secondary" onClick={ensurePeriod}>Ensure period</button>
          <button onClick={advanceStage} disabled={!status?.period?.id}>Advance stage</button>
          <button onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {error && <div className="alert" style={{margin:'10px 0'}}>{error}</div>}

      <div className="grid grid-cols-2" style={{marginTop:10}}>
        <div className="card">
          <h3>Upload document</h3>
          <div className="row" style={{marginTop:8}}>
            <input type="file" onChange={e=>setFile(e.target.files?.[0])} />
            <button onClick={upload} disabled={!file || busy}>Upload</button>
          </div>
          <p className="note" style={{marginTop:8}}>Supports images and PDFs. OCR + extraction will run automatically.</p>
        </div>

        <div className="card">
          <h3>Tax period status</h3>
          {!status && <div className="note">No status yet. Click <b>Ensure period</b>.</div>}
          {status && (
            <div>
              <div className="kv" style={{marginTop:6}}>
                <div className="k">Stage</div><div><span className="badge">{status.period?.stage}</span></div>
                <div className="k">Year</div><div>{status.period?.year}</div>
              </div>
              <StatusPills title="Expected" items={status.period?.expected_docs || []} />
              <StatusPills title="Have" tone="ok" items={status.have || []} />
              <StatusPills title="Missing" tone="warn" items={status.missing || []} />
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{marginTop:14}}>
        <h3>Documents</h3>
        {docs.length === 0 && <p className="note">No documents yet.</p>}
        <div>
          {docs.map(d => <DocCard key={d.id} d={d} />)}
        </div>
      </div>
    </div>
  )
}
