"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../../components/Toast";
import { get, uploadPdf } from "../../lib/api";

function Ic({ children, className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>;
}
const I = {
  folder: <Ic className="h-7 w-7"><path d="M4 5a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /></Ic>,
  upload: <Ic className="h-8 w-8"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></Ic>,
  file: <Ic className="h-5 w-5"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></Ic>,
  search: <Ic className="h-4 w-4"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Ic>,
  summary: <Ic className="h-4 w-4"><path d="M9 13h6M9 17h4M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /></Ic>,
  chat: <Ic className="h-4 w-4"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 21 12Z" /></Ic>,
};

const clean = (n) => n.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim();

export default function DocumentsPage() {
  const toast = useToast();
  const [docs, setDocs] = useState(null);
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState(false);
  const [queue, setQueue] = useState([]); // {name, status}
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    try { setDocs((await get("/documents")).documents); } catch { setDocs([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const pdfs = files.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length < files.length) toast.warning("Format non supporté", "Seuls les fichiers PDF sont acceptés.");
    if (!pdfs.length) return;

    setQueue(pdfs.map((f) => ({ name: f.name, status: "wait" })));
    let ok = 0;
    for (let i = 0; i < pdfs.length; i++) {
      setQueue((qq) => qq.map((x, j) => (j === i ? { ...x, status: "run" } : x)));
      try {
        await uploadPdf(pdfs[i]);
        ok++;
        setQueue((qq) => qq.map((x, j) => (j === i ? { ...x, status: "ok" } : x)));
      } catch (e) {
        setQueue((qq) => qq.map((x, j) => (j === i ? { ...x, status: "err", msg: e.message } : x)));
        toast.error(`Échec : ${pdfs[i].name}`, e.message);
      }
    }
    if (ok) toast.success("Documents indexés", `${ok} fichier${ok > 1 ? "s" : ""} ajouté${ok > 1 ? "s" : ""}.`);
    await load();
    setTimeout(() => setQueue([]), 2500);
  }

  const busy = queue.some((x) => x.status === "wait" || x.status === "run");
  const done = queue.filter((x) => x.status === "ok" || x.status === "err").length;
  const shown = (docs || []).filter((d) => d.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="btn-glow flex h-12 w-12 items-center justify-center rounded-2xl">{I.folder}</div>
        <div>
          <h1 className="text-2xl font-extrabold text-white"><span className="gradient-text">Documents</span></h1>
          <p className="text-sm text-slate-400">Ajoutez vos cours en PDF : ils sont découpés et indexés automatiquement.</p>
        </div>
      </div>

      <div
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) handleFiles(e.dataTransfer.files); }}
        className={`group cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition duration-300 ${drag ? "scale-[1.01] border-cyan-400 bg-cyan-400/10" : "border-white/15 bg-white/[0.04] hover:border-indigo-400/60 hover:bg-white/[0.07]"} ${busy ? "pointer-events-none opacity-80" : ""}`}
      >
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300 transition ${drag ? "-translate-y-1" : "group-hover:-translate-y-1"}`}>{I.upload}</div>
        <p className="mt-4 text-base font-semibold text-white">{drag ? "Relâchez pour ajouter" : "Glissez vos PDF ici"}</p>
        <p className="mt-1 text-sm text-slate-400">ou <span className="text-cyan-300 underline">parcourez vos fichiers</span> · plusieurs PDF possibles · 25 Mo max</p>
        <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {queue.length > 0 && (
        <div className="animate-up mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-white">{busy ? "Indexation en cours..." : "Terminé"}</span>
            <span className="text-slate-400">{done} / {queue.length}</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500" style={{ width: `${(done / queue.length) * 100}%` }} />
          </div>
          <ul className="space-y-1.5 text-sm">
            {queue.map((x, i) => (
              <li key={i} className="flex items-center gap-2 text-slate-300">
                <span className="w-5 text-center">
                  {x.status === "ok" ? <span className="text-emerald-400">✓</span> : x.status === "err" ? <span className="text-rose-400">✕</span> : x.status === "run" ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-cyan-400" /> : <span className="text-slate-500">·</span>}
                </span>
                <span className="truncate">{x.name}</span>
                {x.msg && <span className="text-xs text-rose-400">{x.msg}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Vos documents {docs && <span className="ml-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300">{docs.length}</span>}</h2>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-400 focus-within:border-cyan-400/60">
          {I.search}
          <input className="w-56 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none" placeholder="Rechercher un document..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {docs === null ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/10" style={{ animationDelay: `${i * 120}ms` }} />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-white/15 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">{I.file}</div>
          <p className="text-slate-300">{docs.length === 0 ? "Aucun document pour le moment." : "Aucun résultat pour cette recherche."}</p>
          {docs.length === 0 && <p className="mt-1 text-sm text-slate-500">Ajoutez un premier PDF ci-dessus pour commencer.</p>}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {shown.map((d, i) => (
            <div key={d} className="animate-up group rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/10" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">{I.file}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white" title={d}>{clean(d)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">PDF · indexé</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link href="/summary" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10">{I.summary} Résumer</Link>
                <Link href="/chat" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10">{I.chat} Poser une question</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
