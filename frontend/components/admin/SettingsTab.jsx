"use client";

import { useEffect, useState } from "react";
import { get, send } from "../../lib/api";
import { useToast } from "../Toast";
import { Button, Card, Spinner, inputClass } from "../ui";

export default function SettingsTab() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [models, setModels] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get("/admin/settings")
      .then((d) => { setS(d.settings); setModels(d.models); })
      .catch((e) => toast.error("Chargement impossible", e.message));
  }, []);

  async function save() {
    setSaving(true);
    try {
      setS((await send("PUT", "/admin/settings", s)).settings);
      toast.success("Paramètres enregistrés", "Appliqués dès la prochaine requête.");
    } catch (e) { toast.error("Enregistrement impossible", e.message); }
    setSaving(false);
  }

  if (!s) return <Spinner label="Chargement..." />;
  const options = models.includes(s.model) ? models : [s.model, ...models];

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-white">Modèle LLM (Ollama)</label>
          <select className={inputClass} value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })}>
            {options.map((m) => <option className="bg-slate-900" key={m} value={m}>{m}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Pour ajouter un modèle : <code>ollama pull qwen2.5:7b</code> puis rechargez la page.
            {models.length === 0 && " Ollama ne répond pas : liste indisponible."}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-white">Seuil de pertinence (MIN_SCORE) : {s.min_score.toFixed(2)}</label>
          <input type="range" min="0.5" max="0.95" step="0.01" value={s.min_score} onChange={(e) => setS({ ...s, min_score: Number(e.target.value) })} className="w-full" />
          <p className="mt-1 text-xs text-slate-500">Sous ce score, les passages sont ignorés. Utilisez l'onglet Évaluation pour choisir la valeur.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-white">Passages récupérés (top_k)</label>
          <input type="number" min="1" max="10" className={`${inputClass} !w-28`} value={s.top_k} onChange={(e) => setS({ ...s, top_k: Number(e.target.value) })} />
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
      </Card>
    </div>
  );
}