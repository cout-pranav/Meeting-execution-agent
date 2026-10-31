import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

const renderHeader = (props: Partial<Parameters<typeof Header>[0]> = {}) => {
  const onDismiss = vi.fn();
  const onRefresh = vi.fn();
  render(<Header notice={null} onDismiss={onDismiss} onRefresh={onRefresh} {...props} />);
  return { onDismiss, onRefresh };
};

describe("Header", () => {
  it("shows the breadcrumb", () => {
    renderHeader();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Decision Intelligence")).toBeInTheDocument();
  });

  it("shows the current page title in the breadcrumb", () => {
    renderHeader({ title: "Memory Ledger" });
    expect(screen.getByText("Memory Ledger")).toBeInTheDocument();
    expect(screen.queryByText("Decision Intelligence")).not.toBeInTheDocument();
  });

  it("has no notice by default", () => {
    renderHeader();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("calls onRefresh when Refresh is clicked", async () => {
    const { onRefresh } = renderHeader();
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders the notice text", () => {
    renderHeader({ notice: { tone: "ok", text: "Saved 3 items" } });
    expect(screen.getByRole("status")).toHaveTextContent("Saved 3 items");
  });

  it("calls onDismiss from the notice", async () => {
    const { onDismiss, onRefresh } = renderHeader({ notice: { tone: "bad", text: "Failed" } });
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
