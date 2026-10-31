import { initials } from "../../lib/format";
import { Chip } from "./Chip";
import { Icon } from "./Icon";

export function Person({ name }: { name: string | null }) {
  if (!name) return <Chip tone="warn"><Icon name="person_off" className="text-[13px]" /> No owner</Chip>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink">
      <span className="grid size-6 place-items-center rounded-full border border-line-strong bg-raised font-mono text-[10px] text-ink-2">
        {initials(name)}
      </span>
      {name}
    </span>
  );
}
