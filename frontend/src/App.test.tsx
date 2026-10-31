import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { jsonResponse, makeConflict, makeItem } from "./test/fixtures";
import type { Item } from "./types";

function stubServer(items: Item[], onPost?: (path: string) => Response) {
  const fetch = vi.fn(async (path: string, init?: RequestInit) => {
    if (init?.method === "POST") return onPost!(path);
    if (path === "/api/health") return jsonResponse({ status: "ok", db: true, gemini: true, github: null });
    if (path === "/api/items") return jsonResponse(items);
    return jsonResponse({ error: "not found" }, 404);
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("App", () => {
  it("renders conflicts, the queue and stats from the API", async () => {
    stubServer([
      makeItem({ id: 1, status: "approved", text: "No freezes" }),
      makeItem({ id: 2, text: "Freeze migrations", conflicts: [makeConflict({ id: 9 })] }),
      makeItem({ id: 3, type: "action", text: "Load test", meeting_title: "Launch Readiness" }),
    ]);
    render(<App />);

    expect(await screen.findByRole("article", { name: "Conflict #9" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Review queue" })).getByText("Load test")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Pending review")).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Memory corpus")).getByText("1")).toBeInTheDocument();
  });

  it("approving an action without GitHub warns and reloads", async () => {
    const action = makeItem({ id: 5, type: "action", text: "Load test" });
    const fetch = stubServer([action], () => jsonResponse({ ...action, status: "approved" }));
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Approve/ }));

    expect(await screen.findByText(/No issue created because GitHub isn't configured/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/items/5/approve", expect.objectContaining({ method: "POST" }));
    expect(fetch.mock.calls.filter(([p]) => p === "/api/items")).toHaveLength(2);
  });
});
