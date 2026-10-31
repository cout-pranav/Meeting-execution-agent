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

  it("does not call onClick while busy", async () => {
    const onClick = vi.fn();
    render(<Button busy onClick={onClick}>Approve</Button>);
    await userEvent.click(screen.getByRole("button", { name: /Approve/ }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is enabled and not marked busy by default", () => {
    render(<Button>Approve</Button>);
    const btn = screen.getByRole("button", { name: "Approve" });
    expect(btn).toBeEnabled();
    expect(btn).not.toHaveAttribute("aria-busy");
  });

  it("honours the disabled prop without being busy", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Approve</Button>);
    const btn = screen.getByRole("button", { name: "Approve" });
    expect(btn).toBeDisabled();
    expect(btn).not.toHaveAttribute("aria-busy");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows the given icon when idle", () => {
    render(<Button icon="check">Approve</Button>);
    expect(screen.getByRole("button", { name: /Approve/ })).toHaveTextContent("check");
    expect(screen.queryByText("progress_activity")).not.toBeInTheDocument();
  });

  it("passes native attributes such as type through", () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });
});
