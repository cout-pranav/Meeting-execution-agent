import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("calls onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Approve</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and shows a spinner while busy", () => {
    render(<Button busy icon="check">Approve</Button>);
    const btn = screen.getByRole("button", { name: /Approve/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn.querySelector(".animate-spin")).toHaveTextContent("progress_activity");
  });
});
