# CLAUDE.md — Meeting Execution Agent

An agent that turns speaker-labeled meeting transcripts into owned, tracked work (GitHub Issues). It remembers decisions across meetings and flags new decisions that contradict earlier ones. Hackathon project: the Bun API (`src/server/`) and the React dashboard (`frontend/`) are both in place.

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

There are two projects:
- **API** (repo root, `src/server/`): Bun + `Bun.serve` `/api/*` routes only · AI SDK (`ai`, `@ai-sdk/google`) with Gemini Flash and Zod `Output.object` · Octokit · Postgres via `Bun.sql`.
- **Frontend** (`frontend/`): a separate Vite + React + TypeScript + Tailwind v4 app. Bun **does not serve it**. In dev, Vite proxies `/api` to :3000; in Docker, nginx serves `dist/` and proxies `/api` to the `app` container. Tests use Vitest + Testing Library + jsdom. Design tokens are in `frontend/src/styles.css`.

Frontend structure: `App.tsx` only composes; state lives in `hooks/useDashboard.ts`; derived lists come from the pure `lib/selectors.ts` (`deriveDashboard`); each section is its own prop-driven component in `components/` with a colocated `*.test.tsx`; shared primitives are in `components/ui/`. Keep new UI in this shape: props in, callbacks out, no fetches inside components (except `IngestForm`'s submit).

## Agents

- **`component-test-writer`** ([.claude/agents/component-test-writer.md](.claude/agents/component-test-writer.md)) writes Vitest + React Testing Library tests in the house style. Delegate to it whenever a component in `frontend/src/components/` is added or its behavior changes. Every component needs a colocated `*.test.tsx`. The agent only touches test files and `src/test/fixtures.ts`, and reports any accessibility gaps or bugs it finds instead of changing the component.

## Commands

```bash
docker compose up -d db                   # Postgres (local .env points DATABASE_URL at it)
bun install && bun run dev                # API with hot reload on :3000
cd frontend && bun install && bun run dev # dashboard on :5173
cd frontend && bun run test               # frontend tests (no server needed)
cd frontend && bun run test -- src/components/X.test.tsx  # one test file
bun test                                  # API health tests (API must be running; bunfig limits them to src/)
bun run typecheck                         # in root and in frontend/
docker compose up --build                 # db + app (:3000) + web (:8080)
```

## Verification

Follow the "Verification" section of [implementation-plan.md](implementation-plan.md): meeting-1 → approve → issues created; meeting-2 → conflict callout cites meeting-1; data survives a container restart.

## Keep docs in sync

When you settle an open gap (project-scope.md §4) or an open tech question (techstack.md §8), update that doc instead of recording it only here.
