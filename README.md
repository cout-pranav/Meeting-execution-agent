# Meeting-execution-agent
Decisions made in meetings get lost.

Teams must build:
transcript ingestion with speaker attribution;
extraction of decisions, action items, owners, and deadlines;
detection of conflicts with earlier decisions stored in memory;
creation of tasks in a tracker through an integration;
reminders before deadlines;
a weekly digest per person;
a confirmation step before anything gets posted.

The cross-meeting memory and the conflict detection are what make this a real system rather than a transcript summarizer.

## Run it

Needs Docker, plus a Gemini API key. A GitHub fine-grained PAT with Issues read/write is optional.

```bash
cp .env.example .env              # fill in GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL, GITHUB_TOKEN, GITHUB_REPO
docker compose up --build         # app + Postgres → http://localhost:3000
```

Local development (requires [Bun](https://bun.sh)):

```bash
docker compose up -d db
bun install
bun run dev                       # http://localhost:3000 with hot reload
```

If `GITHUB_TOKEN`/`GITHUB_REPO` are unset, approving an action item still works but creates no issue.

## Demo

1. Load `fixtures/meeting-1.txt` (title "Platform Sync") → **Extract & check conflicts**. Review the extracted decisions and action items, each with its source quote, and approve them. Action items become GitHub Issues.
2. Load `fixtures/meeting-2.txt` (title "Launch Readiness"). The migration-freeze decision is flagged as a **contradiction** of the earlier "no migration freezes" decision, citing the meeting and date it came from.
3. Restart with `docker compose restart`. Everything is still there.

API: `POST /api/meetings` · `GET /api/items` · `POST /api/items/:id/approve` · `POST /api/items/:id/reject` · `GET /api/health`
