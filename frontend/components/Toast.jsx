"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const Ctx = createContext(null);

const TONES = {
  success: { icon: "✓", chip: "bg-emerald-500/20 text-emerald-300", border: "border-emerald-400/40", bar: "bg-emerald-400" },
  error: { icon: "✕", chip: "bg-rose-500/20 text-rose-400", border: "border-rose-500/40", bar: "bg-rose-500" },
  warning: { icon: "!", chip: "bg-amber-400/20 text-amber-500", border: "border-amber-400/40", bar: "bg-amber-400" },
  info: { icon: "i", chip: "bg-cyan-400/20 text-cyan-300", border: "border-cyan-400/40", bar: "bg-cyan-400" },
};

function ConfirmDialog({ dialog, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const danger = dialog.tone !== "primary";
  return (
    <div
      className="modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => onClose(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="animate-up menu-panel w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${danger ? "bg-rose-500/15" : "bg-indigo-500/15"}`}>
          {dialog.icon || (danger ? "⚠️" : "❔")}
        </div>
        <h3 className="text-lg font-bold text-white">{dialog.title}</h3>
        {dialog.message && <p className="mt-1 text-sm text-slate-400">{dialog.message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            onClick={() => onClose(false)}
          >
            {dialog.cancelText || "Annuler"}
          </button>
          <button
            autoFocus
            style={{ color: "#fff" }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 ${danger ? "bg-rose-600 hover:bg-rose-500" : "btn-glow"}`}
            onClick={() => onClose(true)}
          >
            {dialog.confirmText || "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);
  const resolver = useRef(null);

  const dismiss = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, title, message, duration = 5000) => {
      const id = ++idRef.current;
      setItems((l) => {
        if (l.some((t) => t.type === type && t.title === title && t.message === message)) return l;
        return [...l.slice(-3), { id, type, title, message, duration }];
      });
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (t, m, d) => push("success", t, m, d),
      error: (t, m, d) => push("error", t, m, d ?? 7000),
      warning: (t, m, d) => push("warning", t, m, d ?? 6000),
      info: (t, m, d) => push("info", t, m, d),
      dismiss,
    }),
    [push, dismiss]
  );

  const confirm = useCallback(
    (opts) => new Promise((resolve) => { resolver.current = resolve; setDialog(opts); }),
    []
  );
  const closeDialog = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  }, []);

  // Toasts émis depuis lib/api.js (erreurs réseau, session expirée...)
  useEffect(() => {
    const h = (e) => push(e.detail.type || "error", e.detail.title, e.detail.message);
    window.addEventListener("app:toast", h);
    return () => window.removeEventListener("app:toast", h);
  }, [push]);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 top-20 z-[100] flex w-[min(92vw,380px)] flex-col gap-3">
        {items.map((t) => {
          const tone = TONES[t.type];
          return (
            <div key={t.id} role="status" className={`toast pointer-events-auto relative overflow-hidden rounded-2xl border ${tone.border} p-4 pr-10 shadow-2xl shadow-black/30`}>
              <div className="flex gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tone.chip}`}>{tone.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  {t.message && <p className="mt-0.5 text-sm text-slate-400">{t.message}</p>}
                </div>
              </div>
              <button onClick={() => dismiss(t.id)} aria-label="Fermer" className="absolute right-3 top-3 text-slate-500 hover:text-white">✕</button>
              {t.duration > 0 && (
                <span className={`toast-bar absolute bottom-0 left-0 h-0.5 w-full ${tone.bar}`} style={{ animationDuration: `${t.duration}ms` }} />
              )}
            </div>
          );
        })}
      </div>
      {dialog && <ConfirmDialog dialog={dialog} onClose={closeDialog} />}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx).toast;
export const useConfirm = () => useContext(Ctx).confirm;