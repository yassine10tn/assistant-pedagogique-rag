"use client";

import { useEffect, useRef, useState } from "react";
import { get, uploadPdf } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { Card, PageHeader, Spinner } from "../../components/ui";

export default function DocumentsPage() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  async function refresh() {
    try { setDocs((await get("/documents")).documents); } catch { setDocs([]); }
  }
  useEffect(() => { refresh(); }, []);

  async function handle(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.warning("Format non supporté", "Seuls les fichiers PDF sont acceptés.");
      return;
    }
    setLoading(true);
    toast.info("Indexation en cours", "Le document est découpé et vectorisé, cela peut prendre un moment.");
    try {
      const data = await uploadPdf(file);
      toast.success("Document indexé", `${data.filename} : ${data.chunks} chunks au total.`);
      refresh();
    } catch (e) {
      toast.error("Échec de l'upload", e.message);
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon="📚" title="Documents" subtitle="Téléversez vos cours en PDF. Ils sont indexés automatiquement." />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${drag ? "border-indigo-400 bg-indigo-500/10" : "border-white/15 bg-white/5 hover:bg-white/10"}`}
      >
        <div className="text-4xl">📄</div>
        <p className="mt-2 text-slate-200">Glissez un PDF ici ou cliquez pour choisir</p>
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handle(e.target.files[0])} />
      </div>

      {loading && <div className="mt-4"><Spinner label="Envoi et indexation en cours..." /></div>}

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold text-white">Documents disponibles ({docs.length})</h2>
        {docs.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun document pour le moment.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {docs.map((d) => (
              <li key={d} className="flex items-center gap-2 py-2 text-sm text-slate-300"><span>📄</span> {d}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}