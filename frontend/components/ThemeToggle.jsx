"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Changer de thème"
      title={theme === "dark" ? "Mode clair" : "Mode sombre"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base transition hover:bg-white/10 active:scale-90"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}