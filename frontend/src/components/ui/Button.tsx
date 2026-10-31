import type { ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";

const btnTone = {
  primary: "bg-ai text-white hover:bg-[#4f46e5] active:bg-[#4338ca] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
  ghost: "border border-line bg-panel text-ink hover:border-line-strong hover:bg-raised",
  danger: "border border-bad/30 bg-bad/10 text-bad hover:bg-bad/20",
};

type Props = { tone?: keyof typeof btnTone; icon?: string; busy?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ tone = "ghost", icon, busy, children, ...props }: Props) {
  return (
    <button
      {...props}
      aria-busy={busy || undefined}
      disabled={busy || props.disabled}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${btnTone[tone]} ${props.className ?? ""}`}
    >
      <Icon name={busy ? "progress_activity" : icon ?? ""} className={`text-[16px] ${busy ? "animate-spin" : icon ? "" : "hidden"}`} />
      {children}
    </button>
  );
}
