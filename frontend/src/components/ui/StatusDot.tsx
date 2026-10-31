export function StatusDot({ ok, loading, label }: { ok: boolean; loading: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-2">
      <span className={`size-1.5 rounded-full ${loading ? "bg-ink-3" : ok ? "bg-ok" : "bg-warn"}`} />
      <span className="truncate">{loading ? "Checking…" : label}</span>
    </div>
  );
}
