"use client";

import { useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import { Button, Card, PageHeader, Spinner, inputClass } from "../../components/ui";

const LEVELS = [
  { value: "court", label: "Court" },
  { value: "moyen", label: "Moyen" },
  { value: "detaille", label: "Détaillé" },
];

export default function SummaryPage() {
  const [docs, setDocs] = useState([]);
  const [filename, setFilename] = useState("");
  const [level, setLevel] = useState("moyen");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    get("/documents")
      .then((d) => {
        setDocs(d.documents);
        if (d.documents.length) setFilename(d.documents[0]);
      })
      .catch(() => setDocs([]));
  }, []);

  async function run() {
    setLoading(true);
    setResult("");
    try {
      const data = await post("/summary", { filename, level });
      setResult(data.summary);
    } catch (e) {
      setResult("Erreur : " + e.message);
    }
    setLoading(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon="📝" title="Résumés" subtitle="Choisissez un document et un niveau de détail." />

      <Card className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Document</label>
          <select className={inputClass} value={filename} onChange={(e) => setFilename(e.target.value)}>
            {docs.length === 0 && <option>Aucun document</option>}
            {docs.map((d) => (
              <option key={d} className="bg-slate-900">{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Niveau</label>
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`rounded-lg px-4 py-1.5 text-sm transition ${
                  level === l.value ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={run} disabled={loading || !filename}>
          Générer le résumé
        </Button>
        {loading && <div><Spinner label="Résumé en cours, cela peut prendre 1 minute..." /></div>}
      </Card>

      {result && (
        <Card className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Résumé {level}</h2>
            <Button variant="secondary" onClick={copy}>{copied ? "Copié ✓" : "Copier"}</Button>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{result}</div>
        </Card>
      )}
    </div>
  );
}