import type { Dashboard } from "../lib/selectors";
import type { Health } from "../types";
import { Icon } from "./ui/Icon";

type StatProps = { label: string; value: number; unit: string; note: string; icon: string; tone?: "bad" };

export function Stat({ label, value, unit, note, icon, tone }: StatProps) {
  const alert = tone === "bad" && value > 0;
  return (
    <div
      aria-label={label}
      className={`relative overflow-hidden rounded-xl border p-4 ${alert ? "border-bad/30 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.14),transparent_60%)] bg-panel" : "border-line bg-panel"}`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[11px] uppercase tracking-wider ${alert ? "text-bad" : "text-ink-2"}`}>{label}</span>
        <Icon name={icon} className={alert ? "text-bad" : "text-ai-soft"} />
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`font-display text-[32px] leading-10 font-semibold tracking-tight ${alert ? "text-bad" : ""}`}>{value}</span>
        <span className={`font-mono text-[12px] ${alert ? "text-bad" : "text-ai-soft"}`}>{unit}</span>
      </div>
      <p className="mt-1 text-[12px] text-ink-2">{note}</p>
    </div>
  );
}

export function StatCards({ d, health }: { d: Dashboard; health: Health | null }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Stat label="Memory corpus" value={d.memory.length} unit="Decisions" icon="database" note={`Approved across ${d.meetingCount} meeting${d.meetingCount === 1 ? "" : "s"}`} />
      <Stat label="Drift / Alert pulse" value={d.openConflicts} unit="Contradictions" icon="crisis_alert" tone="bad" note={d.openConflicts ? "Requires resolution before commit" : "No open contradictions"} />
      <Stat label="Pending review" value={d.pending.length} unit="Items" icon="pending_actions" note="Nothing ships without approval" />
      <Stat label="Tracker dispatch" value={d.issueCount} unit="Issues" icon="sync_alt" note={health?.github ? `Synced to ${health.github}` : "GitHub not configured"} />
    </div>
  );
}
