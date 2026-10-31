import { fmtDate } from "../lib/format";
import type { Conflict, Item, OnAct } from "../types";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { Icon } from "./ui/Icon";
import { Person } from "./ui/Person";

type Props = { item: Item; conflict: Conflict; busy: boolean; onAct: OnAct };

export function ConflictCallout({ item, conflict, busy, onAct }: Props) {
  return (
    <article aria-label={`Conflict #${conflict.id}`} className="overflow-hidden rounded-xl border border-bad/25 bg-panel">
      <header className="flex items-start gap-3 bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.12),transparent_55%)] px-5 pt-5 pb-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bad/90 text-white"><Icon name="crisis_alert" /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="bad">CONTRADICTION DETECTED</Chip>
            <span className="font-mono text-[11px] text-ink-3">Conflict #{conflict.id}</span>
          </div>
          <h3 className="mt-1.5 font-display text-[18px] leading-[26px] font-medium tracking-tight">{item.text}</h3>
        </div>
      </header>

      <div className="grid gap-3 px-5 pb-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div className="rounded-lg border border-line bg-canvas/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-ai-soft">
              <span className="size-1.5 rounded-full bg-ai-soft" /> New · In review
            </span>
            <Chip tone="muted">{item.meeting_title}</Chip>
          </div>
          <blockquote className="rounded-md bg-canvas px-3 py-2.5 font-display text-[15px] leading-[22px] text-ai-soft">“{item.quote}”</blockquote>
          <div className="mt-3"><Person name={item.owner} /></div>
        </div>

        <div className="grid place-items-center">
          <span className="grid size-9 place-items-center rounded-lg border border-line-strong bg-raised font-mono text-[11px] text-ink-2">VS</span>
        </div>

        <div className="rounded-lg border border-line bg-canvas/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-ok">
              <span className="size-1.5 rounded-full bg-ok" /> {fmtDate(conflict.prior_created_at)} · In memory
            </span>
            <Chip tone="muted">{conflict.prior_meeting}</Chip>
          </div>
          <blockquote className="rounded-md bg-canvas px-3 py-2.5 font-display text-[15px] leading-[22px] text-ok">“{conflict.prior_quote}”</blockquote>
          <p className="mt-3 text-[13px] text-ink-2">
            <span className="text-ink">Decision #{conflict.prior_id}:</span> {conflict.prior_text}
          </p>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/40 px-5 py-3">
        <p className="flex max-w-xl items-start gap-2 text-[13px] text-ink-2">
          <Icon name="info" className="mt-0.5 text-ai-soft" /> {conflict.explanation}
        </p>
        <div className="flex gap-2">
          <Button tone="danger" icon="block" busy={busy} onClick={() => onAct(item.id, "reject")}>Reject new decision</Button>
          <Button icon="check" busy={busy} onClick={() => onAct(item.id, "approve")}>Approve anyway</Button>
        </div>
      </footer>
    </article>
  );
}

/** Every conflict on every pending item, one callout each. */
export function ConflictRadar({ conflicted, isBusy, onAct }: { conflicted: Item[]; isBusy: (id: number) => boolean; onAct: OnAct }) {
  return (
    <section id="conflicts" className="flex scroll-mt-20 flex-col gap-4">
      {conflicted.flatMap((item) =>
        item.conflicts.map((c) => (
          <ConflictCallout key={c.id} item={item} conflict={c} busy={isBusy(item.id)} onAct={onAct} />
        )),
      )}
    </section>
  );
}
