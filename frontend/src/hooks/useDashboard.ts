import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Notice } from "../components/Header";
import { issueNumber } from "../lib/format";
import type { Health, Item, ItemAction } from "../types";

/** Loads items + health and runs approve/reject, tracking which items are in flight. */
export function useDashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthErr, setHealthErr] = useState(false);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<Item[]>("/api/items"));
    } catch (e) {
      setNotice({ tone: "bad", text: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    load();
    api<Health>("/api/health").then(setHealth, () => setHealthErr(true));
  }, [load]);

  async function act(id: number, action: ItemAction) {
    setBusy((s) => new Set(s).add(id));
    try {
      const updated = await api<Item>(`/api/items/${id}/${action}`, {});
      if (action === "approve" && updated.type === "action") {
        setNotice(updated.issue_url
          ? { tone: "ok", text: `GitHub issue #${issueNumber(updated.issue_url)} created` }
          : { tone: "warn", text: "Approved. No issue created because GitHub isn't configured." });
      }
      await load();
    } catch (e) {
      setNotice({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  return { items, health, healthErr, notice, setNotice, load, act, isBusy: (id: number) => busy.has(id) };
}
