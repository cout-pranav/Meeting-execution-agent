import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/fixtures";
import type { Health } from "../types";
import { IngestForm } from "./IngestForm";

const ready: Health = { status: "ok", db: true, gemini: true, github: null };

async function fill() {
  await userEvent.type(screen.getByLabelText("Meeting title"), "Platform Sync");
  await userEvent.clear(screen.getByLabelText("Meeting date"));
  await userEvent.type(screen.getByLabelText("Meeting date"), "2026-10-20");
  await userEvent.type(screen.getByLabelText("Transcript"), "Priya: Ship it.");
  await userEvent.click(screen.getByRole("button", { name: /Extract & check conflicts/ }));
}

describe("IngestForm", () => {
  it("warns when Gemini isn't configured", () => {
    render(<IngestForm health={{ ...ready, gemini: false }} onDone={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Gemini isn't configured");
  });

  it("does not warn when Gemini is ready", () => {
    render(<IngestForm health={ready} onDone={vi.fn()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("posts the meeting and reports what was extracted", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ items: [{}, {}], conflicts: [{}] }, 201));
    vi.stubGlobal("fetch", fetch);
    const onDone = vi.fn();
    render(<IngestForm health={ready} onDone={onDone} />);

    await fill();

    await waitFor(() => expect(onDone).toHaveBeenCalledWith("Extracted 2 items · 1 conflict flagged"));
    const [path, init] = fetch.mock.calls[0]!;
    expect(path).toBe("/api/meetings");
    expect(JSON.parse(init.body)).toEqual({ title: "Platform Sync", transcript: "Priya: Ship it.", date: "2026-10-20" });
    expect(screen.getByLabelText("Transcript")).toHaveValue("");
  });

  it("shows the server error and keeps the transcript", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Gemini request failed: quota" }, 502)));
    const onDone = vi.fn();
    render(<IngestForm health={ready} onDone={onDone} />);

    await fill();

    expect(await screen.findByRole("alert")).toHaveTextContent("Gemini request failed: quota");
    expect(screen.getByLabelText("Transcript")).toHaveValue("Priya: Ship it.");
    expect(onDone).not.toHaveBeenCalled();
  });
});
