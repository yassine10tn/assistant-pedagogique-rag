"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import PasswordStrength from "../../components/PasswordStrength";
import { get, send } from "../../lib/api";
import { Badge, Button, Card, PageHeader, inputClass } from "../../components/ui";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [me, setMe] = useState(null);
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState({ profile: "", pwd: "", danger: "" });

  useEffect(() => {
    get("/auth/me").then((u) => { setMe(u); setName(u.name || ""); }).catch(() => {});
  }, []);

  function setM(k, v) { setMsg((m) => ({ ...m, [k]: v })); }

  async function saveName() {
    try {
      const u = await send("PATCH", "/auth/profile", { name });
      setMe(u);
      await update({ name: u.name });
      setM("profile", "✓ Nom mis à jour.");
    } catch (e) { setM("profile", "Erreur : " + e.message); }
  }

  async function savePassword() {
    try {
      await send("POST", "/auth/password", { current, new: next });
      setCurrent(""); setNext("");
      setM("pwd", "✓ Mot de passe modifié.");
    } catch (e) { setM("pwd", "Erreur : " + e.message); }
  }

  async function removeAccount() {
    if (!confirm("Supprimer définitivement votre compte ?")) return;
    try {
      await send("DELETE", "/auth/me");
      await signOut({ callbackUrl: "/" });
    } catch (e) { setM("danger", "Erreur : " + e.message); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader icon="👤" title="Mon profil" subtitle="Gérez vos informations et votre sécurité." />

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{me?.email || session?.user?.email}</span>
          {me?.role === "admin" && <Badge tone="green">Admin</Badge>}
        </div>
        <label className="block text-sm text-slate-400">Nom</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={saveName} disabled={!name.trim()}>Enregistrer</Button>
        {msg.profile && <p className="text-sm text-slate-300">{msg.profile}</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold text-white">Changer le mot de passe</h2>
        <input className={inputClass} type="password" placeholder="Mot de passe actuel" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <input className={inputClass} type="password" placeholder="Nouveau mot de passe" value={next} onChange={(e) => setNext(e.target.value)} />
        <PasswordStrength password={next} />
        <Button onClick={savePassword} disabled={!current || !next}>Modifier</Button>
        {msg.pwd && <p className="text-sm text-slate-300">{msg.pwd}</p>}
        <p className="text-xs text-slate-500">Les comptes Google n'ont pas de mot de passe ici.</p>
      </Card>

      <Card className="space-y-3 border-rose-500/30">
        <h2 className="font-semibold text-rose-400">Zone dangereuse</h2>
        <p className="text-sm text-slate-400">La suppression du compte est définitive.</p>
        <Button variant="secondary" onClick={removeAccount}>Supprimer mon compte</Button>
        {msg.danger && <p className="text-sm text-rose-400">{msg.danger}</p>}
      </Card>
    </div>
  );
}