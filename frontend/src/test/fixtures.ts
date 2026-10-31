import type { Conflict, Health, Item } from "../types";

let nextId = 1;

export function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: nextId++,
    meeting_title: "Platform Sync",
    type: "decision",
    text: "Ship schema migrations continuously.",
    owner: "Elena Rostova",
    deadline: null,
    quote: "We ship schema migrations continuously.",
    status: "pending",
    issue_url: null,
    created_at: "2026-10-20T10:00:00.000Z",
    conflicts: [],
    ...overrides,
  };
}

export function makeConflict(overrides: Partial<Conflict> = {}): Conflict {
  return {
    id: 7,
    item_id: 2,
    explanation: "Reverses the no-freeze decision.",
    prior_id: 1,
    prior_text: "No migration freezes.",
    prior_quote: "We don't do migration freezes.",
    prior_owner: "Marcus",
    prior_meeting: "Platform Sync",
    prior_created_at: "2026-10-20T10:00:00.000Z",
    ...overrides,
  };
}

export function makeHealth(overrides: Partial<Health> = {}): Health {
  return { status: "ok", db: true, gemini: true, github: "acme/repo", ...overrides };
}

/** A JSON Response for stubbing fetch. */
export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** What a stubbed fetch was called with. Axios passes a Request (plus init), so normalize it. */
export async function sentRequest(input: RequestInfo | URL, init?: RequestInit) {
  const req = new Request(input, init);
  const body = await req.text();
  return { path: new URL(req.url).pathname, method: req.method, body: body ? JSON.parse(body) : undefined };
}
