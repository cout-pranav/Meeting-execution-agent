import { useState, type FormEvent } from "react";
import { api } from "../api";
import { plural, today } from "../lib/format";
import type { Health } from "../types";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Panel } from "./ui/Panel";

type Props = { health: Health | null; onDone: (message: string) => void };

export function IngestForm({ health, onDone }: Props) {
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ items: unknown[]; conflicts: unknown[] }>("/api/meetings", { title, transcript, date });
      setTranscript("");
      setTitle("");
      onDone(`Extracted ${plural(r.items.length, "item")} · ${plural(r.conflicts.length, "conflict")} flagged`);
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
          <p role="status" className="rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-[12px] text-warn">
            Gemini isn't configured. Set <code className="font-mono">GOOGLE_GENERATIVE_AI_API_KEY</code> and <code className="font-mono">GEMINI_MODEL</code>.
          </p>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input aria-label="Meeting title" className="field h-[38px]" placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input aria-label="Meeting date" className="field h-[38px] w-[140px] font-mono [color-scheme:dark]" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <textarea
          aria-label="Transcript"
          className="field min-h-[220px] resize-y py-2 font-mono text-[12px] leading-5"
          placeholder={"Speaker: text\n\nPriya: Let's decide the launch date.\nMarcus: December 12 works for me."}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          required
        />
        {err && <p role="alert" className="rounded-lg border border-bad/25 bg-bad/10 px-3 py-2 text-[12px] text-bad">{err}</p>}
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
