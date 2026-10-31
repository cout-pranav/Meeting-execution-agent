import { expect, makeItem, test } from "./support/fake-api";

const notice = (page: import("@playwright/test").Page) => page.getByRole("banner").getByRole("status");

test.describe("dashboard", () => {
  test("shows empty panels and service health", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Database connected")).toBeVisible();
    await expect(page.getByText("Gemini ready")).toBeVisible();
    await expect(page.getByRole("region", { name: "Review queue" })).toContainText("Nothing waiting");
    await expect(page.getByRole("region", { name: "Memory ledger" })).toContainText("Approved decisions are stored here");
  });

  test("warns when Gemini isn't configured", async ({ page, api }) => {
    api.health = { ...api.health, gemini: false };
    await page.goto("/");

    await expect(page.getByText("Gemini not configured")).toBeVisible();
    await expect(page.getByRole("region", { name: "Ingest transcript" }).getByRole("status")).toContainText("GOOGLE_GENERATIVE_AI_API_KEY");
  });
});

test.describe("ingest → review → approve", () => {
  test("extracts items into the review queue", async ({ page, api }) => {
    api.queueExtraction({
      items: [
        { type: "decision", text: "Launch v2.4 on December 12.", quote: "We're targeting December 12." },
        { type: "action", text: "Finish the billing API.", owner: "Marcus", deadline: "2026-11-28", quote: "I'll have it done by November 28." },
      ],
    });
    await page.goto("/");

    await page.getByLabel("Meeting title").fill("Launch Sync");
    await page.getByRole("textbox", { name: "Transcript" }).fill("Priya: Let's decide the launch date.\nMarcus: December 12 works.");
    await page.getByRole("button", { name: "Extract & check conflicts" }).click();

    await expect(notice(page)).toContainText("Extracted 2 items · 0 conflicts flagged");
    const queue = page.getByRole("region", { name: "Review queue" });
    await expect(queue.getByRole("listitem")).toHaveCount(2);
    await expect(queue).toContainText("Launch Sync");
    await expect(queue).toContainText("“I'll have it done by November 28.”");
    await expect(page.getByRole("textbox", { name: "Transcript" })).toHaveValue("");
    expect(api.requests.find((r) => r.path === "/api/meetings")?.body).toMatchObject({ title: "Launch Sync" });
  });

  test("approving an action creates a GitHub issue", async ({ page, api }) => {
    api.seed(makeItem({ type: "action", text: "Write the launch checklist.", owner: "Elena", deadline: "2026-11-06" }));
    await page.goto("/");

    const row = page.getByRole("listitem").filter({ hasText: "Write the launch checklist." });
    await row.getByRole("button", { name: "Approve & create issue" }).click();

    await expect(notice(page)).toContainText("GitHub issue #101 created");
    await expect(page.getByRole("region", { name: "Review queue" })).toContainText("Nothing waiting");
    await expect(page.getByRole("region", { name: "Tracker dispatch" }).getByRole("link", { name: "#101" }))
      .toHaveAttribute("href", "https://github.com/acme/repo/issues/101");
  });

  test("approving a decision stores it in the memory ledger", async ({ page, api }) => {
    api.seed(makeItem({ text: "Use GitHub Issues as the single tracker." }));
    await page.goto("/");

    await page.getByRole("button", { name: "Approve", exact: true }).click();

    await expect(page.getByRole("region", { name: "Memory ledger" }).getByRole("row", { name: /single tracker/ })).toBeVisible();
    await expect(page.getByLabel("Memory corpus")).toContainText("1");
  });

  test("rejecting removes the item", async ({ page, api }) => {
    api.seed(makeItem({ text: "Freeze all migrations." }));
    await page.goto("/");

    await page.getByRole("button", { name: "Reject" }).click();

    await expect(page.getByText("Freeze all migrations.")).toBeHidden();
    await expect(page.getByRole("region", { name: "Review queue" })).toContainText("Nothing waiting");
  });
});

test.describe("conflict detection", () => {
  test("flags a new decision that contradicts memory", async ({ page, api }) => {
    const prior = makeItem({
      text: "No migration freezes.", quote: "We don't do migration freezes.", status: "approved",
      meeting_title: "Platform Sync", created_at: "2026-10-20T10:00:00.000Z",
    });
    api.seed(prior).queueExtraction({
      items: [{ type: "decision", text: "Freeze migrations two weeks before launch.", quote: "Let's freeze migrations." }],
      conflicts: [{
        index: 0,
        conflict: {
          prior_id: prior.id, prior_text: prior.text, prior_quote: prior.quote, prior_owner: prior.owner,
          prior_meeting: prior.meeting_title, prior_created_at: prior.created_at,
          explanation: "Reverses the no-freeze decision.",
        },
      }],
    });
    await page.goto("/");

    await page.getByLabel("Meeting title").fill("Launch Readiness");
    await page.getByRole("textbox", { name: "Transcript" }).fill("Marcus: Let's freeze migrations.");
    await page.getByRole("button", { name: "Extract & check conflicts" }).click();

    const callout = page.getByRole("article", { name: /^Conflict #/ });
    await expect(callout).toContainText("Freeze migrations two weeks before launch.");
    await expect(callout).toContainText("Platform Sync");
    await expect(callout).toContainText(`Decision #${prior.id}: No migration freezes.`);
    await expect(callout).toContainText("Reverses the no-freeze decision.");
    await expect(page.getByLabel("Drift / Alert pulse")).toContainText("1");

    await callout.getByRole("button", { name: "Reject new decision" }).click();
    await expect(callout).toBeHidden();
  });
});

test.describe("errors and uploads", () => {
  test("shows the server error when extraction fails", async ({ page, api }) => {
    api.failNext("POST", "/api/meetings", 502, "Gemini request failed: quota exceeded");
    await page.goto("/");

    await page.getByLabel("Meeting title").fill("Sync");
    await page.getByRole("textbox", { name: "Transcript" }).fill("Priya: Hi.");
    await page.getByRole("button", { name: "Extract & check conflicts" }).click();

    await expect(page.getByRole("alert")).toHaveText("Gemini request failed: quota exceeded");
    await expect(page.getByRole("textbox", { name: "Transcript" })).toHaveValue("Priya: Hi.");
  });

  test("loads a .txt transcript and derives the title", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Load .txt").setInputFiles({
      name: "weekly-sync_notes.txt", mimeType: "text/plain", buffer: Buffer.from("Priya: Ship it.\nMarcus: Agreed."),
    });

    await expect(page.getByLabel("Meeting title")).toHaveValue("weekly sync notes");
    await expect(page.getByRole("textbox", { name: "Transcript" })).toHaveValue("Priya: Ship it.\nMarcus: Agreed.");
  });
});
