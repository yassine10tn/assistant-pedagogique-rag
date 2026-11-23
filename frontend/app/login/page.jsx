"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Alert from "../../components/Alert";
import GoogleButton from "../../components/GoogleButton";
import { useToast } from "../../components/Toast";
import { API } from "../../lib/api";
import { Button, Card, PageHeader, inputClass } from "../../components/ui";

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [lockUntil, setLockUntil] = useState(0);
  const [left, setLeft] = useState(0);

  // Messages venant d'ailleurs (session expirée, erreur Google)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("reason") === "expired") toast.warning("Session expirée", "Veuillez vous reconnecter.");
    const err = p.get("error");
    if (err) {
      toast.error("Connexion Google impossible", err === "AccessDenied" ? "Accès refusé pour ce compte." : "Une erreur est survenue, réessayez.");
    }
  }, [toast]);

  // Compte à rebours du verrouillage
  useEffect(() => {
    if (!lockUntil) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setLockUntil(0);
        setAlert(null);
        toast.success("Compte déverrouillé", "Vous pouvez réessayer de vous connecter.");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockUntil, toast]);

  const locked = lockUntil > 0 && left > 0;

  async function submit(e) {
    e.preventDefault();
    if (locked) return;
    setLoading(true);
    setAlert(null);

    let res;
    try {
      res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setLoading(false);
      toast.error("Serveur injoignable", "Vérifiez que le backend est démarré.");
      return;
    }
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const r = await signIn("credentials", { token: data.token, redirect: false });
      setLoading(false);
      if (r?.error) {
        toast.error("Connexion impossible", "La session n'a pas pu être créée.");
        return;
      }
      toast.success(`Bienvenue ${data.name || ""}`.trim(), "Connexion réussie.");
      const cb = new URLSearchParams(window.location.search).get("callbackUrl");
      router.push(cb && cb.startsWith("/") && !cb.startsWith("//") ? cb : "/");
      router.refresh();
      return;
    }

    setLoading(false);
    const d = data.detail && typeof data.detail === "object" ? data.detail : { message: typeof data.detail === "string" ? data.detail : "Erreur inattendue." };

    if (res.status === 423) {
      setAlert({ tone: "danger", title: "Compte temporairement verrouillé", text: d.message });
      setLockUntil(Date.now() + (d.seconds || 900) * 1000);
      toast.error("Compte verrouillé", "Trop de tentatives échouées. Patientez avant de réessayer.");
    } else if (res.status === 429) {
      setAlert({ tone: "warning", title: "Trop de tentatives", text: "Patientez une minute avant de réessayer." });
      toast.warning("Doucement !", "Trop de tentatives en peu de temps.");
    } else if (d.code === "disabled") {
      setAlert({ tone: "danger", title: "Compte désactivé", text: d.message });
    } else if (d.code === "google_only") {
      setAlert({ tone: "info", title: "Compte Google", text: d.message });
    } else {
      const last = d.remaining === 1;
      setAlert({ tone: last ? "danger" : "warning", title: last ? "Dernière tentative avant verrouillage" : "Identifiants incorrects", text: d.message });
      if (last) toast.warning("Attention", "Une erreur de plus et votre compte sera verrouillé 15 minutes.");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader icon="🔐" title="Connexion" subtitle="Heureux de vous revoir sur EduRAG." />
      <Card className="space-y-4">
        <GoogleButton />
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-white/10" /> ou avec votre email <span className="h-px flex-1 bg-white/10" />
        </div>

        {locked && (
          <Alert tone="danger" icon="🔒" title="Compte temporairement verrouillé">
            <p>Trop de tentatives échouées. Par sécurité, la connexion est bloquée.</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums">{fmt(left)}</p>
            <p className="text-xs opacity-80">Temps restant avant de pouvoir réessayer.</p>
          </Alert>
        )}
        {!locked && alert && <Alert tone={alert.tone} title={alert.title}>{alert.text}</Alert>}

        <form onSubmit={submit} className="space-y-3">
          <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputClass} type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={loading || locked}>
            {locked ? `🔒 Verrouillé · ${fmt(left)}` : loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Pas encore de compte ? <Link href="/signup" className="font-semibold text-indigo-400 hover:underline">Créer un compte</Link>
        </p>
      </Card>
    </div>
  );
}