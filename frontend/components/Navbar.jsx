"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { API } from "../lib/api";
import ThemeToggle from "./ThemeToggle";

const BASE_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/chat", label: "Chat" },
  { href: "/summary", label: "Résumés" },
  { href: "/quiz", label: "Quiz" },
  { href: "/documents", label: "Documents" },
];

function Avatar({ user }) {
  if (user?.image) {
    return <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />;
  }
  const initial = (user?.name || user?.email || "?")[0].toUpperCase();
  return <span className="btn-glow flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">{initial}</span>;
}

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const LINKS = session?.user?.role === "admin" ? [...BASE_LINKS, { href: "/admin", label: "Admin" }] : BASE_LINKS;
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
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
    <header className={`sticky top-0 z-50 transition duration-300 ${scrolled ? "nav-glass border-b border-white/10 shadow-lg shadow-black/20" : ""}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-white" onClick={() => { setOpen(false); setMenu(false); }}>
          <span className="btn-glow flex h-9 w-9 items-center justify-center rounded-xl">🎓</span>
          <span className="text-lg">Edu<span className="gradient-text">RAG</span></span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`rounded-full px-4 py-1.5 text-sm transition ${pathname === l.href ? "btn-glow" : "text-slate-400 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 lg:flex">
            <span className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-emerald-400" : "bg-rose-500"}`} />
            {online ? "API en ligne" : "API hors ligne"}
          </span>

          <ThemeToggle />

          {status === "authenticated" ? (
            <div className="relative">
              <button onClick={() => setMenu(!menu)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-sm text-slate-200">
                <Avatar user={session.user} />
                <span className="hidden max-w-[110px] truncate sm:block">{session.user.name || session.user.email}</span>
              </button>
              {menu && (
                <div className="animate-up menu-panel absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 p-2 shadow-xl">
                  <div className="truncate px-3 py-2 text-xs text-slate-400">{session.user.email}</div>
                  <Link href="/profile" onClick={() => setMenu(false)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10">
                    Mon profil
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10">
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : status === "unauthenticated" ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="rounded-xl px-3 py-2 text-sm text-slate-300 hover:text-white">Connexion</Link>
              <Link href="/signup" className="btn-glow rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95">S'inscrire</Link>
            </div>
          ) : null}

          <button className="rounded-lg p-2 text-slate-300 hover:bg-white/10 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
        </div>
      </nav>

      {open && (
        <div className="animate-up menu-panel mx-4 mb-3 flex flex-col rounded-2xl border border-white/10 p-2 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`rounded-xl px-4 py-2.5 text-sm ${pathname === l.href ? "btn-glow" : "text-slate-400"}`}>
              {l.label}
            </Link>
          ))}
          {status === "unauthenticated" && (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-sm text-slate-400">Connexion</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-sm text-slate-400">S'inscrire</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}