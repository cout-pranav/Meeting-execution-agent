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
- TXT `Speaker: text` only (no VTT/SRT). The dashboard does use React Router (one route per sidebar tab) and TanStack Query + Axios: both were added on request after the MVP
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
- **Frontend** (`frontend/`): a separate Vite + React + TypeScript + Tailwind v4 app. Bun **does not serve it**. In dev, Vite proxies `/api` to :3000; in Docker, nginx serves `dist/` and proxies `/api` to the `app` container. Unit and component tests use Vitest + Testing Library + jsdom (`src/**/*.test.{ts,tsx}` only). End-to-end tests use Playwright (Chromium) in `frontend/e2e/`. By default (`mocked` project) they drive the real UI against an in-memory fake of the API (`e2e/support/fake-api.ts`, `page.route`), so they need no server, DB or keys. The opt-in `live` project (`e2e/live/`) runs against the real Bun API + Postgres + Gemini. Design tokens are in `frontend/src/styles.css`.

Frontend structure: `App.tsx` only mounts the providers (`QueryClientProvider` + `RouterProvider`); `routes.tsx` holds the layout route (Sidebar, Header, StatCards, `<Outlet>`) and one small page per sidebar tab (`/` overview, `/ingest`, `/conflicts`, `/review`, `/memory`, `/tracker`); HTTP goes through the Axios client and typed calls in `api.ts`; server state is TanStack Query hooks in `hooks/queries.ts`; `hooks/useDashboard.ts` combines them with the header notice and is handed to pages through the outlet context (`useDashboardContext`); derived lists come from the pure `lib/selectors.ts` (`deriveDashboard`); each section is its own prop-driven component in `components/` with a colocated `*.test.tsx`; shared primitives are in `components/ui/`. Keep new UI in this shape: props in, callbacks out, no fetches inside components (except `IngestForm`'s submit).

## Agents

- **`component-test-writer`** ([.claude/agents/component-test-writer.md](.claude/agents/component-test-writer.md)) writes Vitest + React Testing Library tests in the house style. Delegate to it whenever a component in `frontend/src/components/` is added or its behavior changes. Every component needs a colocated `*.test.tsx`. The agent only touches test files and `src/test/fixtures.ts`, and reports any accessibility gaps or bugs it finds instead of changing the component.
- **`e2e-test-writer`** ([.claude/agents/e2e-test-writer.md](.claude/agents/e2e-test-writer.md)) writes Playwright end-to-end specs for user journeys that span components and `/api`: ingest → review → approve or reject → memory ledger or tracker, and conflict callouts. Delegate to it when such a flow changes, or when a new UI flow or API route is added. The split: `component-test-writer` covers one component in jsdom, and `e2e-test-writer` covers whole journeys in a real browser. It only touches `frontend/e2e/`, and it writes or runs `live/` specs only when asked, because those hit Gemini, write to Postgres and can create real GitHub issues. **When `src/server/index.ts` changes, `e2e/support/fake-api.ts` must be updated to match.**

## Commands

```bash
docker compose up -d db                   # Postgres (local .env points DATABASE_URL at it)
bun install && bun run dev                # API with hot reload on :3000
cd frontend && bun install && bun run dev # dashboard on :5173
cd frontend && bun run test               # frontend tests (no server needed)
cd frontend && bun run test -- src/components/X.test.tsx  # one test file
cd frontend && bun run e2e                # Playwright E2E, mocked API (auto-starts Vite; no API/DB needed)
cd frontend && bun run e2e -- e2e/X.spec.ts  # one spec
cd frontend && bun run e2e:ui             # Playwright UI mode
cd frontend && bun run e2e:live           # real API + DB + Gemini (start db and root `bun run dev` first)
bun test                                  # API health tests (API must be running; bunfig limits them to src/)
bun run typecheck                         # in root and in frontend/
docker compose up --build                 # db + app (:3000) + web (:8080)
```

## Verification

Follow the "Verification" section of [implementation-plan.md](implementation-plan.md): meeting-1 → approve → issues created; meeting-2 → conflict callout cites meeting-1; data survives a container restart.

## Keep docs in sync

When you settle an open gap (project-scope.md §4) or an open tech question (techstack.md §8), update that doc instead of recording it only here.
