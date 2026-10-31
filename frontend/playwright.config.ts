import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  // Vite only; it proxies /api to the Bun API. Mocked specs never reach it (page.route answers first).
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !CI,
  },
  projects: [
    // Default: real UI, in-memory fake API (e2e/support/fake-api.ts).
    { name: "mocked", testIgnore: "live/**", use: { ...devices["Desktop Chrome"] } },
    // Opt-in: real Bun API + Postgres + Gemini. Start `docker compose up -d db` and `bun run dev` at the repo root first.
    { name: "live", testMatch: "live/**/*.spec.ts", timeout: 180_000, use: { ...devices["Desktop Chrome"] } },
  ],
});
