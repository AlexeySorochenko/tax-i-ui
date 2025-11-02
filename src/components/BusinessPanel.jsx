import React, { useEffect, useMemo, useState } from "react";
import { jget, jput, jpost } from "./api.js";
import ExpenseWizard from "./ExpenseWizard.jsx";

export default function BusinessPanel({ API, token, me }) {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [details, setDetails] = useState(null);
  const [items, setItems] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newEIN, setNewEIN] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const total = useMemo(
    () => items.reduce((s,i)=> s + (typeof i.amount==='number'? i.amount : 0), 0),
    [items]
  );

  const loadProfiles = async () => {
    try {
      const arr = await jget(`${API}/api/v1/business/profiles/${me.id}`, token);
      setProfiles(Array.isArray(arr) ? arr : []);
      if (!profileId && arr?.length) setProfileId(arr[0].id);
    } catch (e) { setError(String(e)); }
  };
  const loadDetails = async () => {
    if (!profileId) return setDetails(null);
    try { setDetails(await jget(`${API}/api/v1/business/profiles/${profileId}`, token)); }
    catch { setDetails(null); }
  };
  const loadItems = async () => {
    if (!profileId) return setItems([]);
    try {
      const data = await jget(`${API}/api/v1/business/${profileId}/expenses/${year}`, token);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { setItems([]); setError(String(e)); }
  };
  useEffect(()=>{ loadProfiles(); /* eslint-disable-next-line */ },[]);
  useEffect(()=>{ if(profileId){ loadDetails(); loadItems(); } /* eslint-disable-next-line */ },[profileId]);
  useEffect(()=>{ if(profileId){ loadItems(); } /* eslint-disable-next-line */ },[year]);

  const createProfile = async () => {
    if (!newName.trim()) return;
    setCreating(true); setError(null);
    try{
      await jpost(`${API}/api/v1/business/profiles`, token, {
        name:newName.trim(),
        ...(newCode.trim()?{business_code:newCode.trim()}:{}),
        ...(newEIN.trim()?{ein:newEIN.trim()}:{}),
      });
      setNewName(""); setNewCode(""); setNewEIN("");
      await loadProfiles();
    }catch(e){ setError(String(e)); }
    finally{ setCreating(false); }
  };

  const saveOne = async (code, amount) => {
    if (!profileId) return;
    setSaving(true); setError(null);
    try{
      await jput(`${API}/api/v1/business/${profileId}/expenses/${year}`, token, { expenses:[{code, amount}] });
      setItems(prev => prev.map(x => x.code===code ? {...x, amount} : x));
    }catch(e){ setError(String(e)); }
    finally{ setSaving(false); }
  };

  return (
    <div className="card">
      <div className="row">
        <h2 style={{margin:0}}>Business</h2>
        <span className="badge rightChip">Total ${total.toFixed(2)}</span>
      </div>

      {error && <div className="alert section">{String(error)}</div>}

      <div className="card section">
        <h4>Profile & Tax Year</h4>
        <div className="row" style={{gap:8, marginTop:6}}>
          <select value={profileId || ""} onChange={(e)=>setProfileId(e.target.value?Number(e.target.value):null)} style={{minWidth:260}}>
            {!profiles.length && <option value="">No profiles</option>}
            {profiles.map(p=> <option key={p.id} value={p.id}>{p.name} ({p.business_code||"—"})</option>)}
          </select>
          <input type="number" value={year} onChange={(e)=>setYear(parseInt(e.target.value||"0"))} style={{width:110}} />
        </div>

        <div className="row" style={{gap:8, marginTop:10}}>
          <input placeholder="Business name" value={newName} onChange={e=>setNewName(e.target.value)} />
          <input placeholder="Business code (optional)" value={newCode} onChange={e=>setNewCode(e.target.value)} />
          <input placeholder="EIN (optional)" value={newEIN} onChange={e=>setNewEIN(e.target.value)} />
          <button onClick={createProfile} disabled={creating || !newName.trim()}>{creating ? "Creating…" : "Add"}</button>
        </div>
      </div>

      {profileId && (
        <div className="card section">
          <h4>Summary</h4>
          {!details && <div className="note">Loading…</div>}
          {details && (
            <div className="kv" style={{marginTop:6}}>
              <div className="k">Name</div><div>{details.name || "—"}</div>
              <div className="k">Business code</div><div>{details.business_code || "—"}</div>
              <div className="k">EIN</div><div>{details.ein || "—"}</div>
            </div>
          )}
        </div>
      )}

      {profileId && (
        <ExpenseWizard
          year={year}
          items={items}
          saving={saving}
          onSaveOne={saveOne}
        />
      )}
    </div>
  );
}
