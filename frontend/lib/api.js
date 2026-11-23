import { getSession, signOut } from "next-auth/react";

export const API = "http://localhost:8000";

async function authHeaders(extra = {}) {
  const session = await getSession();
  return session?.accessToken ? { ...extra, Authorization: `Bearer ${session.accessToken}` } : extra;
}

async function handle(res) {
  if (res.status === 401) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Session expirée, reconnectez-vous.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : `Erreur ${res.status}`);
  }
  return res.json();
}

export async function get(path) {
  return handle(await fetch(`${API}${path}`, { headers: await authHeaders() }));
}

export async function send(method, path, body) {
  return handle(
    await fetch(`${API}${path}`, {
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
  return handle(
    await fetch(`${API}/upload`, { method: "POST", headers: await authHeaders(), body: form })
  );
}