import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("is a labelled region with a heading and content", () => {
    render(<Panel title="Review queue" icon="list"><p>Body text</p></Panel>);
    const region = screen.getByRole("region", { name: "Review queue" });
    expect(within(region).getByRole("heading", { name: /Review queue/ })).toBeInTheDocument();
    expect(within(region).getByText("Body text")).toBeInTheDocument();
  });

  it("renders the aside and id when given", () => {
    render(<Panel id="queue" title="Queue" icon="list" aside={<span>3 open</span>}>x</Panel>);
    expect(screen.getByText("3 open")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Queue" })).toHaveAttribute("id", "queue");
  });

  it("omits the aside when not given", () => {
    render(<Panel title="Queue" icon="list">x</Panel>);
    expect(screen.queryByText("3 open")).not.toBeInTheDocument();
  });
});
