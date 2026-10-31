import type { ReactNode } from "react";

export type Tone = "ai" | "ok" | "warn" | "bad" | "muted";

export const chipTone: Record<Tone, string> = {
  ai: "bg-ai/10 text-ai-soft border-ai/30",
  ok: "bg-ok/10 text-ok border-ok/25",
  warn: "bg-warn/10 text-warn border-warn/25",
  bad: "bg-bad/10 text-bad border-bad/25",
  muted: "bg-raised text-ink-2 border-line-strong",
};

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-[21px] items-center gap-1 whitespace-nowrap rounded border px-1.5 font-mono text-[11px] tracking-wide ${chipTone[tone]}`}>
      {children}
    </span>
  );
}
