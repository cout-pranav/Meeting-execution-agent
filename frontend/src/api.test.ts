import { describe, expect, it, vi } from "vitest";
import { actOnItem, getItems, ingestMeeting } from "./api";
import { jsonResponse, sentRequest } from "./test/fixtures";

describe("api", () => {
  it("GETs the items", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }]));
    vi.stubGlobal("fetch", fetch);
    await expect(getItems()).resolves.toEqual([{ id: 1 }]);
    const [input, init] = fetch.mock.calls[0]!;
    expect(await sentRequest(input, init)).toEqual({ path: "/api/items", method: "GET", body: undefined });
  });

  it("POSTs the body as JSON", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ items: [], conflicts: [] }, 201));
    vi.stubGlobal("fetch", fetch);
    await ingestMeeting({ title: "x", transcript: "A: hi", date: "2026-10-20" });
    const [input, init] = fetch.mock.calls[0]!;
    expect((input as Request).headers.get("Content-Type")).toMatch(/^application\/json/);
    expect(await sentRequest(input, init)).toEqual({
      path: "/api/meetings", method: "POST", body: { title: "x", transcript: "A: hi", date: "2026-10-20" },
    });
  });

  it("throws the server's error message on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Item is already approved" }, 409)));
    await expect(actOnItem(1, "approve")).rejects.toThrow("Item is already approved");
  });

  it("falls back to the status when the body isn't JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500, statusText: "Server Error" })));
    await expect(getItems()).rejects.toThrow("500 Server Error");
  });
});
