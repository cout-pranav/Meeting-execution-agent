import { render, screen } from "@testing-library/react";
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
});

describe("ConflictRadar", () => {
  it("renders one callout per conflict", () => {
    const item = makeItem({ conflicts: [makeConflict({ id: 1 }), makeConflict({ id: 2 })] });
    render(<ConflictRadar conflicted={[item]} isBusy={() => false} onAct={vi.fn()} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});
