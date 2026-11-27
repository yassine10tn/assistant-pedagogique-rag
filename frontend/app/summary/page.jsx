"use client";

import { useEffect, useState } from "react";
import Markdown from "../../components/Markdown";
import { useToast } from "../../components/Toast";
import { get, post } from "../../lib/api";

function Ic({ children, className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>;
}
const I = {
  doc: <Ic className="h-7 w-7"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Ic>,
  copy: <Ic className="h-4 w-4"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Ic>,
  down: <Ic className="h-4 w-4"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></Ic>,
  cpu: <Ic className="h-4 w-4"><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" /></Ic>,
  clock: <Ic className="h-4 w-4"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ic>,
};

const LEVELS = [
  { value: "court", label: "Court", d: "3 à 4 phrases" },
  { value: "moyen", label: "Moyen", d: "1 à 2 paragraphes" },
  { value: "detaille", label: "Détaillé", d: "Structuré, avec titres" },
];

const sel = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10";

export default function SummaryPage() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [models, setModels] = useState([]);
  const [filename, setFilename] = useState("");
  const [model, setModel] = useState("");
  const [level, setLevel] = useState("moyen");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    get("/documents").then((d) => { setDocs(d.documents); if (d.documents.length) setFilename(d.documents[0]); }).catch(() => {});
    get("/models").then((d) => { setModels(d.models); setModel(d.default); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  async function run() {
    setLoading(true);
    setRes(null);
    try { setRes(await post("/summary", { filename, level, model })); }
    catch (e) { toast.error("Résumé impossible", e.message); }
    setLoading(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(res.summary);
    toast.success("Copié", "Le résumé est dans le presse-papiers.");
  }

  function download() {
    const blob = new Blob([`# Résumé (${res.level}) : ${res.filename}\n\n${res.summary}\n`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume_${res.level}_${res.filename.replace(/\.pdf$/i, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const options = models.length ? models : model ? [model] : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="btn-glow flex h-12 w-12 items-center justify-center rounded-2xl">{I.doc}</div>
        <div>
          <h1 className="text-2xl font-extrabold text-white"><span className="gradient-text">Résumés</span></h1>
          <p className="text-sm text-slate-400">Choisissez un document, un niveau de détail et un modèle.</p>
        </div>
      </div>

      <div className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Document</label>
            <select className={sel} value={filename} onChange={(e) => setFilename(e.target.value)} disabled={loading}>
              {docs.length === 0 && <option>Aucun document</option>}
              {docs.map((d) => <option className="bg-slate-900" key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Modèle</label>
            <select className={sel} value={model} onChange={(e) => setModel(e.target.value)} disabled={loading || options.length === 0}>
              {options.length === 0 && <option>Ollama indisponible</option>}
              {options.map((m) => <option className="bg-slate-900" key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Niveau de détail</label>
          <div className="grid gap-3 sm:grid-cols-3">
            {LEVELS.map((l) => (
              <button key={l.value} onClick={() => setLevel(l.value)} disabled={loading}
                className={`rounded-2xl border p-4 text-left transition ${level === l.value ? "border-indigo-400/70 bg-indigo-500/15 ring-2 ring-indigo-400/30" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                <p className="font-semibold text-white">{l.label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{l.d}</p>
              </button>
            ))}
          </div>
        </div>

        <button onClick={run} disabled={loading || !filename || docs.length === 0}
          className="btn-glow inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition active:scale-95 disabled:opacity-50">
          {loading ? `Résumé en cours... ${elapsed}s` : "Générer le résumé"}
        </button>
        {loading && <p className="text-xs text-slate-500">Les longs documents sont résumés par blocs (map-reduce) : cela peut prendre une minute ou plus.</p>}
      </div>

      {!res && !loading && (
        <div className="mt-6 rounded-3xl border border-dashed border-white/15 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">{I.doc}</div>
          <p className="text-slate-300">Votre résumé apparaîtra ici.</p>
        </div>
      )}

      {res && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-indigo-300 ring-1 ring-indigo-400/30">Résumé {res.level}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-slate-300">{I.cpu} {res.model}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-slate-300">{I.clock} {res.seconds} s</span>
            </div>
            <div className="flex gap-2">
              <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">{I.copy} Copier</button>
              <button onClick={download} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">{I.down} .md</button>
            </div>
          </div>
          <p className="mb-3 text-sm text-slate-500">{res.filename}</p>
          <Markdown>{res.summary}</Markdown>
        </div>
      )}
    </div>
  );
}
