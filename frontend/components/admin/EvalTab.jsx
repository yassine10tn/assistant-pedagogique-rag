"use client";
import ExportButton from "./ExportButton";
import { useCallback, useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import { useToast } from "../Toast";
import { Button, Card, inputClass } from "../ui";
import { Pill, StatCard, dateFmt, td, th } from "./parts";

const pct = (v) => (v === null || v === undefined ? "-" : `${v}%`);
const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export default function EvalTab() {
  const toast = useToast();
  const [inQ, setInQ] = useState("");
  const [outQ, setOutQ] = useState("");
  const [full, setFull] = useState(false);
  const [job, setJob] = useState(null);
  const [runs, setRuns] = useState([]);
  const [run, setRun] = useState(null);

  const loadRun = useCallback(async (id) => {
    try { setRun((await get(`/admin/eval/runs/${id}`)).run); }
    catch (e) { toast.error("Chargement impossible", e.message); }
  }, [toast]);

  const loadRuns = useCallback(async () => {
    const d = await get("/admin/eval/runs");
    setRuns(d.runs);
    return d.runs;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [def, st] = await Promise.all([get("/admin/eval/defaults"), get("/admin/eval/status")]);
        setInQ(def.in.join("\n"));
        setOutQ(def.out.join("\n"));
        setJob(st);
        const rs = await loadRuns();
        if (rs.length) loadRun(rs[0].id);
      } catch (e) { toast.error("Chargement impossible", e.message); }
    })();
  }, []);

  useEffect(() => {
    if (!job?.running) return;
    const id = setInterval(async () => {
      try {
        const st = await get("/admin/eval/status");
        setJob(st);
        if (!st.running) {
          clearInterval(id);
          if (st.error) toast.error("Évaluation échouée", st.error);
          else {
            toast.success("Évaluation terminée", "Résultats affichés ci-dessous.");
            await loadRuns();
            if (st.run_id) loadRun(st.run_id);
          }
        }
      } catch {}
    }, 1500);
    return () => clearInterval(id);
  }, [job?.running]);

  async function start() {
    try {
      await post("/admin/eval/run", { in_questions: lines(inQ), out_questions: lines(outQ), full });
      setJob({ running: true, done: 0, total: lines(inQ).length + lines(outQ).length });
    } catch (e) { toast.error("Lancement impossible", e.message); }
  }

  const m = run?.metrics;
  const running = job?.running;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <h3 className="font-semibold text-white">Lancer une évaluation</h3>
          <p className="mt-1 text-sm text-slate-400">
            Une question « dans le cours » doit être répondue, une question « hors du cours » doit être refusée.
            Adaptez les questions à vos documents (une par ligne).
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Questions DANS le cours</label>
            <textarea className={`${inputClass} h-52 font-mono !text-xs`} value={inQ} onChange={(e) => setInQ(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Questions HORS du cours</label>
            <textarea className={`${inputClass} h-52 font-mono !text-xs`} value={outQ} onChange={(e) => setOutQ(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} />
          Mode complet (appelle Llama : mesure aussi le refus du modèle et les citations, plus lent). Décoché = retrieval seul, quelques secondes.
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={running}>{running ? "Évaluation en cours..." : "▶ Lancer l'évaluation"}</Button>
          {running && (
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all" style={{ width: `${job.total ? (job.done / job.total) * 100 : 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{job.done} / {job.total} questions</p>
            </div>
          )}
        </div>
      </Card>

      {runs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400">Historique :</span>
          {runs.map((r) => (
            <button key={r.id} onClick={() => loadRun(r.id)} className={`rounded-full px-3 py-1 text-xs transition ${run?.id === r.id ? "btn-glow" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>
              #{r.id} · {r.model} · {r.mode} · seuil {r.min_score} · {pct(r.accuracy_pct)}
            </button>
          ))}
        </div>
      )}

      {run && m && (
        <>
<div className="flex flex-wrap items-center justify-between gap-3">
  <p className="text-sm text-slate-400">Évaluation #{run.id} · {dateFmt(run.ts)} UTC · modèle {run.model} · seuil {run.min_score} · mode {run.mode}</p>
  <ExportButton kind="eval" query={`?run_id=${run.id}`} filename={`evaluation_${run.id}.csv`} />
</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon="🎯" label="Précision globale" value={pct(m.accuracy_pct)} hint={`${m.n_in + m.n_out} questions`} />
            <StatCard icon="✅" label="Réponses dans le cours" value={pct(m.in_answered_pct)} hint={`${m.n_in} questions`} />
            <StatCard icon="🚫" label="Refus hors du cours" value={pct(m.out_refused_pct)} hint={`${m.n_out} questions`} />
            <StatCard icon="↔" label="Écart de scores" value={m.gap === null ? "-" : m.gap} hint="min dans − max hors cours" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon="📈" label="Score moyen (dans)" value={m.avg_top_in ?? "-"} />
            <StatCard icon="📉" label="Score moyen (hors)" value={m.avg_top_out ?? "-"} />
            <StatCard icon="📎" label="Réponses citant une source" value={pct(m.citation_pct)} hint={run.mode === "complet" ? "" : "mode complet requis"} />
            <StatCard icon="⏱" label="Temps moyen" value={`${(m.avg_latency_ms / 1000).toFixed(1)} s`} />
          </div>

          <Card className="overflow-x-auto">
            <h3 className="mb-1 font-semibold text-white">Choix du seuil (scores de retrieval)</h3>
            <p className="mb-3 text-xs text-slate-500">Pour chaque seuil : % de questions du cours conservées, % de questions hors cours bloquées, précision. Si l'écart est négatif, le seuil seul ne suffit pas : le prompt strict du LLM complète.</p>
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400"><tr><th className={th}>Seuil</th><th className={th}>Dans le cours conservées</th><th className={th}>Hors cours bloquées</th><th className={th}>Précision</th></tr></thead>
              <tbody className="divide-y divide-white/10 text-slate-300">
                {m.sweep.map((r) => (
                  <tr key={r.threshold} className={r.threshold === run.min_score ? "bg-indigo-500/10" : ""}>
                    <td className={td}>{r.threshold.toFixed(2)} {r.threshold === run.min_score && <Pill tone="indigo">actuel</Pill>}</td>
                    <td className={td}>{pct(r.in_pass_pct)}</td>
                    <td className={td}>{pct(r.out_block_pct)}</td>
                    <td className={td}>{pct(r.accuracy_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-x-auto">
            <h3 className="mb-3 font-semibold text-white">Détail des questions</h3>
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400"><tr><th className={th}>Type</th><th className={th}>Question</th><th className={th}>Score max</th><th className={th}>Décision</th><th className={th}>Verdict</th><th className={th}>Temps</th></tr></thead>
              <tbody className="divide-y divide-white/10 text-slate-300">
                {run.results.map((r, i) => (
                  <tr key={i}>
                    <td className={td}><Pill tone={r.kind === "in" ? "indigo" : "slate"}>{r.kind === "in" ? "dans" : "hors"}</Pill></td>
                    <td className={`${td} max-w-sm`} title={r.answer}>{r.question}</td>
                    <td className={td}>{r.top_score.toFixed(3)}</td>
                    <td className={td}>{r.refused ? "Refusée" : "Répondue"}</td>
                    <td className={td}><Pill tone={r.correct ? "green" : "red"}>{r.correct ? "Correct" : "Erreur"}</Pill></td>
                    <td className={td}>{(r.latency_ms / 1000).toFixed(1)} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}