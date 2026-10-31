import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deriveDashboard } from "../lib/selectors";
import { makeConflict, makeHealth, makeItem } from "../test/fixtures";
import { Sidebar } from "./Sidebar";

const renderSidebar = (props: Partial<Parameters<typeof Sidebar>[0]> = {}) =>
  render(<Sidebar d={deriveDashboard([])} health={makeHealth()} healthErr={false} {...props} />);

const link = (name: RegExp) => screen.getByRole("link", { name });

describe("Sidebar", () => {
  it("shows the brand and nav links", () => {
    renderSidebar();
    expect(screen.getByText("ConsensusOS")).toBeInTheDocument();
    expect(link(/Ingestion/)).toHaveAttribute("href", "#ingest");
    expect(link(/Conflict Radar/)).toHaveAttribute("href", "#conflicts");
    expect(link(/Review Queue/)).toHaveAttribute("href", "#review");
    expect(link(/Memory Ledger/)).toHaveAttribute("href", "#memory");
    expect(link(/Tracker Dispatch/)).toHaveAttribute("href", "#tracker");
  });

  it("hides empty badges", () => {
    renderSidebar();
    expect(within(link(/Ingestion/)).queryByText(/pending/)).not.toBeInTheDocument();
    expect(within(link(/Conflict Radar/)).queryByText(/\d/)).not.toBeInTheDocument();
    expect(within(link(/Review Queue/)).queryByText(/\d/)).not.toBeInTheDocument();
    expect(within(link(/Memory Ledger/)).getByText("0")).toBeInTheDocument();
  });

  it("shows badge counts", () => {
    const items = [
      makeItem({ status: "approved", type: "decision" }),
      makeItem({ status: "pending", conflicts: [makeConflict(), makeConflict({ id: 8 })] }),
      makeItem({ status: "pending" }),
      makeItem({ status: "pending" }),
    ];
    renderSidebar({ d: deriveDashboard(items) });
    expect(within(link(/Ingestion/)).getByText("3 pending")).toBeInTheDocument();
    expect(within(link(/Conflict Radar/)).getByText("2")).toBeInTheDocument();
    expect(within(link(/Review Queue/)).getByText("2")).toBeInTheDocument();
    expect(within(link(/Memory Ledger/)).getByText("1")).toBeInTheDocument();
  });

  it("shows healthy service statuses", () => {
    renderSidebar({ health: makeHealth({ github: "acme/repo" }) });
    expect(screen.getByText("Database connected")).toBeInTheDocument();
    expect(screen.getByText("Gemini ready")).toBeInTheDocument();
    expect(screen.getByText("acme/repo")).toBeInTheDocument();
    expect(within(link(/Tracker Dispatch/)).getByText("Active")).toBeInTheDocument();
  });

  it("shows unhealthy service statuses", () => {
    renderSidebar({ health: makeHealth({ db: false, gemini: false, github: null }) });
    expect(screen.getByText("Database unreachable")).toBeInTheDocument();
    expect(screen.getByText("Gemini not configured")).toBeInTheDocument();
    expect(screen.getByText("GitHub not configured")).toBeInTheDocument();
    expect(within(link(/Tracker Dispatch/)).getByText("Off")).toBeInTheDocument();
  });

  it("shows checking while health is loading", () => {
    renderSidebar({ health: null });
    expect(screen.getAllByText("Checking…")).toHaveLength(3);
  });

  it("reports unreachable services when the health check failed", () => {
    renderSidebar({ health: null, healthErr: true });
    expect(screen.queryByText("Checking…")).not.toBeInTheDocument();
    expect(screen.getByText("Database unreachable")).toBeInTheDocument();
  });
});
