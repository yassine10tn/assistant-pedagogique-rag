"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "../../components/Markdown";
import { useToast } from "../../components/Toast";
import { Badge, Button, PageHeader, inputClass } from "../../components/ui";
import { send, streamChat } from "../../lib/api";

const SUGGESTIONS = [
  "Comment Word2Vec calcule les scores ?",
  "Qu'est-ce que le Masked Language Modeling ?",
  "Quelle est la différence entre BoW et TF-IDF ?",
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
    if (el) el.scrollTop = el.scrollHeight;
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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon="💬" title="Chat" subtitle="Posez une question sur vos cours. Chaque réponse cite ses sources." />

      {messages.length > 0 && (
        <div className="mb-3">
          <Button variant="ghost" onClick={() => setMessages([])} disabled={busy}>Nouvelle conversation</Button>
        </div>
      )}

      <div ref={boxRef} className="max-h-[60vh] min-h-[360px] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        {messages.length === 0 && (
          <div className="py-10 text-center">
            <p className="mb-4 text-slate-400">Essayez une de ces questions :</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10">{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="btn-glow max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${m.error ? "bg-rose-500/10 text-rose-400" : "bg-white/10 text-slate-100"}`}>
                {m.streaming && !m.text && !m.error ? (
                  <span className="inline-flex items-center gap-3 text-slate-400">
                    <span className="dots"><span /><span /><span /></span> Recherche dans vos documents...
                  </span>
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
                    {uniqueSources(m.sources).map((s, j) => <Badge key={j} tone="indigo">📄 {s.source.replace(".pdf", "")}, p.{s.page}</Badge>)}
                  </div>
                )}

                {!m.streaming && !m.error && m.text && (
                  <div className="mt-3 flex items-center gap-1 text-slate-400">
                    <button onClick={() => copy(m.text)} className="rounded-lg px-2 py-1 hover:bg-white/10" title="Copier">📋</button>
                    {m.id && (
                      <>
                        <button onClick={() => rate(i, 1)} className={`rounded-lg px-2 py-1 hover:bg-white/10 ${m.feedback === 1 ? "bg-emerald-500/20" : ""}`} title="Réponse utile">👍</button>
                        <button onClick={() => rate(i, -1)} className={`rounded-lg px-2 py-1 hover:bg-white/10 ${m.feedback === -1 ? "bg-rose-500/20" : ""}`} title="Réponse pas utile">👎</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input className={inputClass} placeholder="Posez votre question..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} disabled={busy} />
        {busy ? (
          <Button variant="secondary" onClick={() => abortRef.current?.abort()}>■ Stop</Button>
        ) : (
          <Button onClick={() => ask()} disabled={!input.trim()}>Envoyer</Button>
        )}
      </div>
    </div>
  );
}
