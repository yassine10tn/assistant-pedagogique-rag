"use client";

import { useState } from "react";
import { downloadFile } from "../../lib/api";
import { useToast } from "../Toast";
import { Button } from "../ui";

export default function ExportButton({ kind, filename, query = "" }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await downloadFile(`/admin/export/${kind}${query}`, filename);
      toast.success("Export terminé", filename);
    } catch (e) {
      toast.error("Export impossible", e.message);
    }
    setBusy(false);
  }

  return <Button variant="secondary" onClick={run} disabled={busy}>{busy ? "Export..." : "⬇ Export CSV"}</Button>;
}
