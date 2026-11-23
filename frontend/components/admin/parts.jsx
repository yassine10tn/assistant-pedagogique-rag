"use client";

import { useEffect } from "react";

export function StatCard({ icon, label, value, hint }) {
  return (
    <div className="animate-up rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-extrabold text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 items-stretch gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs text-slate-400">{d.value}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-cyan-400 transition-all duration-700"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 6 : 3, opacity: d.value ? 1 : 0.25 }}
            />
          </div>
          <span className="text-[11px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ parts }) {
  const sum = parts.reduce((a, p) => a + p.value, 0);
  let acc = 0;
  const stops = parts
    .map((p) => {
      const from = (acc / (sum || 1)) * 100;
      acc += p.value;
      return `${p.color} ${from}% ${(acc / (sum || 1)) * 100}%`;
    })
    .join(", ");
  return (
    <div className="flex items-center gap-6">
      <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: sum ? `conic-gradient(${stops})` : "#64748b33" }}>
        <div className="menu-panel absolute inset-4 flex items-center justify-center rounded-full text-xl font-bold text-white">{sum}</div>
      </div>
      <ul className="space-y-1.5 text-sm text-slate-300">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
            {p.label} <span className="text-slate-500">({p.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PILL = {
  slate: "bg-white/10 text-slate-300",
  indigo: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30",
  green: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
  red: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-400/30",
  amber: "bg-amber-400/15 text-amber-500 ring-1 ring-amber-400/30",
};

export function Pill({ tone = "slate", children }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${PILL[tone]}`}>{children}</span>;
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-backdrop fixed inset-0 z-[105] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`animate-up menu-panel max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/10 p-6 shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-500 hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const dateFmt = (iso) => (iso ? iso.replace("T", " ").slice(0, 16) : "-");
export const th = "py-2 pr-4 font-medium";
export const td = "py-2.5 pr-4";