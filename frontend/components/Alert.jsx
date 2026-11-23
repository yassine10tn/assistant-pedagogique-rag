const TONES = {
  info: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-400/40 bg-amber-400/10 text-amber-500",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-400",
};
const ICONS = { info: "ℹ️", success: "✅", warning: "⚠️", danger: "⛔" };

export default function Alert({ tone = "info", title, icon, children }) {
  return (
    <div role="alert" className={`animate-up flex gap-3 rounded-xl border p-3.5 text-sm ${TONES[tone]}`}>
      <span className="text-lg leading-none">{icon || ICONS[tone]}</span>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="mt-0.5 opacity-90">{children}</div>
      </div>
    </div>
  );
}