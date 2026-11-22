"use client";

import { useState, useRef, useEffect } from "react";
import { post } from "../../lib/api";
import { Badge, Button, PageHeader, Spinner, inputClass } from "../../components/ui";

const SUGGESTIONS = [
  "Comment Word2Vec calcule les scores ?",
  "Qu'est-ce que le Masked Language Modeling ?",
  "Quelle est la différence entre BoW et TF-IDF ?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const data = await post("/chat", { question: q });
      setMessages((m) => [...m, { role: "bot", text: data.answer, sources: data.sources }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "bot", text: "Erreur : " + e.message }]);
    }
    setLoading(false);
  }

  function uniqueSources(sources = []) {
    const seen = new Set();
    return sources.filter((s) => {
      const key = `${s.source}-${s.page}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon="💬" title="Chat" subtitle="Posez une question sur vos cours. Chaque réponse cite ses sources." />

      <div className="min-h-[360px] space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        {messages.length === 0 && (
          <div className="py-10 text-center">
            <p className="mb-4 text-slate-400">Essayez une de ces questions :</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user" ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-100"
              }`}
            >
              {m.text}
              {m.sources?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  {uniqueSources(m.sources).map((s, j) => (
                    <Badge key={j} tone="indigo">
                      📄 {s.source.replace(".pdf", "")}, p.{s.page}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && <Spinner label="Recherche dans vos documents..." />}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className={inputClass}
          placeholder="Posez votre question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={() => send()} disabled={loading || !input.trim()}>
          Envoyer
        </Button>
      </div>
    </div>
  );
}