import type { Dashboard } from "../lib/selectors";
import type { Health } from "../types";
import { Chip } from "./ui/Chip";
import { Icon } from "./ui/Icon";
import { StatusDot } from "./ui/StatusDot";

type Props = { d: Dashboard; health: Health | null; healthErr: boolean };

export function Sidebar({ d, health, healthErr }: Props) {
  const checking = !health && !healthErr;
  const count = (n: number) => <span className="font-mono text-[11px] text-ink-2">{n}</span>;

  const nav = [
    { href: "#ingest", icon: "move_to_inbox", label: "Ingestion", badge: d.pending.length ? <Chip tone="muted">{d.pending.length} pending</Chip> : null },
    { href: "#conflicts", icon: "radar", label: "Conflict Radar", badge: d.openConflicts ? <Chip tone="bad">{d.openConflicts}</Chip> : null },
    { href: "#review", icon: "fact_check", label: "Review Queue", badge: d.queue.length ? count(d.queue.length) : null },
    { href: "#memory", icon: "database", label: "Memory Ledger", badge: count(d.memory.length) },
    {
      href: "#tracker", icon: "sync_alt", label: "Tracker Dispatch",
      badge: (
        <span className="flex items-center gap-1 font-mono text-[11px] text-ink-2">
          <span className={`size-1.5 rounded-full ${health?.github ? "bg-ok" : "bg-ink-3"}`} />{health?.github ? "Active" : "Off"}
        </span>
      ),
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col justify-between border-r border-line bg-panel lg:flex">
      <div>
        <div className="flex h-14 items-center gap-2.5 px-5">
          <span className="grid size-8 place-items-center rounded-lg bg-ai/15 text-ai-soft shadow-[0_0_20px_-4px_rgba(99,102,241,0.5)]"><Icon name="hub" /></span>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-medium tracking-tight">ConsensusOS</div>
            <div className="font-mono text-[11px] text-ink-2">Meeting Execution Agent</div>
          </div>
        </div>
        <nav className="mt-3 flex flex-col gap-0.5 px-3">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] text-ink-2 transition-colors duration-150 hover:bg-raised hover:text-ink">
              <span className="flex items-center gap-2.5"><Icon name={n.icon} /> {n.label}</span>
              {n.badge}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-line p-4 font-mono text-[11px]">
        <StatusDot ok={!!health?.db} loading={checking} label={health?.db ? "Database connected" : "Database unreachable"} />
        <StatusDot ok={!!health?.gemini} loading={checking} label={health?.gemini ? "Gemini ready" : "Gemini not configured"} />
        <StatusDot ok={!!health?.github} loading={checking} label={health?.github ?? "GitHub not configured"} />
      </div>
    </aside>
  );
}
