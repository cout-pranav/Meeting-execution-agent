import type { Item, OnAct } from "../types";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { Empty } from "./ui/Empty";
import { Icon } from "./ui/Icon";
import { Panel } from "./ui/Panel";
import { Person } from "./ui/Person";

type RowProps = { item: Item; busy: boolean; github: boolean; onAct: OnAct };

export function ReviewRow({ item, busy, github, onAct }: RowProps) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-raised/50 md:flex-row md:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={item.type === "decision" ? "ai" : "muted"}>{item.type.toUpperCase()}</Chip>
          <span className="text-[14px] font-medium text-ink">{item.text}</span>
        </div>
        <p className="mt-1.5 border-l-2 border-line-strong pl-2.5 text-[12px] italic leading-[18px] text-ink-2">“{item.quote}”</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Person name={item.owner} />
          {item.deadline ? (
            <span className="inline-flex items-center gap-1 font-mono text-[12px] text-ink-2"><Icon name="event" className="text-[15px]" /> {item.deadline}</span>
          ) : item.type === "action" ? (
            <Chip tone="warn"><Icon name="event_busy" className="text-[13px]" /> No deadline</Chip>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button tone="danger" icon="close" busy={busy} onClick={() => onAct(item.id, "reject")}>Reject</Button>
        <Button tone="primary" icon="check" busy={busy} onClick={() => onAct(item.id, "approve")}>
          {item.type === "action" && github ? "Approve & create issue" : "Approve"}
        </Button>
      </div>
    </li>
  );
}

type Props = { queueByMeeting: Map<string, Item[]>; count: number; github: boolean; isBusy: (id: number) => boolean; onAct: OnAct };

export function ReviewQueue({ queueByMeeting, count, github, isBusy, onAct }: Props) {
  return (
    <Panel id="review" title="Review queue" icon="fact_check" aside={<span className="font-mono text-[11px] text-ink-2">{count} pending</span>}>
      {count === 0 ? (
        <Empty icon="inbox">Nothing waiting. Ingest a transcript to extract decisions and action items.</Empty>
      ) : (
        [...queueByMeeting].map(([meeting, group]) => (
          <div key={meeting}>
            <div className="border-b border-line bg-canvas/40 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-2">{meeting}</div>
            <ul className="divide-y divide-line">
              {group.map((i) => <ReviewRow key={i.id} item={i} busy={isBusy(i.id)} github={github} onAct={onAct} />)}
            </ul>
          </div>
        ))
      )}
    </Panel>
  );
}
