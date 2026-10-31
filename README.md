# 🧠 Meeting Execution Agent

> Turn meeting transcripts into tracked, owned work, and catch decisions that contradict earlier ones.

## 😩 The problem

Decisions made in meetings get lost.

- 🗣️ **Nothing gets captured.** Decisions are said out loud and rarely written down.
- 🤷 **Nobody owns it.** Action items leave the room without an owner or a deadline.
- 💥 **Contradictions go unnoticed.** Today's decision can quietly reverse one from last month.
- 🐟 **Summarizers forget.** A one-off summary has no memory of earlier meetings and doesn't act on anything.

## ✨ What it does

| | Feature |
|---|---|
| ✅ | 🎙️ Reads meeting transcripts and keeps track of who said what |
| ✅ | 📝 Pulls out decisions, action items, owners and deadlines, each with the quote it came from |
| ✅ | 🧠 Remembers decisions across meetings |
| ✅ | ⚠️ Flags new decisions that conflict with earlier ones, citing the meeting and date |
| ✅ | 👀 Lets a person approve or reject each item before anything is posted |
| ✅ | 🐙 Creates a GitHub Issue for each approved action item |
| 🛣️ | ⏰ Deadline reminders and 📬 a weekly digest per person *(planned)* |

> 💡 The cross-meeting memory and the conflict detection are what make this a real system rather than a transcript summarizer.

## 🔄 How it works

```
📄 Transcript  →  🤖 Extract items  →  🧠 Check memory for conflicts  →  👀 You review  →  🐙 GitHub Issue + 💾 saved to memory
```

Nothing is posted until you approve it.

## 🚀 Quick start (Docker)

**🧰 You'll need:**

- 🐳 [Docker](https://www.docker.com/)
- 🔑 A Gemini API key
- 🐙 *(Optional)* A GitHub fine-grained personal access token with **Issues: read/write**

```bash
cp .env.example .env              # fill in GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL, GITHUB_TOKEN, GITHUB_REPO
docker compose up --build
```

Then open:

| What | Where |
|---|---|
| 🖥️ Dashboard | http://localhost:8080 |
| 🔌 API | http://localhost:3000/api |

## 🔑 Environment variables

| Variable | What it's for |
|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Your Gemini API key |
| `GEMINI_MODEL` | Which Gemini model to use |
| `GITHUB_TOKEN` | Fine-grained PAT with Issues read/write *(optional)* |
| `GITHUB_REPO` | Where issues are created, as `owner/repo` *(optional)* |
| `DATABASE_URL` | Postgres connection string (Docker Compose sets this for you) |
| `PORT` | API port, `3000` by default |

> ℹ️ If `GITHUB_TOKEN`/`GITHUB_REPO` are unset, approving an action item still works but creates no issue.

## 🗂️ Project layout

The project has two parts:

- ⚙️ **Bun API**: in the repo root ([`src/server/`](src/server/))
- 🎨 **React frontend**: in [`frontend/`](frontend/) (Vite; served by nginx in Docker)

## 🛠️ Local development

Requires [Bun](https://bun.sh). Use two terminals.

**Terminal 1: database + API**

```bash
docker compose up -d db
bun install && bun run dev                    # API on :3000
```

**Terminal 2: dashboard**

```bash
cd frontend && bun install && bun run dev     # dashboard on http://localhost:5173 (proxies /api → :3000)
```

## 🧪 Running tests

```bash
cd frontend && bun run test       # component + unit tests (Vitest, no server needed)
bun test                          # API health checks (needs the API running)
```

## 🎬 Try the demo

1. 📄 Load [`fixtures/meeting-1.txt`](fixtures/meeting-1.txt) with the title **"Platform Sync"**, then click **Extract & check conflicts**.
2. ✅ Review the extracted decisions and action items (each shows its source quote) and approve them. Action items become GitHub Issues.
3. 📄 Load [`fixtures/meeting-2.txt`](fixtures/meeting-2.txt) with the title **"Launch Readiness"**.
4. ⚠️ The migration-freeze decision is flagged as a **contradiction** of the earlier "no migration freezes" decision, citing the meeting and date it came from.
5. 🔁 Restart with `docker compose restart`. Everything is still there.

## 📡 API reference

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/api/meetings` | Submit a meeting transcript for extraction |
| `GET` | `/api/items` | List extracted decisions and action items |
| `POST` | `/api/items/:id/approve` | Approve an item |
| `POST` | `/api/items/:id/reject` | Reject an item |
| `GET` | `/api/health` | Health check |
