import { render, screen } from "@testing-library/react";
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
});
