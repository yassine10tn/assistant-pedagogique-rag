"use client";

import { useCallback, useEffect, useState } from "react";
import { get } from "../../lib/api";
import { useToast } from "../Toast";
import { Button, Card, inputClass } from "../ui";
import { Pill, dateFmt, td, th } from "./parts";

const tone = (a) => {
  if (/(failed|blocked|locked)/.test(a)) return "red";
  if (/(delete|clear)/.test(a)) return "amber";
  if (/(ok|google|register|create|upload)/.test(a)) return "green";
  return "slate";
};

export default function AuditTab() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try { setEvents((await get("/admin/audit?limit=300")).events); }
    catch (e) { toast.error("Chargement impossible", e.message); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const f = q.trim().toLowerCase();
  const shown = f ? events.filter((e) => `${e.actor} ${e.action} ${e.detail}`.toLowerCase().includes(f)) : events;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input className={`${inputClass} !w-72`} placeholder="Filtrer (utilisateur, action...)" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="secondary" onClick={load}>↻ Actualiser</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400"><tr><th className={th}>Date (UTC)</th><th className={th}>Utilisateur</th><th className={th}>Action</th><th className={th}>Détail</th></tr></thead>
          <tbody className="divide-y divide-white/10 text-slate-300">
            {shown.map((e, i) => (
              <tr key={i}>
                <td className={`${td} whitespace-nowrap`}>{dateFmt(e.ts)}</td>
                <td className={td}>{e.actor}</td>
                <td className={td}><Pill tone={tone(e.action)}>{e.action}</Pill></td>
                <td className={td}>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucun événement.</p>}
      </Card>
    </div>
  );
}