"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "../../components/Toast";
import { get, post } from "../../lib/api";

function Ic({ children, className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>;
}
const I = {
  brain: <Ic className="h-7 w-7"><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 5 1V4a3 3 0 0 0-2 0ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-5 1V4a3 3 0 0 1 2 0Z" /></Ic>,
  check: <Ic className="h-4 w-4"><path d="m5 12 5 5 9-10" /></Ic>,
  x: <Ic className="h-4 w-4"><path d="M6 6l12 12M18 6 6 18" /></Ic>,
  cpu: <Ic className="h-4 w-4"><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" /></Ic>,
  clock: <Ic className="h-4 w-4"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ic>,
  bulb: <Ic className="h-4 w-4"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></Ic>,
  redo: <Ic className="h-4 w-4"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></Ic>,
};

const DIFFS = [
  { v: "facile", label: "Facile", d: "Définitions et bases" },
  { v: "moyen", label: "Moyen", d: "Compréhension" },
  { v: "difficile", label: "Difficile", d: "Raisonnement" },
];
const COUNTS = [3, 5, 8, 10];
const TOPICS = ["Word2Vec", "BERT", "TF-IDF", "Vectorisation"];
const sel = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10";

function ScoreRing({ score, total }) {
  const pct = total ? score / total : 0;
  const R = 54, C = 2 * Math.PI * R;
  const [off, setOff] = useState(C);
  useEffect(() => { const id = setTimeout(() => setOff(C * (1 - pct)), 100); return () => clearTimeout(id); }, [pct, C]);
  const color = pct >= 0.8 ? "#34d399" : pct >= 0.5 ? "#fbbf24" : "#fb7185";
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(127,127,127,.2)" strokeWidth="10" />
        <circle cx="64" cy="64" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-white">{score}/{total}</span>
        <span className="text-xs text-slate-400">{Math.round(pct * 100)} %</span>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const toast = useToast();
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [topic, setTopic] = useState("");
  const [n, setN] = useState(5);
  const [difficulty, setDifficulty] = useState("moyen");
  const [phase, setPhase] = useState("setup"); // setup | loading | play | result
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [key, setKey] = useState(0);
  const cardRef = useRef(null);

  useEffect(() => { get("/models").then((d) => { setModels(d.models); setModel(d.default); }).catch(() => {}); }, []);

  useEffect(() => {
    if (phase !== "loading") return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function generate(t = topic) {
    if (!t.trim()) return;
    setPhase("loading");
    try {
      const d = await post("/quiz", { topic: t, n, difficulty, model });
      setData(d); setAnswers([]); setIdx(0); setKey((k) => k + 1); setPhase("play");
    } catch (e) {
      toast.error("Génération impossible", e.message);
      setPhase("setup");
    }
  }

  const q = data?.questions?.[idx];
  const chosen = answers[idx];
  const answered = chosen !== undefined;
  const score = data ? data.questions.filter((x, i) => answers[i] === x.answer).length : 0;

  function choose(j) {
    if (answered) return;
    setAnswers((a) => { const c = [...a]; c[idx] = j; return c; });
  }
  function next() {
    if (idx + 1 >= data.questions.length) setPhase("result");
    else { setIdx(idx + 1); setKey((k) => k + 1); }
  }

  useEffect(() => {
    if (phase !== "play") return;
    const h = (e) => {
      const m = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
      if (m !== undefined && q && m < q.choices.length) choose(m);
      if (e.key === "Enter" && answered) next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const options = models.length ? models : model ? [model] : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="btn-glow flex h-12 w-12 items-center justify-center rounded-2xl">{I.brain}</div>
        <div>
          <h1 className="text-2xl font-extrabold text-white"><span className="gradient-text">Quiz</span></h1>
          <p className="text-sm text-slate-400">Générez des QCM à partir de vos cours et testez-vous.</p>
        </div>
      </div>

      {/* SETUP */}
      {(phase === "setup" || phase === "loading") && (
        <div className="animate-up space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Sujet</label>
            <input className={sel} placeholder="Ex : Word2Vec, BERT, TF-IDF" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} disabled={phase === "loading"} />
            <div className="mt-2 flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <button key={t} onClick={() => setTopic(t)} disabled={phase === "loading"} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10">{t}</button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Nombre de questions</label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5">
                  <button type="button" onClick={() => setN((v) => Math.max(1, v - 1))} disabled={phase === "loading"} className="px-3 py-2 text-lg text-slate-300 transition hover:text-white">−</button>
                  <input type="number" min="1" max="20" value={n}
                    onChange={(e) => setN(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    disabled={phase === "loading"}
                    className="w-14 bg-transparent py-2 text-center text-sm font-semibold text-slate-100 outline-none" />
                  <button type="button" onClick={() => setN((v) => Math.min(20, v + 1))} disabled={phase === "loading"} className="px-3 py-2 text-lg text-slate-300 transition hover:text-white">+</button>
                </div>
                <div className="flex gap-1.5">
                  {COUNTS.map((c) => (
                    <button key={c} type="button" onClick={() => setN(c)} disabled={phase === "loading"}
                      className={`rounded-full px-3 py-1 text-xs transition ${n === c ? "btn-glow" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Modèle</label>
              <select className={sel} value={model} onChange={(e) => setModel(e.target.value)} disabled={phase === "loading" || options.length === 0}>
                {options.length === 0 && <option>Ollama indisponible</option>}
                {options.map((m) => <option className="bg-slate-900" key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Difficulté</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {DIFFS.map((d) => (
                <button key={d.v} onClick={() => setDifficulty(d.v)} disabled={phase === "loading"}
                  className={`rounded-2xl border p-4 text-left transition ${difficulty === d.v ? "border-indigo-400/70 bg-indigo-500/15 ring-2 ring-indigo-400/30" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <p className="font-semibold text-white">{d.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{d.d}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => generate()} disabled={phase === "loading" || !topic.trim()} className="btn-glow inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition active:scale-95 disabled:opacity-50">
            {phase === "loading" ? `Génération en cours... ${elapsed}s` : "Générer le quiz"}
          </button>

          {phase === "loading" && (
            <div className="space-y-3 pt-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/10" style={{ animationDelay: `${i * 150}ms` }} />)}
              <p className="text-xs text-slate-500">Le modèle lit vos documents et rédige les questions...</p>
            </div>
          )}
        </div>
      )}

      {/* PLAY */}
      {phase === "play" && q && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-slate-300">{I.cpu} {data.model}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-slate-300">{I.clock} généré en {data.seconds} s</span>
            </div>
            <span className="text-slate-400">Question {idx + 1} / {data.questions.length}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500" style={{ width: `${((idx + (answered ? 1 : 0)) / data.questions.length) * 100}%` }} />
          </div>

          <div key={key} ref={cardRef} className="animate-up rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
            <p className="text-lg font-semibold text-white">{q.question}</p>
            <div className="mt-5 space-y-3">
              {q.choices.map((c, j) => {
                const isRight = j === q.answer;
                const isMine = j === chosen;
                let cls = "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-white/10";
                if (answered && isRight) cls = "border-emerald-400/70 bg-emerald-500/15";
                else if (answered && isMine) cls = "border-rose-400/70 bg-rose-500/15";
                else if (answered) cls = "border-white/10 bg-white/5 opacity-50";
                return (
                  <button key={j} onClick={() => choose(j)} disabled={answered}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm text-slate-100 transition ${cls}`}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-slate-300">{"ABCD"[j]}</span>
                    <span className="flex-1">{c}</span>
                    {answered && isRight && <span className="text-emerald-400">{I.check}</span>}
                    {answered && isMine && !isRight && <span className="text-rose-400">{I.x}</span>}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="animate-up mt-5 space-y-3">
                <div className={`rounded-2xl p-4 text-sm ${chosen === q.answer ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                  <p className="font-semibold">{chosen === q.answer ? "Bonne réponse !" : `Mauvaise réponse. La bonne réponse était ${"ABCD"[q.answer]}.`}</p>
                  {q.explanation && <p className="mt-1 flex gap-2 text-slate-300"><span className="mt-0.5 shrink-0">{I.bulb}</span>{q.explanation}</p>}
                </div>
                <div className="flex justify-end">
                  <button onClick={next} className="btn-glow rounded-xl px-6 py-2.5 text-sm font-semibold transition active:scale-95">{idx + 1 >= data.questions.length ? "Voir le résultat" : "Suivant →"}</button>
                </div>
              </div>
            )}
            {!answered && <p className="mt-4 text-center text-[11px] text-slate-500">Astuce : touches 1-4 ou A-D pour répondre, Entrée pour continuer.</p>}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === "result" && data && (
        <div className="animate-up space-y-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-md">
            <ScoreRing score={score} total={data.questions.length} />
            <h2 className="mt-4 text-xl font-bold text-white">
              {score / data.questions.length >= 0.8 ? "Excellent travail !" : score / data.questions.length >= 0.5 ? "Pas mal, continuez !" : "À revoir, vous progresserez."}
            </h2>
            <p className="mt-1 text-sm text-slate-400">Sujet : {data.topic} · {data.model}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => { setAnswers([]); setIdx(0); setKey((k) => k + 1); setPhase("play"); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">{I.redo} Rejouer</button>
              <button onClick={() => generate(data.topic)} className="btn-glow rounded-xl px-5 py-2.5 text-sm font-semibold transition active:scale-95">Nouveau quiz sur ce sujet</button>
              <button onClick={() => setPhase("setup")} className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">Changer de sujet</button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
            <h3 className="mb-4 font-semibold text-white">Récapitulatif</h3>
            <ul className="space-y-3">
              {data.questions.map((x, i) => {
                const ok = answers[i] === x.answer;
                return (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{ok ? I.check : I.x}</span>
                    <div>
                      <p className="text-slate-200">{x.question}</p>
                      {!ok && <p className="mt-0.5 text-xs text-slate-400">Bonne réponse : {"ABCD"[x.answer]}. {x.choices[x.answer]}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
