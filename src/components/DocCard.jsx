import React from 'react'

export default function DocCard({ d }) {
  let fields = {}
  let quality = []
  try {
    const payload = JSON.parse(d.fields_json || '{}')
    fields = payload.fields || {}
    quality = payload.quality_issues || []
  } catch (_) {}

  return (
    <div className="card" style={{marginBottom:10}}>
      <div className="row spread">
        <div className="row" style={{gap:8}}>
          <span className="badge">{d.doc_type}</span>
          <b>{d.filename}</b>
        </div>
        <span className="badge">{d.status}</span>
      </div>
      <hr className="sep" />
      <div className="grid grid-cols-3">
        <div>
          <div className="kv">
            {Object.entries(fields).map(([k,v]) => (
              <React.Fragment key={k}>
                <div className="k">{k}</div>
                <div>{String(v)}</div>
              </React.Fragment>
            ))}
            {!Object.keys(fields).length && (<><div className="k">fields</div><div>—</div></>)}
          </div>
        </div>
        <div>
          <div className="k">Quality</div>
          <div style={{marginTop:6}}>
            {quality.length ? quality.map((q,i)=>(<span key={i} className="badge warn" style={{marginRight:6}}>{q}</span>)) : <span className="note">No issues</span>}
          </div>
        </div>
        <div>
          <div className="k">Stored name</div>
          <div>{d.stored_filename}</div>
        </div>
      </div>
    </div>
  )
}
