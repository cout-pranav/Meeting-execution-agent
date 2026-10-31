import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse, makeConflict, makeItem, sentRequest } from "./test/fixtures";
import { renderApp } from "./test/render";
import type { Item } from "./types";

function stubServer(items: Item[], onPost?: (path: string) => Response) {
  const calls: { method: string; path: string }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const { method, path } = await sentRequest(input, init);
    calls.push({ method, path });
    if (method === "POST") return onPost!(path);
    if (path === "/api/health") return jsonResponse({ status: "ok", db: true, gemini: true, github: null });
    if (path === "/api/items") return jsonResponse(items);
    return jsonResponse({ error: "not found" }, 404);
  }));
  return calls;
}

const nav = () => screen.getByRole("navigation");

describe("App", () => {
  it("renders conflicts, the queue and stats from the API", async () => {
    stubServer([
      makeItem({ id: 1, status: "approved", text: "No freezes" }),
      makeItem({ id: 2, text: "Freeze migrations", conflicts: [makeConflict({ id: 9 })] }),
      makeItem({ id: 3, type: "action", text: "Load test", meeting_title: "Launch Readiness" }),
    ]);
    renderApp();

    expect(await screen.findByRole("article", { name: "Conflict #9" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Review queue" })).getByText("Load test")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Pending review")).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Memory corpus")).getByText("1")).toBeInTheDocument();
  });

  it("approving an action without GitHub warns and reloads", async () => {
    const action = makeItem({ id: 5, type: "action", text: "Load test" });
    const calls = stubServer([action], () => jsonResponse({ ...action, status: "approved" }));
    renderApp();

    await userEvent.click(await screen.findByRole("button", { name: /Approve/ }));

    expect(await screen.findByText(/No issue created because GitHub isn't configured/)).toBeInTheDocument();
    expect(calls).toContainEqual({ method: "POST", path: "/api/items/5/approve" });
    expect(calls.filter((c) => c.path === "/api/items")).toHaveLength(2);
  });
});

describe("routing", () => {
  it.each([
    ["/ingest", "Ingestion", "Ingest transcript"],
    ["/review", "Review Queue", "Review queue"],
    ["/memory", "Memory Ledger", "Memory ledger"],
    ["/tracker", "Tracker Dispatch", "Tracker dispatch"],
  ])("%s shows only its section", async (path, tab, region) => {
    stubServer([]);
    renderApp(path);

    expect(await screen.findByRole("region", { name: region })).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(1);
    expect(within(nav()).getByRole("link", { name: new RegExp(tab) })).toHaveAttribute("aria-current", "page");
    // jsdom also counts the panel headers as banners; the page header comes first.
    expect(within(screen.getAllByRole("banner")[0]!).getByText(tab)).toBeInTheDocument();
  });

  it("/conflicts shows only the conflict callouts", async () => {
    stubServer([makeItem({ conflicts: [makeConflict({ id: 4 })] })]);
    renderApp("/conflicts");
    expect(await screen.findByRole("article", { name: "Conflict #4" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Review queue" })).not.toBeInTheDocument();
  });

  it("/conflicts shows an empty state when nothing contradicts memory", async () => {
    stubServer([]);
    renderApp("/conflicts");
    expect(await screen.findByRole("region", { name: "Conflict radar" })).toHaveTextContent("No open contradictions");
  });

  it("navigates between tabs from the sidebar", async () => {
    stubServer([makeItem({ status: "approved", text: "Ship weekly" })]);
    const router = renderApp();

    await userEvent.click(within(nav()).getByRole("link", { name: /Memory Ledger/ }));

    expect(router.state.location.pathname).toBe("/memory");
    expect(await screen.findByRole("region", { name: "Memory ledger" })).toHaveTextContent("Ship weekly");
    expect(screen.queryByRole("region", { name: "Review queue" })).not.toBeInTheDocument();

    await userEvent.click(within(nav()).getByRole("link", { name: /Overview/ }));
    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByRole("region", { name: "Review queue" })).toBeInTheDocument();
  });

  it("redirects unknown paths to the overview", async () => {
    stubServer([]);
    const router = renderApp("/nope");
    expect(await screen.findByRole("region", { name: "Review queue" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });
});
