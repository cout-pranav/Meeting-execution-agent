import { issueNumber } from "../lib/format";
import type { Item } from "../types";
import { Chip } from "./ui/Chip";
import { Empty } from "./ui/Empty";
import { Icon } from "./ui/Icon";
import { Panel } from "./ui/Panel";

export function TrackerDispatch({ dispatched, repo }: { dispatched: Item[]; repo: string | null }) {
  return (
    <Panel id="tracker" title="Tracker dispatch" icon="sync_alt" aside={repo && <span className="font-mono text-[11px] text-ink-2">{repo}</span>}>
      {dispatched.length === 0 ? (
        <Empty icon="task_alt">Approved action items become GitHub Issues.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {dispatched.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] text-ink">{a.text}</div>
                <div className="mt-1 font-mono text-[11px] text-ink-2">{a.owner ?? "Unassigned"} · {a.deadline ?? "no deadline"}</div>
              </div>
              {a.issue_url ? (
                <a href={a.issue_url} target="_blank" rel="noreferrer" className="shrink-0">
                  <Chip tone="ok">#{issueNumber(a.issue_url)} <Icon name="open_in_new" className="text-[12px]" /></Chip>
                </a>
              ) : (
                <Chip tone="muted">not sent</Chip>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
