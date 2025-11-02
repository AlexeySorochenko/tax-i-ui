import React, { useEffect, useState } from "react";
import { accountantDashboard, accountantInviteLink } from "./api";

export default function AccountantHome({ API, token, year }) {
  const [data, setData] = useState(null);
  const [inv, setInv] = useState("");

  const load = async () => {
    const d = await accountantDashboard(API, token, year).catch(()=>null);
    setData(d);
  };
  useEffect(()=>{ load(); }, [year]); // eslint-disable-line

  const getInvite = async () => {
    const r = await accountantInviteLink(API, token).catch(()=>null);
    setInv(r?.invite_link || "");
    if (r?.invite_link) {
      await navigator.clipboard.writeText(r.invite_link).catch(()=>{});
      alert("Invite link copied");
    }
  };

  return (
    <div className="grid">
      <div className="card">
        <h2>To review</h2>
        {!data?.drivers_requiring_review?.length && (
          <div className="hero"><b>You are awesome!</b> Nothing pending.</div>
        )}
        {data?.drivers_requiring_review?.map((d)=>(
          <div key={d.user_id} className="tile">
            <div>
              <b>{d.email}</b>
              <div className="note">{d.summary || "Needs attention"}</div>
            </div>
            <button className="secondary">Open</button>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row spread">
          <h2>All clients</h2>
          <button onClick={getInvite}>Invite driver</button>
        </div>
        {inv && <div className="alert" style={{marginTop:8, wordBreak:"break-all"}}>{inv}</div>}
        {(data?.drivers_all_active||[]).map((d)=>(
          <div key={d.user_id} className="tile">
            <div><b>{d.email}</b><div className="note">{d.status || "Active"}</div></div>
            <button className="secondary">Open</button>
          </div>
        ))}
      </div>
    </div>
  );
}
