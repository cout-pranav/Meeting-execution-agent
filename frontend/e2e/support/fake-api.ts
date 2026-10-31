import { test as base, expect, type Page } from "@playwright/test";
import { makeHealth } from "../../src/test/fixtures";
import type { Conflict, Health, Item } from "../../src/types";

export { makeConflict, makeHealth, makeItem } from "../../src/test/fixtures";

/** What the next POST /api/meetings "extracts". `meeting_title` and ids are filled in by the fake. */
export type Extraction = {
  items: Partial<Item>[];
  /** Conflicts for `items[index]`; `item_id` is filled in. */
  conflicts?: { index: number; conflict: Partial<Conflict> }[];
};

type Status = Item["status"] | "rejected";
type Row = Omit<Item, "status"> & { status: Status };
type Logged = { method: string; path: string; body: unknown };

const json = (body: unknown, status = 200) => ({ status, json: body });

/**
 * In-memory stand-in for src/server/index.ts, served through page.route.
 * Keep its behavior (status codes, error messages, filtering, ordering) in step with the real server.
 */
export class FakeApi {
  health: Health = makeHealth();
  readonly requests: Logged[] = [];
  private items: Row[] = [];
  private nextId = 1;
  private nextIssue = 101;
  private extractions: Extraction[] = [];
  private failures: { method: string; path: string; status: number; error: string }[] = [];

  /** Put items straight into the store (ids are assigned when missing). */
  seed(...items: Item[]) {
    for (const i of items) {
      const id = i.id ?? this.nextId;
      this.nextId = Math.max(this.nextId, id + 1);
      this.items.push({ ...i, id, conflicts: i.conflicts.map((c) => ({ ...c, item_id: id })) });
    }
    return this;
  }

  /** Queue the result of the next transcript ingestion (stands in for Gemini). */
  queueExtraction(extraction: Extraction) {
    this.extractions.push(extraction);
    return this;
  }

  /** Make the next matching request fail with `{ error }`, e.g. failNext("POST", "/api/meetings", 502, "Gemini request failed: quota"). */
  failNext(method: string, path: string, status: number, error: string) {
    this.failures.push({ method, path, status, error });
    return this;
  }

  /** Current item by id (rejected ones included), for state assertions. */
  item(id: number) {
    return this.items.find((i) => i.id === id);
  }

  async install(page: Page) {
    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const method = req.method();
      const path = new URL(req.url()).pathname;
      const body = req.postDataJSON() as unknown;
      this.requests.push({ method, path, body });

      const fail = this.failures.findIndex((f) => f.method === method && f.path === path);
      if (fail >= 0) {
        const [f] = this.failures.splice(fail, 1);
        return route.fulfill(json({ error: f!.error }, f!.status));
      }
      return route.fulfill(this.handle(method, path, body));
    });
  }

  private handle(method: string, path: string, body: unknown) {
    if (method === "GET" && path === "/api/health") {
      return json({ ...this.health, uptime: 1 }, this.health.db ? 200 : 503);
    }
    if (method === "GET" && path === "/api/items") {
      return json(this.items.filter((i) => i.status !== "rejected").sort((a, b) => b.id - a.id));
    }
    if (method === "POST" && path === "/api/meetings") return this.ingest(body);

    const m = path.match(/^\/api\/items\/([^/]+)\/(approve|reject)$/);
    if (method === "POST" && m) return this.setStatus(Number(m[1]), m[2] === "approve" ? "approved" : "rejected");

    return json({ error: "Not found" }, 404);
  }

  private ingest(body: unknown) {
    const { title, transcript } = (body ?? {}) as { title?: string; transcript?: string };
    if (!title?.trim() || !transcript?.trim()) return json({ error: "Expected { title, transcript, date? (YYYY-MM-DD) }" }, 400);

    const next = this.extractions.shift() ?? { items: [] };
    const created = next.items.map((partial) => {
      const row: Row = {
        type: "decision", text: "Extracted item", owner: null, deadline: null, quote: "Quoted line.",
        issue_url: null, created_at: new Date().toISOString(), conflicts: [],
        ...partial, id: this.nextId++, meeting_title: title.trim(), status: "pending",
      };
      this.items.push(row);
      return row;
    });
    const conflicts = (next.conflicts ?? []).map(({ index, conflict }, n) => {
      const item = created[index]!;
      const c: Conflict = {
        id: 1000 + n, prior_id: 0, prior_text: "", prior_quote: "", prior_owner: null,
        prior_meeting: "", prior_created_at: new Date().toISOString(), explanation: "",
        ...conflict, item_id: item.id,
      };
      item.conflicts.push(c);
      return c;
    });
    return json({ items: created.map(({ conflicts: _, ...row }) => row), conflicts }, 201);
  }

  private setStatus(id: number, status: "approved" | "rejected") {
    const item = this.items.find((i) => i.id === id);
    if (!item) return json({ error: "Item not found" }, 404);
    if (item.status !== "pending") return json({ error: `Item is already ${item.status}` }, 409);

    item.status = status;
    if (status === "approved" && item.type === "action" && this.health.github) {
      item.issue_url = `https://github.com/${this.health.github}/issues/${this.nextIssue++}`;
    }
    const { conflicts: _, ...row } = item;
    return json(row);
  }
}

/**
 * `test` with a fresh FakeApi installed on the page. Seed or queue on `api` before `page.goto("/")`.
 * `auto` installs it even in tests that don't ask for `api`, so nothing leaks to a real API on :3000.
 */
export const test = base.extend<{ api: FakeApi }>({
  api: [
    async ({ page }, use) => {
      const api = new FakeApi();
      await api.install(page);
      await use(api);
    },
    { auto: true },
  ],
});

export { expect };
