import type { Item } from "../types";

export type Dashboard = ReturnType<typeof deriveDashboard>;

/** Splits the item list into the views the dashboard renders. */
export function deriveDashboard(items: Item[]) {
  const pending = items.filter((i) => i.status === "pending");
  const conflicted = pending.filter((i) => i.conflicts.length > 0);
  const queue = pending.filter((i) => i.conflicts.length === 0);
  const memory = items.filter((i) => i.status === "approved" && i.type === "decision");
  const dispatched = items.filter((i) => i.status === "approved" && i.type === "action");

  return {
    pending,
    conflicted,
    queue,
    memory,
    dispatched,
    openConflicts: conflicted.reduce((n, i) => n + i.conflicts.length, 0),
    meetingCount: new Set(memory.map((i) => i.meeting_title)).size,
    issueCount: dispatched.filter((i) => i.issue_url).length,
    queueByMeeting: Map.groupBy(queue, (i) => i.meeting_title),
  };
}
