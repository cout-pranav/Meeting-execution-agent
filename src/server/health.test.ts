import { expect, test } from "bun:test";

// Runs against a live API: `bun run dev` (or docker compose), then `bun test`.
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test("GET /api/health reports the server and database as up", async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  expect(res.status).toBe(200);

  const body = (await res.json()) as { gemini: unknown; uptime: unknown };
  expect(body).toMatchObject({ status: "ok", db: true });
  expect(typeof body.gemini).toBe("boolean");
  expect(typeof body.uptime).toBe("number");
});

test("the API does not serve the dashboard", async () => {
  const res = await fetch(BASE_URL);
  expect(res.status).toBe(404);
});
