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
});
