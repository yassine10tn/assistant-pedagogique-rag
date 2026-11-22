export function Card({ className = "", children }) {
  return (
    <div className={`animate-up rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-md transition duration-300 hover:border-indigo-400/40 ${className}`}>
      {children}
    </div>
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "btn-glow text-white",
    secondary: "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10",
    ghost: "text-slate-300 hover:bg-white/10",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Spinner({ label }) {
  return (
    <span className="inline-flex items-center gap-3 text-sm text-slate-400">
      <span className="dots"><span /><span /><span /></span>
      {label}
    </span>
  );
}

export function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-white/10 text-slate-300",
    indigo: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30",
    green: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ icon, title, subtitle }) {
  return (
    <div className="animate-up mb-8">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl btn-glow text-2xl">{icon}</div>
      <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        <span className="gradient-text">{title}</span>
      </h1>
      <p className="mt-2 text-slate-400">{subtitle}</p>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10";