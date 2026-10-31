import type { ReactNode } from "react";
import { Icon } from "./Icon";

type Props = { id?: string; title: string; icon: string; aside?: ReactNode; children: ReactNode };

export function Panel({ id, title, icon, aside, children }: Props) {
  return (
    <section id={id} aria-label={title} className="scroll-mt-20 overflow-hidden rounded-xl border border-line bg-panel">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-medium tracking-tight">
          <Icon name={icon} className="text-ink-2" /> {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
