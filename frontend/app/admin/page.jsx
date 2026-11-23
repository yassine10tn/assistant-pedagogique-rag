"use client";

import { useState } from "react";
import { PageHeader } from "../../components/ui";
import AuditTab from "../../components/admin/AuditTab";
import ChatsTab from "../../components/admin/ChatsTab";
import DocumentsTab from "../../components/admin/DocumentsTab";
import Overview from "../../components/admin/Overview";
import UsersTab from "../../components/admin/UsersTab";

const TABS = [
  ["overview", "📊 Vue d'ensemble", Overview],
  ["users", "👥 Utilisateurs", UsersTab],
  ["docs", "📚 Documents", DocumentsTab],
  ["chats", "💬 Historique", ChatsTab],
  ["audit", "🧾 Audit", AuditTab],
];

export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const Current = TABS.find((t) => t[0] === tab)[2];

  return (
    <div>
      <PageHeader icon="🛡️" title="Administration" subtitle="Pilotez les utilisateurs, les documents et l'activité de la plateforme." />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${tab === key ? "btn-glow" : "text-slate-400 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Current />
    </div>
  );
}