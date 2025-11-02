import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const pref = localStorage.getItem("theme") || "light";
    return pref === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [dark]);

  return (
    <button className="secondary" onClick={() => setDark(v => !v)} title="Toggle theme">
      {dark ? "☾ Night" : "☀︎ Light"}
    </button>
  );
}
