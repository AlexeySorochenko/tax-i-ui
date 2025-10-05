import React from 'react'

export default function StatusPills({ title, items=[], tone='blue' }) {
  const cls = tone === 'ok' ? 'badge ok' : tone === 'warn' ? 'badge warn' : 'badge blue'
  return (
    <div style={{marginTop:4}}>
      <div className="k" style={{marginBottom:4}}>{title}</div>
      <div className="row">
        {items.length ? items.map(x => <span key={x} className={cls}>{x}</span>) : <span className="note">—</span>}
      </div>
    </div>
  )
}
