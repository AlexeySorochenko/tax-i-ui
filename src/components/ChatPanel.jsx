import React, { useEffect, useRef, useState } from "react";
import { chatHistory, chatSocketUrl } from "./api";

export default function ChatPanel({ API, token, driverId, myUserId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const wsRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let alive = true;
    chatHistory(API, token, driverId).then((hist)=> { if (alive) setMessages(hist||[]); });
    const ws = new WebSocket(chatSocketUrl(API, token, driverId));
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      setMessages((m) => {
        // try match optimistic
        const idx = m.findIndex(x => x.temp && x.sender_user_id === data.sender_user_id && x.message === data.message);
        if (idx >= 0) {
          const copy = m.slice();
          copy[idx] = { ...data, status: "sent" };
          return copy;
        }
        return [...m, data];
      });
      setTimeout(()=> listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 0);
    };
    ws.onclose = () => {};
    return () => { alive=false; try{ws.close()}catch{} };
  }, [driverId]); // eslint-disable-line

  const send = () => {
    if (!text.trim()) return;
    const msg = { id: `tmp-${Date.now()}`, sender_user_id: myUserId, message: text, temp: true, status: "sending" };
    setMessages(m => [...m, msg]);
    wsRef.current?.send(JSON.stringify({ message: text }));
    setText("");
    setTimeout(()=> listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 0);
  };

  return (
    <div className="card" style={{display:"grid", gridTemplateRows:"1fr auto", height:400}}>
      <div ref={listRef} style={{overflowY:"auto", paddingRight:6}}>
        {messages.map(m => (
          <div key={m.id} className="row" style={{justifyContent: m.sender_user_id===myUserId?"flex-end":"flex-start", marginBottom:8}}>
            <div className="card" style={{maxWidth:"80%", padding:"8px 10px"}}>
              <div>{m.message}</div>
              <div className="note" style={{textAlign:"right"}}>{m.status==="sending" ? "…" : ""}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="row" style={{gap:8}}>
        <input placeholder="Type a message…" value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") send(); }} />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
