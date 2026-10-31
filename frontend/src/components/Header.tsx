import { Button } from "./ui/Button";
import { chipTone } from "./ui/Chip";
import { Icon } from "./ui/Icon";

export type Notice = { tone: "ok" | "bad" | "warn"; text: string };

type Props = { notice: Notice | null; onDismiss: () => void; onRefresh: () => void };

export function Header({ notice, onDismiss, onRefresh }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-canvas/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-2">
        <span>Workspace</span><Icon name="chevron_right" className="text-[14px]" /><span className="font-medium text-ink">Decision Intelligence</span>
      </div>
      <div className="flex items-center gap-3">
        {notice && (
          <span role="status" className={`flex items-center gap-2 rounded-lg border px-3 py-1 text-[12px] ${chipTone[notice.tone]}`}>
            {notice.text}
            <button onClick={onDismiss} aria-label="Dismiss" className="opacity-70 hover:opacity-100"><Icon name="close" className="text-[14px]" /></button>
          </span>
        )}
        <Button icon="refresh" onClick={onRefresh}>Refresh</Button>
      </div>
    </header>
  );
}
