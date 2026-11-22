"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { API } from "../lib/api";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/chat", label: "Chat" },
  { href: "/summary", label: "Résumés" },
  { href: "/quiz", label: "Quiz" },
  { href: "/documents", label: "Documents" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    async function check() {
      try { setOnline((await fetch(`${API}/health`)).ok); } catch { setOnline(false); }
    }
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition duration-300 ${scrolled ? "border-b border-white/10 bg-[#060914]/80 shadow-lg shadow-black/30 backdrop-blur-xl" : "bg-transparent"}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-white">
          <span className="btn-glow flex h-9 w-9 items-center justify-center rounded-xl">🎓</span>
          <span className="text-lg">Edu<span className="gradient-text">RAG</span></span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`rounded-full px-4 py-1.5 text-sm transition ${pathname === l.href ? "btn-glow text-white" : "text-slate-400 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <span className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-emerald-400" : "bg-rose-500"}`} />
            {online ? "API en ligne" : "API hors ligne"}
          </span>
          <button className="rounded-lg p-2 text-slate-300 hover:bg-white/10 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
        </div>
      </nav>

      {open && (
        <div className="animate-up mx-4 mb-3 flex flex-col rounded-2xl border border-white/10 bg-[#0b1020] p-2 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`rounded-xl px-4 py-2.5 text-sm ${pathname === l.href ? "btn-glow text-white" : "text-slate-400"}`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}