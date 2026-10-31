import type { Page } from "@playwright/test";
import { expect, makeConflict, makeItem, test } from "./support/fake-api";

const tab = (page: Page, name: string) => page.getByRole("navigation").getByRole("link", { name: new RegExp(name) });
const notice = (page: Page) => page.getByRole("banner").getByRole("status");

test.describe("sidebar routes", () => {
  for (const [name, path, region] of [
    ["Ingestion", "/ingest", "Ingest transcript"],
    ["Review Queue", "/review", "Review queue"],
    ["Memory Ledger", "/memory", "Memory ledger"],
    ["Tracker Dispatch", "/tracker", "Tracker dispatch"],
  ] as const) {
    test(`${name} tab opens ${path} with only its section`, async ({ page }) => {
      await page.goto("/");
      await tab(page, name).click();

      await expect(page).toHaveURL(path);
      await expect(tab(page, name)).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("region", { name: region })).toBeVisible();
      await expect(page.getByRole("main").getByRole("region")).toHaveCount(1);
      await expect(page.getByLabel("Memory corpus")).toBeVisible(); // stats stay on every tab
    });
  }

  test("a tab URL survives a reload", async ({ page, api }) => {
    api.seed(makeItem({ status: "approved", text: "Ship weekly." }));
    await page.goto("/memory");
    await page.reload();

    await expect(page.getByRole("region", { name: "Memory ledger" })).toContainText("Ship weekly.");
    await expect(tab(page, "Memory Ledger")).toHaveAttribute("aria-current", "page");
  });

  test("unknown paths redirect to the overview", async ({ page }) => {
    await page.goto("/nope");
    await expect(page).toHaveURL("/");
    await expect(tab(page, "Overview")).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("region", { name: "Review queue" })).toBeVisible();
  });
});

test("ingest on one tab, approve on another, see it in memory", async ({ page, api }) => {
  api.queueExtraction({ items: [{ type: "decision", text: "Use GitHub Issues as the single tracker.", quote: "Issues only." }] });
  await page.goto("/ingest");

  await page.getByLabel("Meeting title").fill("Tooling Sync");
  await page.getByRole("textbox", { name: "Transcript" }).fill("Priya: Issues only.");
  await page.getByRole("button", { name: "Extract & check conflicts" }).click();
  await expect(notice(page)).toContainText("Extracted 1 item");

  await tab(page, "Review Queue").click();
  await page.getByRole("region", { name: "Review queue" }).getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByRole("region", { name: "Review queue" })).toContainText("Nothing waiting");

  await tab(page, "Memory Ledger").click();
  await expect(page.getByRole("region", { name: "Memory ledger" }).getByRole("row", { name: /single tracker/ })).toBeVisible();
});

test.describe("conflicts tab", () => {
  test("shows an empty state when nothing contradicts memory", async ({ page }) => {
    await page.goto("/conflicts");
    await expect(page.getByRole("region", { name: "Conflict radar" })).toContainText("No open contradictions");
  });

  test("lists callouts and clears them once resolved", async ({ page, api }) => {
    api.seed(makeItem({ text: "Freeze migrations.", conflicts: [makeConflict({ id: 3 })] }));
    await page.goto("/conflicts");

    const callout = page.getByRole("article", { name: "Conflict #3" });
    await expect(callout).toContainText("Freeze migrations.");
    await callout.getByRole("button", { name: "Reject new decision" }).click();

    await expect(page.getByRole("region", { name: "Conflict radar" })).toContainText("No open contradictions");
  });
});
