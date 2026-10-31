import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders the glyph name hidden from assistive tech", () => {
    render(<Icon name="check" />);
    const icon = screen.getByText("check");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("applies a custom className", () => {
    render(<Icon name="check" className="extra" />);
    expect(screen.getByText("check")).toHaveClass("extra");
  });
});
