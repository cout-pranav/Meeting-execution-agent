import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeItem } from "../test/fixtures";
import { TrackerDispatch } from "./TrackerDispatch";

describe("TrackerDispatch", () => {
  it("shows an empty state", () => {
    render(<TrackerDispatch dispatched={[]} repo={null} />);
    expect(screen.getByText(/become GitHub Issues/)).toBeInTheDocument();
  });

  it("links created issues and marks the rest as not sent", () => {
    render(
      <TrackerDispatch
        repo="acme/app"
        dispatched={[
          makeItem({ type: "action", text: "Load test", issue_url: "https://github.com/acme/app/issues/12" }),
          makeItem({ type: "action", text: "On-call rota", owner: null }),
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /#12/ })).toHaveAttribute("href", "https://github.com/acme/app/issues/12");
    expect(screen.getByText("not sent")).toBeInTheDocument();
    expect(screen.getByText("Unassigned · no deadline")).toBeInTheDocument();
    expect(screen.getByText("acme/app")).toBeInTheDocument();
  });

  it("omits the repo label when there is no repo", () => {
    render(<TrackerDispatch repo={null} dispatched={[makeItem({ type: "action" })]} />);
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });

  it("shows owner and deadline when set", () => {
    render(<TrackerDispatch repo="acme/app" dispatched={[makeItem({ type: "action", owner: "Priya", deadline: "2026-12-01" })]} />);
    expect(screen.getByText("Priya · 2026-12-01")).toBeInTheDocument();
  });

  it("opens issue links in a new tab", () => {
    render(<TrackerDispatch repo="acme/app" dispatched={[makeItem({ type: "action", issue_url: "https://github.com/acme/app/issues/5" })]} />);
    const link = screen.getByRole("link", { name: /#5/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });
});
