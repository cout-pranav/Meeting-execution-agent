import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Empty } from "./Empty";

describe("Empty", () => {
  it("shows the message and a hidden icon", () => {
    render(<Empty icon="inbox">Nothing to review</Empty>);
    expect(screen.getByText("Nothing to review")).toBeInTheDocument();
    expect(screen.getByText("inbox")).toHaveAttribute("aria-hidden", "true");
  });
});
