"use client";

import { useCallback, useEffect, useState } from "react";
import { get, send } from "../../lib/api";
import { useConfirm, useToast } from "../Toast";
import { Button, Card, inputClass } from "../ui";
import { Modal, Pill, dateFmt, td, th } from "./parts";

export default function ChatsTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [chats, setChats] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try { setChats((await get(`/admin/chats?q=${encodeURIComponent(q)}`)).chats); }
    catch (e) { toast.error("Chargement impossible", e.message); }
  }, [q, toast]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  async function remove(c) {
    const ok = await confirm({ title: "Supprimer cette conversation ?", confirmText: "Supprimer" });
    if (!ok) return;
    try { await send("DELETE", `/admin/chats/${c.id}`); toast.success("Entrée supprimée"); load(); }
    catch (e) { toast.error("Suppression impossible", e.message); }
  }

  async function clearAll() {
    const ok = await confirm({ title: "Effacer tout l'historique ?", message: "Toutes les questions et réponses seront supprimées.", confirmText: "Tout effacer" });
    if (!ok) return;
    try { await send("DELETE", "/admin/chats"); toast.success("Historique effacé"); load(); }
    catch (e) { toast.error("Action impossible", e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input className={`${inputClass} !w-72`} placeholder="Rechercher (question ou utilisateur)..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="secondary" onClick={clearAll} disabled={!chats.length}>🗑️ Tout effacer</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400"><tr><th className={th}>Date (UTC)</th><th className={th}>Utilisateur</th><th className={th}>Question</th><th className={th}>Résultat</th><th className={th}>Avis</th><th className={th}>Score</th><th className={th}>Temps</th><th className={th}></th></tr></thead>
          <tbody className="divide-y divide-white/10 text-slate-300">
            {chats.map((c) => (
              <tr key={c.id}>
                <td className={`${td} whitespace-nowrap`}>{dateFmt(c.ts)}</td>
                <td className={td}>{c.user}</td>
                <td className={`${td} max-w-xs truncate`} title={c.question}>{c.question}</td>
                <td className={td}><Pill tone={c.refused ? "amber" : "green"}>{c.refused ? "Refusée" : "Répondue"}</Pill></td>
                <td className={td}>{c.feedback === 1 ? "👍" : c.feedback === -1 ? "👎" : "-"}</td>
                <td className={td}>{c.top_score ? c.top_score.toFixed(3) : "-"}</td>
                <td className={td}>{(c.latency_ms / 1000).toFixed(1)} s</td>
                <td className={td}>
                  <div className="flex gap-2">
                    <button onClick={() => setOpen(c)} className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/10" title="Voir">👁️</button>
                    <button onClick={() => remove(c)} className="rounded-lg border border-white/10 px-2 py-1 hover:bg-rose-500/20" title="Supprimer">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {chats.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucune conversation enregistrée.</p>}
      </Card>

      {open && (
        <Modal wide title="Conversation" onClose={() => setOpen(null)}>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-slate-500">{open.user} · {dateFmt(open.ts)}</p>
            <div><p className="mb-1 font-semibold text-white">Question</p><p className="rounded-xl bg-white/5 p-3 text-slate-200">{open.question}</p></div>
            <div><p className="mb-1 font-semibold text-white">Réponse</p><p className="whitespace-pre-wrap rounded-xl bg-white/5 p-3 text-slate-200">{open.answer}</p></div>
            {open.sources.length > 0 && (
              <div><p className="mb-1 font-semibold text-white">Sources</p>
                <div className="flex flex-wrap gap-2">{open.sources.map((s, i) => <Pill key={i} tone="indigo">📄 {s.source.replace(".pdf", "")}, p.{s.page} ({s.score})</Pill>)}</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}