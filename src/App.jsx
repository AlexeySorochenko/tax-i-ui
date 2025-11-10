// src/App.jsx
import React, { useEffect, useState } from "react";
import { fetchMe, getProfiles } from "./components/api";
import Auth from "./pages/Auth";
import ProfilesHome from "./pages/ProfilesHome";
import NewProfile from "./pages/NewProfile";
import Checklist from "./pages/Checklist";

const API = import.meta.env.VITE_API || "https://tax-i.onrender.com";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("access_token") || "");
  const [me, setMe] = useState(null);
  const [route, setRoute] = useState("loading"); // loading | home | new | checklist
  const [ctx, setCtx] = useState(null); // { profileId, profileType }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { setRoute("auth"); return; }
      try {
        const u = await fetchMe(API, token);
        if (!alive) return;
        setMe(u);
        const list = await getProfiles(API, token);
        if (!alive) return;
        if (Array.isArray(list) && list.length > 0) {
          setRoute("home");
        } else {
          setRoute("new");
        }
      } catch {
        localStorage.removeItem("access_token");
        setToken("");
        setRoute("auth");
      }
    })();
    return () => { alive = false; };
  }, [token]);

  if (route === "auth") {
    return <Auth API={API} onLoggedIn={(tok) => { localStorage.setItem("access_token", tok); setToken(tok); }} />;
  }

  if (route === "loading") {
    return <div style={{padding:24}}>Loading…</div>;
  }

  if (route === "new") {
    return (
      <NewProfile
        API={API}
        token={token}
        onCreated={(profileId, profileType) => { setCtx({ profileId, profileType }); setRoute("checklist"); }}
        onCancel={() => setRoute("home")}
      />
    );
  }

  if (route === "checklist" && ctx) {
    return (
      <Checklist
        API={API}
        token={token}
        profileId={ctx.profileId}
        profileType={ctx.profileType}
        onDone={() => setRoute("home")}
        onBack={() => setRoute("home")}
      />
    );
  }

  // route === "home"
  return (
    <ProfilesHome
      API={API}
      token={token}
      onNew={() => setRoute("new")}
      onOpen={(profileId, profileType) => { setCtx({ profileId, profileType }); setRoute("checklist"); }}
      onLogout={() => { localStorage.removeItem("access_token"); setToken(""); }}
    />
  );
}
