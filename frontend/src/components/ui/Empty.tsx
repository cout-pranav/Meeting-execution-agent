import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-[13px] text-ink-2">
      <Icon name={icon} className="text-[24px] text-ink-3" />
      {children}
    </div>
  );
}
