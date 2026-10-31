import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse, sentRequest } from "../test/fixtures";
import { renderWithProviders as render } from "../test/render";
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
    const [input, init] = fetch.mock.calls[0]!;
    const { path, body } = await sentRequest(input, init);
    expect(path).toBe("/api/meetings");
    expect(body).toEqual({ title: "Platform Sync", transcript: "Priya: Ship it.", date: "2026-10-20" });
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

  it("shows a status-based message when the error body has no message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>oops</html>", { status: 500, statusText: "Server Error" })));
    render(<IngestForm health={ready} onDone={vi.fn()} />);

    await fill();

    expect(await screen.findByRole("alert")).toHaveTextContent("500 Server Error");
  });

  it("shows the error when the request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network down")));
    const onDone = vi.fn();
    render(<IngestForm health={ready} onDone={onDone} />);

    await fill();

    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
    expect(screen.getByLabelText("Transcript")).toHaveValue("Priya: Ship it.");
    expect(screen.getByRole("button", { name: /Extract & check conflicts/ })).toBeEnabled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("is disabled and busy while extracting", async () => {
    let resolve!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((r) => { resolve = r; })));
    render(<IngestForm health={ready} onDone={vi.fn()} />);

    await fill();

    const btn = await screen.findByRole("button", { name: /Extracting/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    resolve(jsonResponse({ items: [], conflicts: [] }, 201));
    expect(await screen.findByRole("button", { name: /Extract & check conflicts/ })).toBeEnabled();
  });

  it("uses singular and zero counts in the summary and clears the title", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [{}], conflicts: [] }, 201)));
    const onDone = vi.fn();
    render(<IngestForm health={ready} onDone={onDone} />);

    await fill();

    await waitFor(() => expect(onDone).toHaveBeenCalledWith("Extracted 1 item · 0 conflicts flagged"));
    expect(screen.getByLabelText("Meeting title")).toHaveValue("");
  });

  it("clears a previous error when resubmitting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500)).mockResolvedValueOnce(jsonResponse({ items: [], conflicts: [] }, 201)),
    );
    render(<IngestForm health={ready} onDone={vi.fn()} />);

    await fill();
    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
    await userEvent.click(screen.getByRole("button", { name: /Extract & check conflicts/ }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("does not submit while required fields are empty", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<IngestForm health={ready} onDone={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /Extract & check conflicts/ }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads a .txt file into the transcript and derives a title from its name", async () => {
    render(<IngestForm health={ready} onDone={vi.fn()} />);
    const file = new File(["Priya: Hello."], "weekly-sync_notes.txt", { type: "text/plain" });

    await userEvent.upload(screen.getByLabelText(/Load \.txt/), file);

    await waitFor(() => expect(screen.getByLabelText("Transcript")).toHaveValue("Priya: Hello."));
    expect(screen.getByLabelText("Meeting title")).toHaveValue("weekly sync notes");
  });

  it("keeps a title the user already typed when loading a file", async () => {
    render(<IngestForm health={ready} onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Meeting title"), "My title");

    await userEvent.upload(screen.getByLabelText(/Load \.txt/), new File(["x"], "other.txt", { type: "text/plain" }));

    await waitFor(() => expect(screen.getByLabelText("Transcript")).toHaveValue("x"));
    expect(screen.getByLabelText("Meeting title")).toHaveValue("My title");
  });
});
