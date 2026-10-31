# Tech Stack — Meeting Execution Agent

Scope and features are in [project-scope.md](project-scope.md).

## 1. Overview & Architecture

One TypeScript repo with **two projects**. A **Bun process** runs the REST API and the scheduled jobs. It talks to Postgres + pgvector, the Gemini API (through the AI SDK), the GitHub API and the Slack API. The React dashboard is a **separate Vite project** (`frontend/`), not served by Bun: Vite serves it in dev and nginx in Docker, and both proxy `/api` to the Bun process.

> **Decision (2026-10-31):** the frontend was split out of the Bun process. The diagram and project tree below still show the earlier single-process layout for `/*`; read `"/*" → React SPA` as served by nginx/Vite, and `src/web/` as `frontend/src/`.

```
                ┌──────────────────────────── Bun process (Bun.serve) ─────────────────────────────┐
                │                                                                                   │
 Browser ──────►│  "/*"      → React SPA (HTML import, React Router, shadcn/ui + Tailwind)          │
 (dashboard)    │  "/api/*"  → REST routes ──► services:                                            │
                │                 ingest → extract → memory/conflicts → approval → github           │
                │                                                                                   │
                │  Bun.cron  → reminder scan (hourly) · weekly digest (per-user tz) ──► slack       │
                └───────┬───────────────────────┬────────────────────────┬───────────────┬──────────┘
                        │                       │                        │               │
                        ▼                       ▼                        ▼               ▼
              Postgres + pgvector        Gemini API (AI SDK)      GitHub Issues     Slack Web API
              (data + decision memory)   Flash + embeddings       (Octokit)         (DM reminders/digest)
```

**Flow:** upload transcript in the dashboard → parse and map speakers → Gemini extracts items → embed decisions and search memory for conflicts → a person approves, edits or rejects in the dashboard → create GitHub Issues and save decisions to memory → `Bun.cron` sends Slack reminders and digests.

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime, package manager, bundler, test runner | **Bun** (`bun install`, `bun --hot`, `bun build`, `bun test`) | One tool for everything. Fast. Native TypeScript. |
| Frontend | **React + TypeScript**, built with **Vite** in `frontend/` | Required. A separate project: Vite dev server with an `/api` proxy, and static `dist/` served by **nginx** in Docker. |
| Client routing | **React Router** (declarative / data mode, SPA) | Routing for the dashboard pages. |
| Server state | **TanStack Query** | Caching, refetching, and mutation state for approve/edit/reject. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Utility-first. Design tokens live in `@theme`. |
| Components | **shadcn/ui** (copied into `src/web/components/ui`) | Accessible primitives (Radix) that we own and can restyle. |
| UI design workflow | **Claude Code `frontend-design` skill** | Sets the dashboard's visual direction, typography and layout so it doesn't look like a template. Built with shadcn/ui + Tailwind. |
| Forms & validation | **React Hook Form + Zod** | The Zod schemas live in `src/shared` and are used by both frontend and backend. |
| Backend HTTP | **`Bun.serve` `routes`** (no framework) | Built-in router with `:params` and per-method handlers. A few small helpers handle JSON responses, errors and Zod validation. |
| Database | **PostgreSQL 16+ with pgvector** | Relational data and vector search in one database. |
| ORM & migrations | **Drizzle ORM** (`bun-sql` driver) + **drizzle-kit** | Type-safe schema. Native `vector()` column, HNSW index and `cosineDistance()`. |
| LLM | **Gemini Flash** via **AI SDK** (`ai`, `@ai-sdk/google`) | Fast and cheap. The AI SDK keeps us provider-agnostic. The model ID comes from `GEMINI_MODEL`. |
| Structured output | AI SDK `generateText` + `Output.object({ schema })` (Zod) | Typed, schema-validated extraction. |
| Embeddings | `google.embedding('gemini-embedding-001')` via AI SDK `embed` / `embedMany` | `outputDimensionality: 768` matches a `vector(768)` column. Uses `taskType: 'SEMANTIC_SIMILARITY'`. |
| Tracker | **GitHub Issues** via **Octokit** (`@octokit/rest`) | Fine-grained personal access token scoped to the target repo(s). |
| Notifications | **Slack Web API** (`@slack/web-api`) | `chat.postMessage` DMs from a bot token. Approval happens in the dashboard, so Bolt and interactivity aren't needed. |
| Scheduler | **`Bun.cron`** (in-process) | Hourly scan for reminders. Weekly digest, with the `tz` option for timezones. |
| Transcript parsing | Small hand-written VTT / SRT / TXT parser | The formats are simple, so no dependency is needed. |
| Testing | **`bun test`** (API) · **Vitest + Testing Library + jsdom** (frontend) | Unit tests for the parsers and services; component tests for every dashboard section. Fixture transcripts include a planted conflict. |
| Lint & format | **Biome** | One fast tool for both. |
| Deployment | **Docker** (multi-stage Dockerfile + docker-compose) | One reproducible setup for the app and Postgres. |

## 3. Project Structure

```
Meeting-execution-agent/
├── src/
│   ├── server/
│   │   ├── index.ts            # Bun.serve: SPA HTML import + /api routes + cron registration
│   │   ├── routes/             # meetings, items, decisions, conflicts, participants
│   │   ├── services/
│   │   │   ├── ingest.ts       # VTT/SRT/TXT parsing, speaker → participant mapping
│   │   │   ├── extract.ts      # Gemini structured extraction
│   │   │   ├── memory.ts       # embeddings + pgvector search
│   │   │   ├── conflicts.ts    # candidate retrieval + LLM conflict classification
│   │   │   ├── github.ts       # Octokit issue creation
│   │   │   ├── slack.ts        # reminder + digest DMs
│   │   │   └── scheduler.ts    # Bun.cron jobs
│   │   └── lib/                # json/error/validation helpers, env
│   ├── web/
│   │   ├── index.html          # HTML import entry
│   │   ├── main.tsx            # React root + React Router
│   │   ├── pages/              # Upload, Review queue, Meeting detail, Decisions/Memory, Conflicts, Roster
│   │   └── components/ui/      # shadcn/ui components
│   ├── shared/                 # Zod schemas + shared types
│   └── db/
│       ├── schema.ts           # Drizzle schema
│       └── migrations/
├── fixtures/transcripts/       # sample meetings (with a planted conflict)
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── drizzle.config.ts
```

## 4. Data Model (initial)

| Table | Key columns |
|---|---|
| `participants` | id, display_name, aliases[], slack_user_id, github_username, timezone |
| `meetings` | id, title, held_at, team/project scope, raw_transcript, source_format |
| `utterances` | id, meeting_id, participant_id, speaker_label, start_ms, text |
| `extracted_items` | id, meeting_id, type (`decision` \| `action`), text, owner_id, deadline, source_quote, confidence, status (`pending` \| `approved` \| `edited` \| `rejected`) |
| `decisions` | id, item_id, meeting_id, text, topic, embedding `vector(768)`, superseded_by |
| `conflicts` | id, new_decision_id, prior_decision_id, kind (reversal / parameter change / scope), explanation, resolution (`supersede` \| `keep_both` \| `escalate` \| null) |
| `issues` | id, item_id, repo, github_number, url, state |
| `reminders_sent` | id, item_id, kind (`reminder` \| `digest`), sent_at — prevents duplicate sends |

Index: HNSW on `decisions.embedding` using `vector_cosine_ops`.

## 5. AI Pipeline

1. **Extract.** `generateText` with Gemini Flash and `Output.object` using a Zod schema. It returns decisions and action items, each with owner, deadline (relative dates resolved against `meetings.held_at`), `source_quote` and `confidence`. Items without a supporting quote are dropped.
2. **Embed.** `embedMany` over the new decisions.
3. **Retrieve.** pgvector top-k (e.g. k = 5) cosine search over approved, non-superseded decisions in the same team/project scope, above a similarity threshold.
4. **Classify.** A second Gemini call per candidate pair returns `{ isConflict, kind, explanation }`.
5. **Queue.** Items and conflicts are saved as `pending` and appear in the dashboard review queue. Nothing reaches GitHub, Slack or memory until a person approves it.

## 6. Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key (read by `@ai-sdk/google`) |
| `GEMINI_MODEL` | Gemini Flash model ID |
| `GEMINI_EMBEDDING_MODEL` | Defaults to `gemini-embedding-001` |
| `GITHUB_TOKEN` | Fine-grained PAT with Issues read/write |
| `GITHUB_DEFAULT_REPO` | `owner/repo` that issues go to |
| `SLACK_BOT_TOKEN` | Bot token with `chat:write` and `im:write` |
| `APP_TZ` | Default timezone for the cron jobs |

## 7. Local Development & Deployment (Docker)

### Local development
```bash
docker compose up -d db          # Postgres with pgvector
bun install
bun run db:migrate               # drizzle-kit migrate
bun --hot src/server/index.ts    # API + React with HMR
```

### Deployment
- **Dockerfile** (multi-stage, official `oven/bun` image):
  - The *build* stage runs `bun install --frozen-lockfile`, then `bun build --target=bun`. This pre-bundles the React SPA so nothing is bundled at runtime.
  - The *runtime* stage is a slim image containing only the build output, and runs the server.
- **docker-compose.yml** has two services:
  - `db`: the `pgvector/pgvector` image, a named volume for data, and a healthcheck.
  - `app`: the Bun server. It depends on `db` being healthy, runs migrations on start, and exposes the HTTP port.
- **Secrets:** an `.env` file loaded with `env_file` and gitignored. Commit `.env.example`.
- **Hosts:** the same image and compose file run on a laptop for the demo, on a cloud VM, or on a platform that accepts Dockerfiles (Railway, Render, Fly.io).

## 8. Open Tech Questions

- **Dashboard auth:** no auth or a shared password for the demo, versus GitHub OAuth. This ties into project-scope G6 (who confirms).
- **Gemini model and limits:** the exact Gemini Flash model ID, and whether free-tier rate limits are enough for the demo.
- **Embedding dimension:** 768, 1536 or 3072. A smaller dimension is cheaper and faster. Once chosen, it's fixed in the `vector(n)` column.
- **Docker host:** a local machine for the demo, a cloud VM, or a PaaS.
- **In-process cron:** `Bun.cron` doesn't run while the app is down. Reminder and digest jobs should be idempotent catch-up scans tracked through `reminders_sent`.
