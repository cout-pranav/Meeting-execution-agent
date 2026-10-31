# Implementation Plan — 2-Hour MVP

Related docs: [project-scope.md](project-scope.md) · [techstack.md](techstack.md)

**Constraint:** 2 hours, one person (working with Claude Code), and the result must be deployed with Docker.
**Goal:** the smallest build that still shows the differentiator, **cross-meeting memory + conflict detection**.

## Demo Story

1. Paste **meeting 1**'s transcript. The app extracts decisions and action items, each with owner, deadline and source quote.
2. **Approve** them. Decisions go into memory, and action items become **GitHub Issues**.
3. Paste **meeting 2**, which contradicts a meeting 1 decision. The app flags a **conflict** and cites the earlier decision.

## Scope

### Kept

| Feature | MVP version |
|---|---|
| F1 Ingestion | Paste or upload a TXT transcript in `Speaker: text` format |
| F2 Extraction | Gemini Flash via the AI SDK: `generateText` + `Output.object` with a Zod schema |
| F3 Memory | Approved decisions are stored in Postgres |
| F4 Conflict detection | One Gemini call compares each new decision with **all prior approved decisions passed in the prompt**. Demo-sized data fits in the prompt, so pgvector isn't needed. |
| F5 Confirmation | A web page with approve / reject on each item |
| F6 GitHub Issues | Approving an action item creates an issue via Octokit, with the deadline in the body |
| Deploy | Dockerfile + docker-compose (app + Postgres) |

### Simplified stack

- **Bun** with `Bun.serve`: an HTML import for the React page, plus the `/api/*` routes
- **React + Tailwind** (`bun-plugin-tailwind`), with a few shadcn/ui components if they install quickly
- **AI:** `ai` + `@ai-sdk/google` + `zod`
- **GitHub:** `@octokit/rest`
- **DB:** `Bun.sql` against Postgres, with `CREATE TABLE IF NOT EXISTS` on boot (no ORM or migrations)

## Files

```
Meeting-execution-agent/
├── package.json
├── bunfig.toml              # Tailwind plugin
├── .env.example
├── src/
│   ├── server/
│   │   ├── index.ts         # Bun.serve routes + DB bootstrap
│   │   ├── ai.ts            # extractItems(), findConflicts()
│   │   └── github.ts        # createIssue()
│   └── web/
│       ├── index.html
│       └── App.tsx          # single page
├── fixtures/
│   ├── meeting-1.txt
│   └── meeting-2.txt        # contains the planted conflict
├── Dockerfile
└── docker-compose.yml
```

### Database (2 tables)

- `items`: id, meeting_title, type (`decision` | `action`), text, owner, deadline, quote, status (`pending` | `approved` | `rejected`), issue_url, created_at
- `conflicts`: id, item_id, prior_item_id, explanation

### API

| Method | Route | Does |
|---|---|---|
| `POST` | `/api/meetings` | `{title, transcript}` → extract → check conflicts → store items as pending → return items + conflicts |
| `GET` | `/api/items` | All items, with their conflicts attached |
| `POST` | `/api/items/:id/approve` | Marks the item approved. If it's an action, creates a GitHub Issue. |
| `POST` | `/api/items/:id/reject` | Marks the item rejected |
| `GET` | `/api/health` | Health check |

### Environment variables

`DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL`, `GITHUB_TOKEN`, `GITHUB_REPO` (`owner/repo`)

## Timeboxed Tasks

| Time | Task | Done when |
|---|---|---|
| 0:00–0:15 | **T1 Setup:** `bun init`, install deps, `.env`, `docker compose up -d db`, `Bun.serve` serving the React page + `/api/health` | Page loads; DB connects |
| 0:15–0:45 | **T2 Extraction:** Zod schema, Gemini prompt, `POST /api/meetings` storing pending items. Write the two fixtures. | Meeting 1 returns sensible items with quotes |
| 0:45–1:05 | **T3 Conflict detection:** pass the prior approved decisions to Gemini and store the conflicts it finds | Meeting 2 flags the planted conflict |
| 1:05–1:15 | **T4 Approve + GitHub:** approve/reject routes; approving an action creates an issue | A real issue appears in the demo repo |
| 1:15–1:40 | **T5 UI:** a quick `frontend-design` skill pass for visual direction. Textarea + submit; item cards (quote, owner, deadline, approve/reject); a conflict callout citing the earlier decision | Full demo flow works in the browser |
| 1:40–1:55 | **T6 Docker deploy:** multi-stage Dockerfile (`oven/bun`), compose `app` + `db` (with a volume), `docker compose up --build` | Demo works from the container |
| 1:55–2:00 | **T7 README:** run steps + demo script | Done |

### If running late

1. Drop the shadcn components and use plain Tailwind.
2. Drop T4: show "would create issue" instead of calling GitHub.
3. **Never drop T3.** Conflict detection is the demo.

## Prerequisites (have these ready before the clock starts)

- Bun installed and Docker running
- A Gemini API key
- A GitHub fine-grained PAT with Issues read/write on a demo repo

## Verification

1. `docker compose up --build`, then open the app.
2. Submit `fixtures/meeting-1.txt` and approve the items. GitHub Issues are created.
3. Submit `fixtures/meeting-2.txt`. The conflicting decision shows a callout that cites the meeting 1 decision.
4. Restart the containers. The data is still there (Postgres volume).

## Deferred (post-MVP)

These come back from [project-scope.md](project-scope.md) and [techstack.md](techstack.md) after the hackathon:

- **F7 / F8:** Slack deadline reminders and the weekly digest, with `Bun.cron`
- VTT / SRT parsing; the participant roster and speaker → Slack/GitHub identity mapping
- Shared-password dashboard auth
- Drizzle ORM + migrations; pgvector embeddings for memory search at scale
- React Router (multi-page), TanStack Query, editing items, a conflict-resolution workflow (supersede / keep both / escalate)
- Stretch: syncing issue status back from GitHub, a "what did we decide about X?" query
