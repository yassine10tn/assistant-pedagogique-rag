"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Alert from "../../components/Alert";
import GoogleButton from "../../components/GoogleButton";
import PasswordStrength from "../../components/PasswordStrength";
import { useToast } from "../../components/Toast";
import { API } from "../../lib/api";
import { Button, Card, PageHeader, inputClass } from "../../components/ui";

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setAlert(null);

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return setAlert({ tone: "warning", title: "Mot de passe trop faible", text: "Utilisez au moins 8 caractères, avec une lettre et un chiffre." });
    }
    if (password !== confirm) {
      return setAlert({ tone: "warning", title: "Mots de passe différents", text: "Les deux mots de passe doivent être identiques." });
    }

    setLoading(true);
    let res;
    try {
      res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
    } catch {
      setLoading(false);
      return toast.error("Serveur injoignable", "Vérifiez que le backend est démarré.");
    }
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      const text = typeof data.detail === "string" ? data.detail : "Inscription impossible.";
      if (res.status === 429) return toast.warning("Trop d'inscriptions", "Réessayez plus tard.");
      if (res.status === 409) {
        return setAlert({
          tone: "danger", title: "Inscription impossible",
          text: (<>{text} <Link href="/login" className="underline">Se connecter</Link></>),
        });
      }
      return setAlert({ tone: "warning", title: "Vérifiez vos informations", text });
    }

    const r = await signIn("credentials", { token: data.token, redirect: false });
    setLoading(false);
    toast.success("Compte créé", `Bienvenue sur EduRAG, ${data.name} !`);
    if (r?.error) return router.push("/login");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader icon="✨" title="Créer un compte" subtitle="Rejoignez EduRAG en quelques secondes." />
      <Card className="space-y-4">
        <GoogleButton label="S'inscrire avec Google" />
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-white/10" /> ou avec votre email <span className="h-px flex-1 bg-white/10" />
        </div>
        {alert && <Alert tone={alert.tone} title={alert.title}>{alert.text}</Alert>}
        <form onSubmit={submit} className="space-y-3">
          <input className={inputClass} placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputClass} type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <PasswordStrength password={password} />
          <input className={inputClass} type="password" placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
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