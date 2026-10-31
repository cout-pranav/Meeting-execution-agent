import { QueryClient, useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { actOnItem, getHealth, getItems, ingestMeeting, type NewMeeting } from "../api";
import type { Item, ItemAction } from "../types";

export const queryKeys = {
  items: ["items"] as const,
  health: ["health"] as const,
};

const itemActionKey = ["item-action"] as const;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Nothing changes server-side without this UI, so don't refetch on every focus.
      queries: { refetchOnWindowFocus: false, retry: 1 },
    },
  });
}

export const useItems = () => useQuery({ queryKey: queryKeys.items, queryFn: getItems });

export const useHealth = () => useQuery({ queryKey: queryKeys.health, queryFn: getHealth, retry: false });

type ActVars = { id: number; action: ItemAction };

/** Approve/reject an item, then reload the list. The callbacks run once per call, even when several are in flight. */
export function useItemAction({ onSuccess, onError }: { onSuccess?: (item: Item, vars: ActVars) => void; onError?: (e: Error) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: itemActionKey,
    mutationFn: ({ id, action }: ActVars) => actOnItem(id, action),
    onSuccess: async (item, vars) => {
      onSuccess?.(item, vars);
      await qc.invalidateQueries({ queryKey: queryKeys.items });
    },
    onError,
  });
}

/** Ids of items with an approve/reject request in flight. */
export function useBusyItemIds() {
  return useMutationState({
    filters: { mutationKey: itemActionKey, status: "pending" },
    select: (m) => (m.state.variables as ActVars).id,
  });
}

/** Ingest a transcript; the extracted items land in the list. */
export function useIngestMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meeting: NewMeeting) => ingestMeeting(meeting),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.items }),
  });
}
