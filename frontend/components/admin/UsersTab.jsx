"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { get, send } from "../../lib/api";
import { useConfirm, useToast } from "../Toast";
import { Button, Card, inputClass } from "../ui";
import { Modal, Pill, dateFmt, td, th } from "./parts";

const EMPTY = { name: "", email: "", password: "", role: "user" };

export default function UsersTab() {
  const { data: session } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { setUsers((await get(`/admin/users?q=${encodeURIComponent(q)}`)).users); }
    catch (e) { toast.error("Chargement impossible", e.message); }
  }, [q, toast]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  async function patch(u, body, msg) {
    try { await send("PATCH", `/admin/users/${u.id}`, body); toast.success("Utilisateur mis à jour", msg); load(); }
    catch (e) { toast.error("Action impossible", e.message); }
  }

  async function changeRole(u, role) {
    const ok = await confirm({
      title: "Changer le rôle ?", tone: "primary", icon: "🛡️",
      message: `${u.email} deviendra « ${role} ». Le changement s'applique à sa prochaine connexion pour l'interface.`,
      confirmText: "Confirmer",
    });
    if (ok) patch(u, { role }, `${u.email} est maintenant ${role}.`);
  }

  async function toggleActive(u) {
    if (u.active) {
      const ok = await confirm({
        title: "Désactiver ce compte ?",
        message: `${u.email} ne pourra plus se connecter ni utiliser l'API.`,
        confirmText: "Désactiver",
      });
      if (!ok) return;
    }
    patch(u, { active: !u.active }, `${u.email} : compte ${u.active ? "désactivé" : "réactivé"}.`);
  }

  async function unlock(u) {
    try { await send("POST", `/admin/users/${u.id}/unlock`); toast.success("Compte déverrouillé", u.email); load(); }
    catch (e) { toast.error("Action impossible", e.message); }
  }

  async function remove(u) {
    const ok = await confirm({
      title: `Supprimer ${u.email} ?`,
      message: "Le compte sera supprimé définitivement.",
      confirmText: "Supprimer",
    });
    if (!ok) return;
    try { await send("DELETE", `/admin/users/${u.id}`); toast.success("Utilisateur supprimé", u.email); load(); }
    catch (e) { toast.error("Suppression impossible", e.message); }
  }

  async function create(e) {
    e.preventDefault();
    try {
      await send("POST", "/admin/users", form);
      toast.success("Utilisateur créé", form.email);
      setShowCreate(false); setForm(EMPTY); load();
    } catch (err) { toast.error("Création impossible", err.message); }
  }

  async function saveEdit(e) {
    e.preventDefault();
    await patch(editing, { name: editing.name }, "Nom modifié.");
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input className={`${inputClass} !w-72`} placeholder="Rechercher (nom ou email)..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={() => setShowCreate(true)}>＋ Nouvel utilisateur</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr><th className={th}>Utilisateur</th><th className={th}>Méthode</th><th className={th}>Rôle</th><th className={th}>Statut</th><th className={th}>Inscrit le</th><th className={th}>Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-300">
            {users.map((u) => {
              const self = session?.user?.id === u.id;
              const locked = self || u.protected;
              return (
                <tr key={u.id}>
                  <td className={td}>
                    <div className="font-medium text-white">{u.name || "-"} {self && <Pill tone="indigo">vous</Pill>} {u.protected && <Pill tone="amber">protégé</Pill>}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className={td}><Pill tone={u.provider === "google" ? "indigo" : "slate"}>{u.provider}</Pill></td>
                  <td className={td}>
                    <select
                      disabled={locked}
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className={`${inputClass} !w-28 !py-1`}
                    >
                      <option className="bg-slate-900" value="user">user</option>
                      <option className="bg-slate-900" value="admin">admin</option>
                    </select>
                  </td>
                  <td className={td}>
                    <button disabled={locked} onClick={() => toggleActive(u)} className="disabled:cursor-not-allowed">
                      <Pill tone={u.active ? "green" : "red"}>{u.active ? "Actif" : "Désactivé"}</Pill>
                    </button>
                    {u.locked && (
                      <button onClick={() => unlock(u)} className="ml-2" title="Débloquer ce compte">
                        <Pill tone="amber">🔒 Débloquer</Pill>
                      </button>
                    )}
                  </td>
                  <td className={td}>{dateFmt(u.created_at)}</td>
                  <td className={td}>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing({ ...u })} className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/10" title="Modifier le nom">✏️</button>
                      <button disabled={locked} onClick={() => remove(u)} className="rounded-lg border border-white/10 px-2 py-1 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40" title="Supprimer">🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucun utilisateur.</p>}
      </Card>

      {showCreate && (
        <Modal title="Nouvel utilisateur" onClose={() => setShowCreate(false)}>
          <form onSubmit={create} className="space-y-3">
            <input className={inputClass} placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className={inputClass} type="password" placeholder="Mot de passe (8+, lettre et chiffre)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option className="bg-slate-900" value="user">Utilisateur</option>
              <option className="bg-slate-900" value="admin">Administrateur</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button type="submit">Créer</Button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Modifier l'utilisateur" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="space-y-3">
            <p className="text-sm text-slate-400">{editing.email}</p>
            <input className={inputClass} value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}