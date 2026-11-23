"use client";

import { useEffect, useState } from "react";
import { get } from "../../lib/api";
import { Badge, Card, PageHeader } from "../../components/ui";

export default function AdminPage() {
  const [status, setStatus] = useState("Vérification...");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    get("/admin/ping")
      .then((d) => setStatus(`Accès administrateur confirmé : ${d.admin}`))
      .catch((e) => setStatus("Erreur : " + e.message));
    get("/admin/audit").then((d) => setEvents(d.events)).catch(() => {});
  }, []);

  const tone = (a) => (a.includes("failed") || a.includes("blocked") || a.includes("deleted") ? "slate" : "green");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader icon="🛡️" title="Administration" subtitle="Espace réservé aux administrateurs." />
      <Card className="space-y-2">
        <Badge tone="green">Admin</Badge>
        <p className="text-sm text-slate-300">{status}</p>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold text-white">Journal d'audit (100 derniers événements)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr><th className="py-2 pr-4">Date (UTC)</th><th className="pr-4">Utilisateur</th><th className="pr-4">Action</th><th>Détail</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              {events.map((e, i) => (
                <tr key={i}>
                  <td className="py-2 pr-4 whitespace-nowrap">{e.ts.replace("T", " ").slice(0, 19)}</td>
                  <td className="pr-4">{e.actor}</td>
                  <td className="pr-4"><Badge tone={tone(e.action)}>{e.action}</Badge></td>
                  <td>{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && <p className="text-sm text-slate-500">Aucun événement.</p>}
        </div>
      </Card>
    </div>
  );
}