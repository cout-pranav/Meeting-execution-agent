import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeConflict, makeItem } from "../test/fixtures";
import { MemoryLedger } from "./MemoryLedger";

describe("MemoryLedger", () => {
  it("shows an empty state", () => {
    render(<MemoryLedger memory={[]} />);
    expect(screen.getByText(/Approved decisions are stored here/)).toBeInTheDocument();
  });

  it("lists each decision with its quote and meeting", () => {
    render(<MemoryLedger memory={[makeItem({ text: "No freezes", quote: "No freezes, ever.", meeting_title: "Platform Sync" })]} />);
    expect(screen.getByText("No freezes")).toBeInTheDocument();
    expect(screen.getByText("“No freezes, ever.”")).toBeInTheDocument();
    expect(screen.getByText("Platform Sync")).toBeInTheDocument();
  });

  it("marks decisions approved over a conflict", () => {
    render(<MemoryLedger memory={[makeItem({ conflicts: [makeConflict({ prior_id: 4 })] })]} />);
    expect(screen.getByText("Approved over conflict with decision #4")).toBeInTheDocument();
  });

  it("lists every conflicting decision id and hides the quote when overridden", () => {
    render(<MemoryLedger memory={[makeItem({ quote: "Hidden quote.", conflicts: [makeConflict({ id: 1, prior_id: 4 }), makeConflict({ id: 2, prior_id: 5 })] })]} />);
    expect(screen.getByText("Approved over conflict with decision #4, #5")).toBeInTheDocument();
    expect(screen.queryByText("“Hidden quote.”")).not.toBeInTheDocument();
  });

  it("shows a dash when a decision has no owner and the owner otherwise", () => {
    render(<MemoryLedger memory={[makeItem({ text: "Owned", owner: "Elena Rostova" }), makeItem({ text: "Orphan", owner: null })]} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]!).getByText("Elena Rostova")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("—")).toBeInTheDocument();
    expect(within(rows[1]!).queryByText("No owner")).not.toBeInTheDocument();
  });

  it("renders one row per decision in the given order with its id", () => {
    render(<MemoryLedger memory={[makeItem({ id: 41, text: "First" }), makeItem({ id: 42, text: "Second" })]} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("First")).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/#41/)).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/#42/)).toBeInTheDocument();
  });
});
