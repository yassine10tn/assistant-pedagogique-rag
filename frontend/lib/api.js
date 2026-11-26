import { getSession, signOut } from "next-auth/react";

export const API = "http://localhost:8000";

// Émet un toast global (écouté par ToastProvider)
export function notify(type, title, message) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:toast", { detail: { type, title, message } }));
  }
}

async function authHeaders(extra = {}) {
  const session = await getSession();
  return session?.accessToken ? { ...extra, Authorization: `Bearer ${session.accessToken}` } : extra;
}

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    notify("error", "Serveur injoignable", "Vérifiez que le backend (uvicorn) est démarré.");
    throw new Error("Serveur injoignable.");
  }
}

async function handle(res) {
  if (res.status === 401) {
    await signOut({ callbackUrl: "/login?reason=expired" });
    throw new Error("Session expirée, reconnectez-vous.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err.detail === "string" ? err.detail : `Erreur ${res.status}`;
    if (res.status === 429) notify("warning", "Trop de requêtes", msg);
    else if (res.status >= 500 && !window.__quiet) notify("error", "Erreur serveur", msg);
    throw new Error(msg);
  }
  return res.json();
}

export async function get(path) {
  return handle(await request(`${API}${path}`, { headers: await authHeaders() }));
}

export async function send(method, path, body) {
  return handle(
    await request(`${API}${path}`, {
      method,
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: body ? JSON.stringify(body) : undefined,
    })
  );
}

export const post = (path, body) => send("POST", path, body);

export async function uploadPdf(file) {
  const form = new FormData();
  form.append("file", file);
  return handle(await request(`${API}/upload`, { method: "POST", headers: await authHeaders(), body: form }));
}