# CLAUDE.md — Meeting Execution Agent

An agent that turns speaker-labeled meeting transcripts into owned, tracked work (GitHub Issues). It remembers decisions across meetings and flags new decisions that contradict earlier ones. Hackathon project; so far the repo holds only planning docs.

## Project docs (read before building)

| File | What it holds | When to read |
|---|---|---|
| [README.md](README.md) | The original hackathon brief | Context on the problem |
| [project-scope.md](project-scope.md) | Problem, end-to-end flow, features F1–F8, stretch goals, out of scope, open gaps G1–G13 | Before deciding *what* a feature should do |
| [techstack.md](techstack.md) | Full target architecture: stack, project structure, data model, AI pipeline, env vars, Docker | Before post-MVP work, or when the MVP plan says nothing |
| [implementation-plan.md](implementation-plan.md) | **The active plan:** 2-hour MVP scope, files, 2-table schema, API routes, timeboxed tasks T1–T7 | **Always, first.** This is what we're building now |

## Which doc wins

The MVP is being built now, so **[implementation-plan.md](implementation-plan.md) overrides [techstack.md](techstack.md)** wherever they differ:
- `Bun.sql` + `CREATE TABLE IF NOT EXISTS` on boot, not Drizzle/migrations
- Prior decisions passed straight into the Gemini prompt, not pgvector
- TXT `Speaker: text` only (no VTT/SRT); a single page (no React Router or TanStack Query)
- Env var `GITHUB_REPO` (MVP), not `GITHUB_DEFAULT_REPO` (full stack)
- Slack reminders and digests (F7/F8) are deferred

Do not bring in anything from the "Deferred" list in implementation-plan.md unless asked.

## Non-negotiables

- **Human in the loop:** nothing reaches GitHub (or memory) until a person approves it in the dashboard.
- **Conflict detection is the demo:** never drop or stub T3. If time runs short, cut in the order the plan gives (shadcn first, then GitHub calls).
- Every extracted item carries the `source_quote` it came from; drop items that have none.
- Conflicts cite the earlier decision (its text, meeting and date) and say why it conflicts.

## Stack at a glance

Bun (runtime, bundler, tests, `Bun.serve` routes + HTML import) · React + TypeScript + Tailwind (+ shadcn/ui if it installs quickly) · AI SDK (`ai`, `@ai-sdk/google`) with Gemini Flash and Zod `Output.object` · Octokit · Postgres · Docker multi-stage + compose. Use the `frontend-design` skill for the UI pass (T5).

## Commands

```bash
docker compose up -d db          # Postgres (local .env points DATABASE_URL at it)
bun install
bun run dev                      # dev server with HMR on :3000
bun run typecheck
docker compose up --build        # full deploy check
```

In production (`NODE_ENV=production`) Bun bundles the HTML import with the Tailwind plugin from `bunfig.toml` once at startup, so the Dockerfile has no separate `bun build` step. That's why `tailwindcss` and `bun-plugin-tailwind` are runtime dependencies.

## Verification

Follow the "Verification" section of [implementation-plan.md](implementation-plan.md): meeting-1 → approve → issues created; meeting-2 → conflict callout cites meeting-1; data survives a container restart.

## Keep docs in sync

When you settle an open gap (project-scope.md §4) or an open tech question (techstack.md §8), update that doc instead of recording it only here.
