import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders its children for every tone", () => {
    for (const tone of ["ai", "ok", "warn", "bad", "muted"] as const) {
      const { unmount } = render(<Chip tone={tone}>{tone} label</Chip>);
      expect(screen.getByText(`${tone} label`)).toBeInTheDocument();
      unmount();
    }
  });
});
