import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusDot } from "./StatusDot";

describe("StatusDot", () => {
  it("shows the label when loaded", () => {
    render(<StatusDot ok loading={false} label="Backend online" />);
    expect(screen.getByText("Backend online")).toBeInTheDocument();
  });

  it("shows the label when not ok", () => {
    render(<StatusDot ok={false} loading={false} label="Backend offline" />);
    expect(screen.getByText("Backend offline")).toBeInTheDocument();
  });

  it("shows a checking message instead of the label while loading", () => {
    render(<StatusDot ok loading label="Backend online" />);
    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(screen.queryByText("Backend online")).not.toBeInTheDocument();
  });
});
