import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deriveDashboard } from "../lib/selectors";
import { makeConflict, makeHealth, makeItem } from "../test/fixtures";
import { Stat, StatCards } from "./StatCards";

describe("Stat", () => {
  it("shows label, value, unit and note", () => {
    render(<Stat label="Pending review" value={4} unit="Items" note="A note" icon="x" />);
    const card = screen.getByLabelText("Pending review");
    expect(within(card).getByText("4")).toBeInTheDocument();
    expect(within(card).getByText("Items")).toBeInTheDocument();
    expect(within(card).getByText("A note")).toBeInTheDocument();
  });

  it("renders zero values", () => {
    render(<Stat label="Alerts" value={0} unit="Contradictions" note="n" icon="x" tone="bad" />);
    expect(within(screen.getByLabelText("Alerts")).getByText("0")).toBeInTheDocument();
  });
});

describe("StatCards", () => {
  const items = [
    makeItem({ status: "approved", type: "decision", meeting_title: "A" }),
    makeItem({ status: "approved", type: "decision", meeting_title: "B" }),
    makeItem({ status: "approved", type: "action", issue_url: "https://x/1" }),
    makeItem({ status: "pending", conflicts: [makeConflict(), makeConflict({ id: 8 })] }),
    makeItem({ status: "pending" }),
  ];

  const card = (label: string) => within(screen.getByLabelText(label));

  it("shows counts derived from the dashboard", () => {
    render(<StatCards d={deriveDashboard(items)} health={makeHealth()} />);
    expect(card("Memory corpus").getByText("2")).toBeInTheDocument();
    expect(card("Memory corpus").getByText("Approved across 2 meetings")).toBeInTheDocument();
    expect(card("Drift / Alert pulse").getByText("2")).toBeInTheDocument();
    expect(card("Drift / Alert pulse").getByText("Requires resolution before commit")).toBeInTheDocument();
    expect(card("Pending review").getByText("2")).toBeInTheDocument();
    expect(card("Tracker dispatch").getByText("1")).toBeInTheDocument();
  });

  it("uses singular meeting wording", () => {
    render(<StatCards d={deriveDashboard([items[0]])} health={null} />);
    expect(screen.getByText("Approved across 1 meeting")).toBeInTheDocument();
  });

  it("says there are no contradictions when none are open", () => {
    render(<StatCards d={deriveDashboard([])} health={null} />);
    expect(screen.getByText("No open contradictions")).toBeInTheDocument();
  });

  it("shows the synced repo when GitHub is configured", () => {
    render(<StatCards d={deriveDashboard(items)} health={makeHealth({ github: "acme/repo" })} />);
    expect(screen.getByText("Synced to acme/repo")).toBeInTheDocument();
  });

  it("shows GitHub not configured without it", () => {
    render(<StatCards d={deriveDashboard(items)} health={makeHealth({ github: null })} />);
    expect(screen.getByText("GitHub not configured")).toBeInTheDocument();
  });
});
