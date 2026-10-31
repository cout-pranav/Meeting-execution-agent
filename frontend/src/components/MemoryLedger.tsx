import { fmtDate } from "../lib/format";
import type { Item } from "../types";
import { Empty } from "./ui/Empty";
import { Icon } from "./ui/Icon";
import { Panel } from "./ui/Panel";
import { Person } from "./ui/Person";

export function MemoryLedger({ memory }: { memory: Item[] }) {
  return (
    <Panel id="memory" title="Memory ledger" icon="database" aside={<span className="font-mono text-[11px] text-ink-2">Newest first</span>}>
      {memory.length === 0 ? (
        <Empty icon="neurology">Approved decisions are stored here and checked against every new meeting.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="font-mono text-[11px] uppercase tracking-wider text-ink-2">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-normal">Decision</th>
                <th className="px-4 py-2 font-normal">Session & date</th>
                <th className="px-4 py-2 font-normal">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {memory.map((d) => <LedgerRow key={d.id} decision={d} />)}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function LedgerRow({ decision: d }: { decision: Item }) {
  const overrode = d.conflicts.length > 0;
  return (
    <tr className="transition-colors duration-150 hover:bg-raised/50">
      <td className="w-full max-w-0 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Icon name={overrode ? "warning" : "check_circle"} className={`mt-0.5 ${overrode ? "text-warn" : "text-ok"}`} />
          <div className="min-w-0">
            <div className="font-medium text-ink">{d.text}</div>
            <div className={`mt-0.5 truncate text-[12px] ${overrode ? "text-warn" : "text-ink-2"}`}>
              {overrode
                ? `Approved over conflict with decision #${d.conflicts.map((c) => c.prior_id).join(", #")}`
                : `“${d.quote}”`}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-ink">{d.meeting_title}</div>
        <div className="font-mono text-[11px] text-ink-2">{fmtDate(d.created_at)} · #{d.id}</div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{d.owner ? <Person name={d.owner} /> : <span className="text-ink-3">—</span>}</td>
    </tr>
  );
}
