import path from "node:path";
import { expect, test } from "@playwright/test";

// Real API + Postgres + Gemini + GitHub. Approving the action creates a real issue in GITHUB_REPO,
// so this only runs with E2E_ALLOW_GITHUB=1. Pass GITHUB_TOKEN to Playwright too (it doesn't read .env)
// to check the issue on GitHub and close it afterwards.
const fixture = (name: string) => path.join(import.meta.dirname, "../../../fixtures", name);
const token = process.env.GITHUB_TOKEN;

test("approving an action creates a real GitHub issue", async ({ page, request }) => {
  const health = await (await request.get("/api/health")).json();
  test.skip(!health.db || !health.gemini || !health.github, "Needs the API on :3000 with the DB, Gemini and GitHub configured");
  test.skip(process.env.E2E_ALLOW_GITHUB !== "1", "Creates a real GitHub issue; set E2E_ALLOW_GITHUB=1");
  const repo: string = health.github;
  const title = `E2E github ${Date.now()}`;

  await page.goto("/");
  const queue = page.getByRole("region", { name: "Review queue" });
  const notice = page.getByRole("banner").getByRole("status");

  await page.getByLabel("Load .txt").setInputFiles(fixture("meeting-1.txt"));
  await page.getByLabel("Meeting title").fill(title);
  await page.getByRole("button", { name: "Extract & check conflicts" }).click();
  await expect(notice).toContainText("Extracted", { timeout: 90_000 });

  // This run's group in the queue (see meeting-flow.spec.ts for why `.last()`), then its first action.
  const meeting = queue
    .locator("div")
    .filter({ has: page.getByText(title, { exact: true }) })
    .filter({ has: page.getByRole("list") })
    .last();
  const actions = meeting.getByRole("listitem").filter({ hasText: "ACTION" });
  await expect(actions.first()).toBeVisible();
  const before = await actions.count();

  // Approve only one action, to keep real issues to one per run.
  await actions.first().getByRole("button", { name: "Approve & create issue" }).click();
  await expect(notice).toContainText(/GitHub issue #\d+ created/, { timeout: 30_000 });
  await expect(actions).toHaveCount(before - 1);
  const number = (await notice.textContent())!.match(/#(\d+)/)![1];
  const url = `https://github.com/${repo}/issues/${number}`;

  const api = `https://api.github.com/repos/${repo}/issues/${number}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
  try {
    // `has` is relative to the row, so the link locator must not start from the page.
    const row = page.getByRole("region", { name: "Tracker dispatch" }).getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: `#${number}` }) });
    await expect(row.getByRole("link")).toHaveAttribute("href", url);
    // Row layout: <div> (text, then owner · deadline) and the issue link.
    const actionText = (await row.locator("div").nth(1).textContent())!.trim();

    if (!token) {
      test.info().annotations.push({ type: "skipped", description: `GITHUB_TOKEN not in env: did not check or close ${url}` });
      return;
    }
    const res = await request.get(api, { headers });
    expect(res.ok()).toBe(true);
    const issue = await res.json();
    expect(issue).toMatchObject({ state: "open", html_url: url, title: actionText.slice(0, 250) });
    expect(issue.body).toContain(`**Meeting:** ${title}`);
    expect(issue.body).toContain("Created by Meeting Execution Agent");
  } finally {
    if (token) await request.patch(api, { headers, data: { state: "closed", state_reason: "not_planned" } });
  }
});
