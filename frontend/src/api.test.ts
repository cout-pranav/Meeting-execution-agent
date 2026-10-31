import { describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { jsonResponse } from "./test/fixtures";

describe("api", () => {
  it("GETs when no body is given", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }]));
    vi.stubGlobal("fetch", fetch);
    await expect(api("/api/items")).resolves.toEqual([{ id: 1 }]);
    expect(fetch).toHaveBeenCalledWith("/api/items", undefined);
  });

  it("POSTs the body as JSON", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 201));
    vi.stubGlobal("fetch", fetch);
    await api("/api/meetings", { title: "x" });
    const [, init] = fetch.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ title: "x" });
  });

  it("throws the server's error message on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Item is already approved" }, 409)));
    await expect(api("/api/items/1/approve", {})).rejects.toThrow("Item is already approved");
  });

  it("falls back to the status when the body isn't JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500, statusText: "Server Error" })));
    await expect(api("/api/items")).rejects.toThrow("500 Server Error");
  });
});
