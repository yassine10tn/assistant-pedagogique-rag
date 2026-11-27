"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "../../components/Markdown";
import { useToast } from "../../components/Toast";
import { send, streamChat } from "../../lib/api";

function Ic({ children, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
  );
}
const I = {
  chat: <Ic className="h-8 w-8"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 21 12Z" /><path d="M8.5 11h7M8.5 14h4" /></Ic>,
  send: <Ic><path d="M5 12h14M13 6l6 6-6 6" /></Ic>,
  stop: <Ic><rect x="6" y="6" width="12" height="12" rx="2" /></Ic>,
  copy: <Ic className="h-4 w-4"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Ic>,
  up: <Ic className="h-4 w-4"><path d="M7 11v9H4v-9ZM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7" /></Ic>,
  down: <Ic className="h-4 w-4"><path d="M17 13V4h3v9ZM17 13l-4 8a2 2 0 0 1-2-2v-4H5a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 6.2 4H17" /></Ic>,
  file: <Ic className="h-3.5 w-3.5"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></Ic>,
  bot: <Ic className="h-4 w-4"><rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 8V4M9 13h.01M15 13h.01" /></Ic>,
  plus: <Ic className="h-4 w-4"><path d="M12 5v14M5 12h14" /></Ic>,
};

const SUGGESTIONS = [
  { t: "Comment Word2Vec calcule les scores ?", d: "Fonctionnement du modèle" },
  { t: "Qu'est-ce que le Masked Language Modeling ?", d: "Pré-entraînement de BERT" },
  { t: "Quelle est la différence entre BoW et TF-IDF ?", d: "Vectorisation de texte" },
  { t: "Quelles sont les limites de Word2Vec ?", d: "Points faibles et alternatives" },
];

function uniqueSources(sources = []) {
  const seen = new Set();
  return sources.filter((s) => {
    const k = `${s.source}-${s.page}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default function ChatPage() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function ask(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setMessages((m) => [...m, { role: "user", text: q }, { role: "bot", text: "", sources: [], streaming: true, feedback: 0 }]);
    const patch = (fn) => setMessages((m) => { const c = [...m]; c[c.length - 1] = fn(c[c.length - 1]); return c; });
    try {
      await streamChat(q, ctrl.signal, (ev) => {
        if (ev.type === "sources") patch((b) => ({ ...b, sources: ev.sources }));
        else if (ev.type === "token") patch((b) => ({ ...b, text: b.text + ev.text }));
        else if (ev.type === "done") patch((b) => ({ ...b, id: ev.id }));
        else if (ev.type === "error") patch((b) => ({ ...b, error: ev.message }));
      });
    } catch (e) {
      if (e.name === "AbortError") patch((b) => ({ ...b, stopped: true }));
      else patch((b) => ({ ...b, error: e.message }));
    }
    patch((b) => ({ ...b, streaming: false }));
    setBusy(false);
  }

  async function rate(i, value) {
    const m = messages[i];
    if (!m?.id) return;
    const next = m.feedback === value ? 0 : value;
    setMessages((l) => l.map((x, j) => (j === i ? { ...x, feedback: next } : x)));
    try {
      await send("POST", `/chat/${m.id}/feedback`, { value: next });
      if (next) toast.success("Merci pour votre retour !");
    } catch (e) {
      setMessages((l) => l.map((x, j) => (j === i ? { ...x, feedback: m.feedback } : x)));
      toast.error("Retour non enregistré", e.message);
    }
  }

  async function copy(text) {
    await navigator.clipboard.writeText(text);
    toast.success("Copié", "La réponse est dans le presse-papiers.");
  }

  const count = messages.filter((m) => m.role === "user").length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="btn-glow flex h-11 w-11 items-center justify-center rounded-2xl">{I.chat}</div>
          <div>
            <h1 className="text-xl font-extrabold text-white"><span className="gradient-text">Chat</span></h1>
            <p className="text-xs text-slate-400">Réponses issues de vos documents, avec leurs sources</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">{count} question{count > 1 ? "s" : ""}</span>}
          <button onClick={() => setMessages([])} disabled={busy || count === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-40">
            {I.plus} Nouvelle
          </button>
        </div>
      </div>

      <div className="flex h-[68vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10 backdrop-blur-md">
        <div ref={boxRef} className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="btn-glow mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">{I.chat}</div>
              <h2 className="text-lg font-bold text-white">Que voulez-vous comprendre aujourd'hui ?</h2>
              <p className="mt-1 max-w-md text-sm text-slate-400">Posez une question sur vos cours. Si la réponse n'est pas dans vos documents, je vous le dirai.</p>
              <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s.t} onClick={() => ask(s.t)}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-white/10">
                    <p className="text-sm font-medium text-white">{s.t}</p>
                    <p className="mt-1 text-xs text-slate-400">{s.d}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="btn-glow max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md px-4 py-3 text-sm">{m.text}</div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">{I.bot}</div>
                <div className={`max-w-[88%] rounded-2xl rounded-tl-md px-4 py-3 text-sm ${m.error ? "bg-rose-500/10 text-rose-400" : "bg-white/10 text-slate-100"}`}>
                  {m.streaming && !m.text && !m.error ? (
                    <span className="inline-flex items-center gap-3 text-slate-400"><span className="dots"><span /><span /><span /></span> Recherche dans vos documents...</span>
                  ) : m.error ? (
                    <p>⚠ {m.error}</p>
                  ) : (
                    <>
                      <Markdown>{m.text}</Markdown>
                      {m.streaming && <span className="caret" />}
                    </>
                  )}
                  {m.stopped && <p className="mt-2 text-xs text-slate-500">Génération arrêtée.</p>}

                  {m.sources?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      {uniqueSources(m.sources).map((s, j) => (
                        <span key={j} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-300 ring-1 ring-indigo-400/30">
                          {I.file} {s.source.replace(".pdf", "")} · p.{s.page}
                        </span>
                      ))}
                    </div>
                  )}

                  {!m.streaming && !m.error && m.text && (
                    <div className="mt-2 flex items-center gap-1 text-slate-400">
                      <button onClick={() => copy(m.text)} className="rounded-lg p-1.5 transition hover:bg-white/10 hover:text-white" title="Copier">{I.copy}</button>
                      {m.id && (
                        <>
                          <button onClick={() => rate(i, 1)} className={`rounded-lg p-1.5 transition hover:bg-white/10 hover:text-white ${m.feedback === 1 ? "bg-emerald-500/20 text-emerald-400" : ""}`} title="Réponse utile">{I.up}</button>
                          <button onClick={() => rate(i, -1)} className={`rounded-lg p-1.5 transition hover:bg-white/10 hover:text-white ${m.feedback === -1 ? "bg-rose-500/20 text-rose-400" : ""}`} title="Réponse pas utile">{I.down}</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        <div className="border-t border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 transition focus-within:border-cyan-400/60 focus-within:ring-4 focus-within:ring-cyan-400/10">
            <input
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none"
              placeholder="Posez votre question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              disabled={busy}
            />
            {busy ? (
              <button onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/20">{I.stop} Stop</button>
            ) : (
              <button onClick={() => ask()} disabled={!input.trim()} className="btn-glow inline-flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-40" title="Envoyer">{I.send}</button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-500">Entrée pour envoyer · Les réponses peuvent contenir des erreurs : vérifiez les sources.</p>
        </div>
      </div>
    </div>
  );
}
