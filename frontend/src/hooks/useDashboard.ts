import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import type { Notice } from "../components/Header";
import { issueNumber } from "../lib/format";
import { deriveDashboard } from "../lib/selectors";
import type { ItemAction } from "../types";
import { queryKeys, useBusyItemIds, useHealth, useItemAction, useItems } from "./queries";

export type DashboardState = ReturnType<typeof useDashboard>;

/** The views derived from the items + health from the query cache, approve/reject, and the header notice they report to. */
export function useDashboard() {
  const qc = useQueryClient();
  const items = useItems();
  const health = useHealth();
  const busy = useBusyItemIds();
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (items.error) setNotice({ tone: "bad", text: items.error.message });
  }, [items.error]);

  const action = useItemAction({
    onSuccess: (updated, { action }) => {
      if (action === "approve" && updated.type === "action") {
        setNotice(updated.issue_url
          ? { tone: "ok", text: `GitHub issue #${issueNumber(updated.issue_url)} created` }
          : { tone: "warn", text: "Approved. No issue created because GitHub isn't configured." });
      }
    },
    onError: (e) => setNotice({ tone: "bad", text: e.message }),
  });

  return {
    d: deriveDashboard(items.data ?? []),
    health: health.data ?? null,
    healthErr: health.isError,
    notice,
    setNotice,
    refresh: () => qc.invalidateQueries({ queryKey: queryKeys.items }),
    act: (id: number, act: ItemAction) => action.mutate({ id, action: act }),
    isBusy: (id: number) => busy.includes(id),
  };
}

/** The dashboard state the layout route hands to its pages. */
export const useDashboardContext = () => useOutletContext<DashboardState>();
