"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Alert from "../../components/Alert";
import PasswordStrength from "../../components/PasswordStrength";
import { useConfirm, useToast } from "../../components/Toast";
import { get, send } from "../../lib/api";
import { Badge, Button, Card, PageHeader, inputClass } from "../../components/ui";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const [me, setMe] = useState(null);
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  useEffect(() => {
    get("/auth/me").then((u) => { setMe(u); setName(u.name || ""); }).catch(() => {});
  }, []);

  async function saveName() {
    try {
      const u = await send("PATCH", "/auth/profile", { name });
      setMe(u);
      await update({ name: u.name });
      toast.success("Profil mis à jour", "Votre nom a été modifié.");
    } catch (e) { toast.error("Modification impossible", e.message); }
  }

  async function savePassword() {
    try {
      await send("POST", "/auth/password", { current, new: next });
      setCurrent(""); setNext("");
      toast.success("Mot de passe modifié", "Utilisez-le à votre prochaine connexion.");
    } catch (e) { toast.error("Modification impossible", e.message); }
  }

  async function removeAccount() {
    const ok = await confirm({
      title: "Supprimer votre compte ?",
      message: "Cette action est définitive : votre compte sera supprimé et vous serez déconnecté.",
      confirmText: "Supprimer définitivement",
    });
    if (!ok) return;
    try {
      await send("DELETE", "/auth/me");
      toast.success("Compte supprimé", "À bientôt !");
      await signOut({ callbackUrl: "/" });
    } catch (e) { toast.error("Suppression impossible", e.message); }
  }

  const isGoogle = me?.provider === "google";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader icon="👤" title="Mon profil" subtitle="Gérez vos informations et votre sécurité." />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400">{me?.email || session?.user?.email}</span>
          {me?.role === "admin" && <Badge tone="green">Admin</Badge>}
          {isGoogle && <Badge tone="indigo">Google</Badge>}
        </div>
        <label className="block text-sm text-slate-400">Nom</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={saveName} disabled={!name.trim()}>Enregistrer</Button>
      </Card>

      {isGoogle ? (
        <Alert tone="info" title="Compte Google">Votre mot de passe est géré par Google : rien à modifier ici.</Alert>
      ) : (
        <Card className="space-y-3">
          <h2 className="font-semibold text-white">Changer le mot de passe</h2>
          <input className={inputClass} type="password" placeholder="Mot de passe actuel" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Nouveau mot de passe" value={next} onChange={(e) => setNext(e.target.value)} />
          <PasswordStrength password={next} />
          <Button onClick={savePassword} disabled={!current || !next}>Modifier</Button>
        </Card>
      )}

      <Card className="space-y-3 !border-rose-500/30">
        <h2 className="font-semibold text-rose-400">Zone dangereuse</h2>
        <p className="text-sm text-slate-400">La suppression du compte est définitive.</p>
        <Button variant="secondary" onClick={removeAccount}>Supprimer mon compte</Button>
      </Card>
    </div>
  );
}