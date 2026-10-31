import path from "node:path";
import { expect, test } from "@playwright/test";

// Real API + Postgres + Gemini. Writes to the database; approving actions creates real
// GitHub issues, so that only happens when GitHub is off or E2E_ALLOW_GITHUB=1.
// Run against a fresh database: decisions approved by earlier runs would conflict with meeting 1 itself.
const fixture = (name: string) => path.join(import.meta.dirname, "../../../fixtures", name);

test("meeting 2 contradicts a decision approved in meeting 1", async ({ page, request }) => {
  const health = await (await request.get("/api/health")).json();
  test.skip(!health.db || !health.gemini, "Needs the API on :3000 with the DB up and Gemini configured");
  const approveActions = !health.github || process.env.E2E_ALLOW_GITHUB === "1";
  const run = Date.now();

  await page.goto("/");
  const queue = page.getByRole("region", { name: "Review queue" });
  const notice = page.getByRole("banner").getByRole("status");

  // Meeting 1: extract, then approve its decisions (and actions, if allowed).
  await page.getByLabel("Load .txt").setInputFiles(fixture("meeting-1.txt"));
  await page.getByLabel("Meeting title").fill(`E2E meeting 1 ${run}`);
  await page.getByRole("button", { name: "Extract & check conflicts" }).click();
  await expect(notice).toContainText("Extracted", { timeout: 90_000 });

  // The group <div> holding meeting 1's header and rows. `has` also matches the header <div> itself,
  // so require the list too; ancestors still match, and the innermost is last.
  const meeting1 = queue
    .locator("div")
    .filter({ has: page.getByText(`E2E meeting 1 ${run}`, { exact: true }) })
    .filter({ has: page.getByRole("list") })
    .last();
  await expect(meeting1.getByRole("listitem").first()).toBeVisible();
  const approvable = meeting1.getByRole("listitem").filter({ hasText: approveActions ? /DECISION|ACTION/ : "DECISION" });
  // Approved rows leave the queue, so keep approving the first one until none are left.
  for (let n = await approvable.count(); n > 0; n--) {
    await approvable.first().getByRole("button", { name: /^Approve/ }).click();
    await expect(approvable).toHaveCount(n - 1, { timeout: 30_000 });
  }
  await expect(page.getByRole("region", { name: "Memory ledger" })).toContainText(`E2E meeting 1 ${run}`);

  // Meeting 2: the contradiction is flagged and cites meeting 1.
  await page.getByLabel("Load .txt").setInputFiles(fixture("meeting-2.txt"));
  await page.getByLabel("Meeting title").fill(`E2E meeting 2 ${run}`);
  await page.getByRole("button", { name: "Extract & check conflicts" }).click();
  await expect(notice).toContainText(/[1-9]\d* conflicts? flagged/, { timeout: 90_000 });

  const callout = page.getByRole("article", { name: /^Conflict #/ }).filter({ hasText: `E2E meeting 2 ${run}` }).first();
  await expect(callout).toContainText(`E2E meeting 1 ${run}`);
});
