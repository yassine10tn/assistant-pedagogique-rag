"use client";

import { useEffect, useState } from "react";
import { get } from "../../lib/api";
import { useToast } from "../Toast";
import { Button, Card, Spinner } from "../ui";
import { BarChart, Donut, StatCard } from "./parts";

export default function Overview() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { setS(await get("/admin/stats")); } catch (e) { toast.error("Chargement impossible", e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (!s) return <Spinner label="Chargement des statistiques..." />;

  const { users, chats } = s;
  const refusal = chats.total ? Math.round((chats.refused / chats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={load} disabled={loading}>{loading ? "Actualisation..." : "↻ Actualiser"}</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="👥" label="Utilisateurs" value={users.total} hint={`${users.active} actifs · ${users.admins} admin · ${users.locked} verrouillé(s)`} />
        <StatCard icon="📚" label="Documents" value={s.documents} hint={`${s.chunks} chunks indexés`} />
        <StatCard icon="💬" label="Questions posées" value={chats.total} hint={`${chats.today} aujourd'hui`} />
        <StatCard icon="🚫" label="Taux de refus" value={`${refusal}%`} hint={`${chats.refused} réponses « je ne sais pas »`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-white">Questions par jour (7 jours, UTC)</h3>
          <BarChart data={chats.per_day} />
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold text-white">Inscriptions par jour (7 jours, UTC)</h3>
          <BarChart data={users.signups} />
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold text-white">Méthode de connexion</h3>
          <Donut parts={[{ label: "Email", value: users.email, color: "#6366f1" }, { label: "Google", value: users.google, color: "#22d3ee" }]} />
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold text-white">Performance</h3>
          <p className="text-4xl font-extrabold text-white">{(chats.avg_latency_ms / 1000).toFixed(1)} s</p>
          <p className="mt-1 text-sm text-slate-400">Temps de réponse moyen du chatbot (retrieval + Llama 3.1).</p>
        </Card>
      </div>
    </div>
  );
}