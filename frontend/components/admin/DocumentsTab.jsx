"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { get, send, uploadPdf } from "../../lib/api";
import { useConfirm, useToast } from "../Toast";
import { Button, Card, Spinner } from "../ui";
import { dateFmt, td, th } from "./parts";

const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(2)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);

export default function DocumentsTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState("");
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    try { setDocs((await get("/admin/documents")).documents); }
    catch (e) { toast.error("Chargement impossible", e.message); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  async function upload(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) return toast.warning("Format non supporté", "Seuls les PDF sont acceptés.");
    setBusy("Indexation du document...");
    try {
      const r = await uploadPdf(file);
      toast.success("Document indexé", `${r.filename} : ${r.chunks} chunks au total.`);
      load();
    } catch (e) { toast.error("Échec de l'upload", e.message); }
    setBusy("");
  }

  async function reindex() {
    setBusy("Réindexation...");
    try {
      const r = await send("POST", "/admin/reindex");
      toast.success("Index reconstruit", `${r.chunks} chunks.`);
    } catch (e) { toast.error("Réindexation impossible", e.message); }
    setBusy("");
  }

  async function remove(d) {
    const ok = await confirm({
      title: `Supprimer « ${d.name} » ?`,
      message: "Le fichier sera supprimé et l'index reconstruit.",
      confirmText: "Supprimer",
    });
    if (!ok) return;
    setBusy("Suppression et réindexation...");
    try {
      await send("DELETE", `/admin/documents/${encodeURIComponent(d.name)}`);
      toast.success("Document supprimé", d.name);
      load();
    } catch (e) { toast.error("Suppression impossible", e.message); }
    setBusy("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { upload(e.target.files[0]); e.target.value = ""; }} />
        <Button onClick={() => inputRef.current?.click()} disabled={!!busy}>⬆ Ajouter un PDF</Button>
        <Button variant="secondary" onClick={reindex} disabled={!!busy}>↻ Réindexer</Button>
        {busy && <Spinner label={busy} />}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400"><tr><th className={th}>Fichier</th><th className={th}>Taille</th><th className={th}>Modifié</th><th className={th}>Actions</th></tr></thead>
          <tbody className="divide-y divide-white/10 text-slate-300">
            {docs.map((d) => (
              <tr key={d.name}>
                <td className={td}>📄 {d.name}</td>
                <td className={td}>{size(d.size)}</td>
                <td className={td}>{dateFmt(d.modified)}</td>
                <td className={td}>
                  <button disabled={!!busy} onClick={() => remove(d)} className="rounded-lg border border-white/10 px-2 py-1 hover:bg-rose-500/20 disabled:opacity-40" title="Supprimer">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {docs.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucun document.</p>}
      </Card>
    </div>
  );
}