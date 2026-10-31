import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

type Conflict = {
  id: number;
  item_id: number;
  explanation: string;
  prior_id: number;
  prior_text: string;
  prior_quote: string;
  prior_owner: string | null;
  prior_meeting: string;
  prior_created_at: string;
};

type Item = {
  id: number;
  meeting_title: string;
  type: "decision" | "action";
  text: string;
  owner: string | null;
  deadline: string | null;
  quote: string;
  status: "pending" | "approved";
  issue_url: string | null;
  created_at: string;
  conflicts: Conflict[];
};

type Health = { status: string; gemini: boolean; github: string | null };

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(
    path,
    body === undefined
      ? undefined
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${res.statusText}`);
  return data as T;
}

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const initials = (name: string) =>
  name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const issueNumber = (url: string) => url.split("/").pop();

/* ---------- primitives ---------- */

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`icon ${className}`} aria-hidden>{name}</span>;
}

type Tone = "ai" | "ok" | "warn" | "bad" | "muted";
const chipTone: Record<Tone, string> = {
  ai: "bg-ai/10 text-ai-soft border-ai/30",
  ok: "bg-ok/10 text-ok border-ok/25",
  warn: "bg-warn/10 text-warn border-warn/25",
  bad: "bg-bad/10 text-bad border-bad/25",
  muted: "bg-raised text-ink-2 border-line-strong",
};

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-[21px] items-center gap-1 whitespace-nowrap rounded border px-1.5 font-mono text-[11px] tracking-wide ${chipTone[tone]}`}>
      {children}
    </span>
  );
}

const btnTone = {
  primary: "bg-ai text-white hover:bg-[#4f46e5] active:bg-[#4338ca] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
  ghost: "border border-line bg-panel text-ink hover:border-line-strong hover:bg-raised",
  danger: "border border-bad/30 bg-bad/10 text-bad hover:bg-bad/20",
};

function Button({
  tone = "ghost", icon, busy, children, ...props
}: { tone?: keyof typeof btnTone; icon?: string; busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${btnTone[tone]} ${props.className ?? ""}`}
    >
      <Icon name={busy ? "progress_activity" : icon ?? ""} className={`text-[16px] ${busy ? "animate-spin" : icon ? "" : "hidden"}`} />
      {children}
    </button>
  );
}

function Panel({ id, title, icon, aside, children }: { id?: string; title: string; icon: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 overflow-hidden rounded-xl border border-line bg-panel">
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

function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-[13px] text-ink-2">
      <Icon name={icon} className="text-[24px] text-ink-3" />
      {children}
    </div>
  );
}

function Person({ name }: { name: string | null }) {
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

/* ---------- sections ---------- */

function Stat({ label, value, unit, note, icon, tone }: { label: string; value: number; unit: string; note: string; icon: string; tone?: "bad" }) {
  const alert = tone === "bad" && value > 0;
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 ${alert ? "border-bad/30 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.14),transparent_60%)] bg-panel" : "border-line bg-panel"}`}>
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[11px] uppercase tracking-wider ${alert ? "text-bad" : "text-ink-2"}`}>{label}</span>
        <Icon name={icon} className={alert ? "text-bad" : "text-ai-soft"} />
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`font-display text-[32px] leading-10 font-semibold tracking-tight ${alert ? "text-bad" : ""}`}>{value}</span>
        <span className={`font-mono text-[12px] ${alert ? "text-bad" : "text-ai-soft"}`}>{unit}</span>
      </div>
      <p className="mt-1 text-[12px] text-ink-2">{note}</p>
    </div>
  );
}

function Ingest({ health, onDone }: { health: Health | null; onDone: (msg: string) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setTranscript(await file.text());
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ items: unknown[]; conflicts: unknown[] }>("/api/meetings", { title, transcript, date });
      setTranscript("");
      setTitle("");
      onDone(`Extracted ${r.items.length} item${r.items.length === 1 ? "" : "s"} · ${r.conflicts.length} conflict${r.conflicts.length === 1 ? "" : "s"} flagged`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel id="ingest" title="Ingest transcript" icon="move_to_inbox">
      <form onSubmit={submit} className="flex flex-col gap-3 p-4">
        {health && !health.gemini && (
          <p className="rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-[12px] text-warn">
            Gemini isn't configured. Set <code className="font-mono">GOOGLE_GENERATIVE_AI_API_KEY</code> and <code className="font-mono">GEMINI_MODEL</code>.
          </p>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input className="field h-[38px]" placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="field h-[38px] w-[140px] font-mono [color-scheme:dark]" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <textarea
          className="field min-h-[220px] resize-y py-2 font-mono text-[12px] leading-5"
          placeholder={"Speaker: text\n\nPriya: Let's decide the launch date.\nMarcus: December 12 works for me."}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          required
        />
        {err && <p className="rounded-lg border border-bad/25 bg-bad/10 px-3 py-2 text-[12px] text-bad">{err}</p>}
        <div className="flex items-center justify-between gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:bg-raised hover:text-ink">
            <Icon name="upload_file" className="text-[16px]" /> Load .txt
            <input type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <Button tone="primary" icon="auto_awesome" busy={busy} type="submit">
            {busy ? "Extracting…" : "Extract & check conflicts"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function ConflictCallout({ item, conflict, busy, onAct }: { item: Item; conflict: Conflict; busy: boolean; onAct: (id: number, action: "approve" | "reject") => void }) {
  return (
    <article className="overflow-hidden rounded-xl border border-bad/25 bg-panel">
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

function ReviewRow({ item, busy, github, onAct }: { item: Item; busy: boolean; github: boolean; onAct: (id: number, action: "approve" | "reject") => void }) {
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

/* ---------- app ---------- */

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthErr, setHealthErr] = useState(false);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<{ tone: "ok" | "bad" | "warn"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<Item[]>("/api/items"));
    } catch (e) {
      setNotice({ tone: "bad", text: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    load();
    api<Health>("/api/health").then(setHealth, () => setHealthErr(true));
  }, [load]);

  async function act(id: number, action: "approve" | "reject") {
    setBusy((s) => new Set(s).add(id));
    try {
      const updated = await api<Item>(`/api/items/${id}/${action}`, {});
      if (action === "approve" && updated.type === "action") {
        setNotice(updated.issue_url
          ? { tone: "ok", text: `GitHub issue #${issueNumber(updated.issue_url)} created` }
          : { tone: "warn", text: "Approved. No issue created because GitHub isn't configured." });
      }
      await load();
    } catch (e) {
      setNotice({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  const pending = items.filter((i) => i.status === "pending");
  const conflicted = pending.filter((i) => i.conflicts.length > 0);
  const queue = pending.filter((i) => i.conflicts.length === 0);
  const memory = items.filter((i) => i.status === "approved" && i.type === "decision");
  const dispatched = items.filter((i) => i.status === "approved" && i.type === "action");
  const meetings = new Set(memory.map((i) => i.meeting_title)).size;
  const openConflicts = conflicted.reduce((n, i) => n + i.conflicts.length, 0);
  const queueByMeeting = Map.groupBy(queue, (i) => i.meeting_title);

  const nav = [
    { href: "#ingest", icon: "move_to_inbox", label: "Ingestion", badge: pending.length ? <Chip tone="muted">{pending.length} pending</Chip> : null },
    { href: "#conflicts", icon: "radar", label: "Conflict Radar", badge: openConflicts ? <Chip tone="bad">{openConflicts}</Chip> : null },
    { href: "#review", icon: "fact_check", label: "Review Queue", badge: queue.length ? <span className="font-mono text-[11px] text-ink-2">{queue.length}</span> : null },
    { href: "#memory", icon: "database", label: "Memory Ledger", badge: <span className="font-mono text-[11px] text-ink-2">{memory.length}</span> },
    { href: "#tracker", icon: "sync_alt", label: "Tracker Dispatch", badge: <span className="flex items-center gap-1 font-mono text-[11px] text-ink-2"><span className={`size-1.5 rounded-full ${health?.github ? "bg-ok" : "bg-ink-3"}`} />{health?.github ? "Active" : "Off"}</span> },
  ];

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col justify-between border-r border-line bg-panel lg:flex">
        <div>
          <div className="flex h-14 items-center gap-2.5 px-5">
            <span className="grid size-8 place-items-center rounded-lg bg-ai/15 text-ai-soft shadow-[0_0_20px_-4px_rgba(99,102,241,0.5)]"><Icon name="hub" /></span>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-medium tracking-tight">ConsensusOS</div>
              <div className="font-mono text-[11px] text-ink-2">Meeting Execution Agent</div>
            </div>
          </div>
          <nav className="mt-3 flex flex-col gap-0.5 px-3">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] text-ink-2 transition-colors duration-150 hover:bg-raised hover:text-ink">
                <span className="flex items-center gap-2.5"><Icon name={n.icon} /> {n.label}</span>
                {n.badge}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-line p-4 font-mono text-[11px]">
          <Status ok={health?.status === "ok"} loading={!health && !healthErr} label={healthErr ? "Database unreachable" : "Database connected"} />
          <Status ok={!!health?.gemini} loading={!health && !healthErr} label={health?.gemini ? "Gemini ready" : "Gemini not configured"} />
          <Status ok={!!health?.github} loading={!health && !healthErr} label={health?.github ?? "GitHub not configured"} />
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-canvas/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-1.5 text-[12px] text-ink-2">
            <span>Workspace</span><Icon name="chevron_right" className="text-[14px]" /><span className="font-medium text-ink">Decision Intelligence</span>
          </div>
          <div className="flex items-center gap-3">
            {notice && (
              <span className={`flex items-center gap-2 rounded-lg border px-3 py-1 text-[12px] ${chipTone[notice.tone]}`}>
                {notice.text}
                <button onClick={() => setNotice(null)} aria-label="Dismiss" className="opacity-70 hover:opacity-100"><Icon name="close" className="text-[14px]" /></button>
              </span>
            )}
            <Button icon="refresh" onClick={load}>Refresh</Button>
          </div>
        </header>

        <main className="flex flex-col gap-6 p-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Stat label="Memory corpus" value={memory.length} unit="Decisions" icon="database" note={`Approved across ${meetings} meeting${meetings === 1 ? "" : "s"}`} />
            <Stat label="Drift / Alert pulse" value={openConflicts} unit="Contradictions" icon="crisis_alert" tone="bad" note={openConflicts ? "Requires resolution before commit" : "No open contradictions"} />
            <Stat label="Pending review" value={pending.length} unit="Items" icon="pending_actions" note="Nothing ships without approval" />
            <Stat label="Tracker dispatch" value={dispatched.filter((i) => i.issue_url).length} unit="Issues" icon="sync_alt" note={health?.github ? `Synced to ${health.github}` : "GitHub not configured"} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-6">
              <section id="conflicts" className="flex scroll-mt-20 flex-col gap-4">
                {conflicted.flatMap((item) =>
                  item.conflicts.map((c) => (
                    <ConflictCallout key={c.id} item={item} conflict={c} busy={busy.has(item.id)} onAct={act} />
                  )),
                )}
              </section>

              <Panel id="review" title="Review queue" icon="fact_check" aside={<span className="font-mono text-[11px] text-ink-2">{queue.length} pending</span>}>
                {queue.length === 0 ? (
                  <Empty icon="inbox">Nothing waiting. Ingest a transcript to extract decisions and action items.</Empty>
                ) : (
                  [...queueByMeeting].map(([meeting, group]) => (
                    <div key={meeting}>
                      <div className="border-b border-line bg-canvas/40 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-2">{meeting}</div>
                      <ul className="divide-y divide-line">
                        {group.map((i) => <ReviewRow key={i.id} item={i} busy={busy.has(i.id)} github={!!health?.github} onAct={act} />)}
                      </ul>
                    </div>
                  ))
                )}
              </Panel>

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
                        {memory.map((d) => (
                          <tr key={d.id} className="transition-colors duration-150 hover:bg-raised/50">
                            <td className="w-full max-w-0 px-4 py-3">
                              <div className="flex items-start gap-2.5">
                                <Icon name={d.conflicts.length ? "warning" : "check_circle"} className={`mt-0.5 ${d.conflicts.length ? "text-warn" : "text-ok"}`} />
                                <div className="min-w-0">
                                  <div className="font-medium text-ink">{d.text}</div>
                                  <div className={`mt-0.5 truncate text-[12px] ${d.conflicts.length ? "text-warn" : "text-ink-2"}`}>
                                    {d.conflicts.length
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>

            <div className="flex flex-col gap-6 xl:sticky xl:top-20 xl:self-start">
              <Ingest health={health} onDone={(text) => { setNotice({ tone: "ok", text }); load(); }} />

              <Panel id="tracker" title="Tracker dispatch" icon="sync_alt" aside={health?.github && <span className="font-mono text-[11px] text-ink-2">{health.github}</span>}>
                {dispatched.length === 0 ? (
                  <Empty icon="task_alt">Approved action items become GitHub Issues.</Empty>
                ) : (
                  <ul className="divide-y divide-line">
                    {dispatched.map((a) => (
                      <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-[13px] text-ink">{a.text}</div>
                          <div className="mt-1 font-mono text-[11px] text-ink-2">{a.owner ?? "Unassigned"} · {a.deadline ?? "no deadline"}</div>
                        </div>
                        {a.issue_url ? (
                          <a href={a.issue_url} target="_blank" rel="noreferrer" className="shrink-0">
                            <Chip tone="ok">#{issueNumber(a.issue_url)} <Icon name="open_in_new" className="text-[12px]" /></Chip>
                          </a>
                        ) : (
                          <Chip tone="muted">not sent</Chip>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Status({ ok, loading, label }: { ok: boolean; loading: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-2">
      <span className={`size-1.5 rounded-full ${loading ? "bg-ink-3" : ok ? "bg-ok" : "bg-warn"}`} />
      <span className="truncate">{loading ? "Checking…" : label}</span>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
