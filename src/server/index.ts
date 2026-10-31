import { sql } from "bun";
import { z } from "zod";
import { extractItems, findConflicts, type PriorDecision } from "./ai";
import { createIssue, githubConfigured } from "./github";

await sql`
  CREATE TABLE IF NOT EXISTS items (
    id            SERIAL PRIMARY KEY,
    meeting_title TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('decision', 'action')),
    text          TEXT NOT NULL,
    owner         TEXT,
    deadline      TEXT,
    quote         TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    issue_url     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS conflicts (
    id            SERIAL PRIMARY KEY,
    item_id       INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    prior_item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    explanation   TEXT NOT NULL
  )`;

const MeetingInput = z.object({
  title: z.string().trim().min(1),
  transcript: z.string().trim().min(1),
  date: z.iso.date().optional(),
});

const error = (message: string, status: number) => Response.json({ error: message }, { status });

async function setStatus(id: number, status: "approved" | "rejected") {
  if (!Number.isInteger(id)) return error("Item not found", 404);
  const [item] = await sql`SELECT * FROM items WHERE id = ${id}`;
  if (!item) return error("Item not found", 404);
  if (item.status !== "pending") return error(`Item is already ${item.status}`, 409);

  let issueUrl: string | null = null;
  if (status === "approved" && item.type === "action") {
    try {
      issueUrl = await createIssue(item);
    } catch (e) {
      return error(`GitHub issue creation failed: ${(e as Error).message}`, 502);
    }
  }
  const [updated] = await sql`
    UPDATE items SET status = ${status}, issue_url = ${issueUrl}
    WHERE id = ${id} RETURNING *`;
  return Response.json(updated);
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),

  routes: {
    "/api/health": {
      async GET() {
        const db = await sql`SELECT 1`.then(() => true, () => false);
        return Response.json(
          {
            status: db ? "ok" : "degraded",
            db,
            gemini: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_MODEL),
            github: githubConfigured() ? process.env.GITHUB_REPO : null,
            uptime: Math.round(process.uptime()),
          },
          { status: db ? 200 : 503 },
        );
      },
    },

    "/api/meetings": {
      async POST(req) {
        const parsed = MeetingInput.safeParse(await req.json().catch(() => null));
        if (!parsed.success) return error("Expected { title, transcript, date? (YYYY-MM-DD) }", 400);
        const { title, transcript } = parsed.data;
        const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

        let extracted, found;
        const prior = await sql<PriorDecision[]>`
          SELECT id, text, meeting_title, created_at FROM items
          WHERE type = 'decision' AND status = 'approved' ORDER BY id`;
        try {
          extracted = await extractItems(transcript, date);
          const decisions = extracted.filter((i) => i.type === "decision");
          found = await findConflicts(decisions.map((d) => d.text), prior);
          // Map conflict indexes (into the decision list) back to indexes in `extracted`.
          found = found.map((c) => ({ ...c, newIndex: extracted!.indexOf(decisions[c.newIndex]!) }));
        } catch (e) {
          return error(`Gemini request failed: ${(e as Error).message}`, 502);
        }

        const result = await sql.begin(async (tx) => {
          const items = [];
          for (const i of extracted) {
            const [row] = await tx`
              INSERT INTO items (meeting_title, type, text, owner, deadline, quote)
              VALUES (${title}, ${i.type}, ${i.text}, ${i.owner}, ${i.deadline}, ${i.quote})
              RETURNING *`;
            items.push(row);
          }
          const conflicts = [];
          for (const c of found) {
            const [row] = await tx`
              INSERT INTO conflicts (item_id, prior_item_id, explanation)
              VALUES (${items[c.newIndex].id}, ${c.priorId}, ${c.explanation})
              RETURNING *`;
            conflicts.push(row);
          }
          return { items, conflicts };
        });
        return Response.json(result, { status: 201 });
      },
    },

    "/api/items": {
      async GET() {
        const items = await sql`SELECT * FROM items WHERE status <> 'rejected' ORDER BY id DESC`;
        const conflicts = await sql`
          SELECT c.id, c.item_id, c.explanation,
                 p.id AS prior_id, p.text AS prior_text, p.quote AS prior_quote,
                 p.owner AS prior_owner, p.meeting_title AS prior_meeting, p.created_at AS prior_created_at
          FROM conflicts c JOIN items p ON p.id = c.prior_item_id`;
        return Response.json(
          items.map((item: { id: number }) => ({
            ...item,
            conflicts: conflicts.filter((c: { item_id: number }) => c.item_id === item.id),
          })),
        );
      },
    },

    "/api/items/:id/approve": { POST: (req) => setStatus(Number(req.params.id), "approved") },
    "/api/items/:id/reject": { POST: (req) => setStatus(Number(req.params.id), "rejected") },
  },

  error(e) {
    console.error(e);
    return error(e.message, 500);
  },
});

console.log(`Meeting Execution Agent API running at ${server.url}api`);
