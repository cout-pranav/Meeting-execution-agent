import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeConflict, makeItem } from "../test/fixtures";
import { ConflictCallout, ConflictRadar } from "./ConflictCallout";

describe("ConflictCallout", () => {
  const item = makeItem({ text: "Freeze migrations", quote: "Let's freeze migrations.", meeting_title: "Launch Readiness" });
  const conflict = makeConflict({ prior_quote: "No freezes.", prior_meeting: "Platform Sync", prior_id: 1 });

  it("shows the new and earlier decisions side by side with the explanation", () => {
    render(<ConflictCallout item={item} conflict={conflict} busy={false} onAct={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Freeze migrations" })).toBeInTheDocument();
    expect(screen.getByText("“Let's freeze migrations.”")).toBeInTheDocument();
    expect(screen.getByText("“No freezes.”")).toBeInTheDocument();
    expect(screen.getByText("Platform Sync")).toBeInTheDocument();
    expect(screen.getByText("Decision #1:")).toBeInTheDocument();
    expect(screen.getByText(conflict.explanation)).toBeInTheDocument();
  });

  it("rejects or approves the new item", async () => {
    const onAct = vi.fn();
    render(<ConflictCallout item={item} conflict={conflict} busy={false} onAct={onAct} />);
    await userEvent.click(screen.getByRole("button", { name: /Reject new decision/ }));
    await userEvent.click(screen.getByRole("button", { name: /Approve anyway/ }));
    expect(onAct.mock.calls).toEqual([[item.id, "reject"], [item.id, "approve"]]);
  });

  it("disables both actions while busy", () => {
    render(<ConflictCallout item={item} conflict={conflict} busy onAct={vi.fn()} />);
    for (const btn of screen.getAllByRole("button")) expect(btn).toBeDisabled();
  });

  it("is labelled by its conflict id and names the earlier decision", () => {
    render(<ConflictCallout item={item} conflict={makeConflict({ id: 9, prior_id: 3, prior_text: "Never freeze." })} busy={false} onAct={vi.fn()} />);
    const article = screen.getByRole("article", { name: "Conflict #9" });
    expect(within(article).getByText("Decision #3:")).toBeInTheDocument();
    expect(within(article).getByText(/Never freeze\./)).toBeInTheDocument();
  });

  it("shows a no-owner chip when the new item has no owner", () => {
    render(<ConflictCallout item={makeItem({ owner: null })} conflict={conflict} busy={false} onAct={vi.fn()} />);
    expect(screen.getByText("No owner")).toBeInTheDocument();
  });
});

describe("ConflictRadar", () => {
  it("renders one callout per conflict", () => {
    const item = makeItem({ conflicts: [makeConflict({ id: 1 }), makeConflict({ id: 2 })] });
    render(<ConflictRadar conflicted={[item]} isBusy={() => false} onAct={vi.fn()} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("renders no callouts when nothing is conflicted", () => {
    render(<ConflictRadar conflicted={[]} isBusy={() => false} onAct={vi.fn()} />);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("disables only the callouts of the busy item and forwards its id", async () => {
    const a = makeItem({ conflicts: [makeConflict({ id: 11 })] });
    const b = makeItem({ conflicts: [makeConflict({ id: 12 })] });
    const onAct = vi.fn();
    render(<ConflictRadar conflicted={[a, b]} isBusy={(id) => id === a.id} onAct={onAct} />);
    const first = screen.getByRole("article", { name: "Conflict #11" });
    const second = screen.getByRole("article", { name: "Conflict #12" });
    for (const btn of within(first).getAllByRole("button")) expect(btn).toBeDisabled();
    await userEvent.click(within(second).getByRole("button", { name: /Approve anyway/ }));
    expect(onAct.mock.calls).toEqual([[b.id, "approve"]]);
  });
});
