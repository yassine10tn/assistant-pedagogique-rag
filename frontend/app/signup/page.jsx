"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import GoogleButton from "../../components/GoogleButton";
import PasswordStrength from "../../components/PasswordStrength";
import { API } from "../../lib/api";
import { Button, Card, PageHeader, inputClass } from "../../components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Les mots de passe ne correspondent pas.");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Erreur lors de l'inscription.");
      await signIn("credentials", { email, password, redirect: false });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader icon="✨" title="Créer un compte" subtitle="Rejoignez EduRAG en quelques secondes." />
      <Card className="space-y-4">
        <GoogleButton label="S'inscrire avec Google" />
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-white/10" /> ou avec votre email <span className="h-px flex-1 bg-white/10" />
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className={inputClass} placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputClass} type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <PasswordStrength password={password} />
          <input className={inputClass} type="password" placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Création..." : "Créer mon compte"}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Déjà inscrit ? <Link href="/login" className="font-semibold text-indigo-400 hover:underline">Se connecter</Link>
        </p>
      </Card>
    </div>
  );
}