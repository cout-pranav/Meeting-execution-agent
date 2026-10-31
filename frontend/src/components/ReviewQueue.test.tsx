import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeItem } from "../test/fixtures";
import { ReviewQueue, ReviewRow } from "./ReviewQueue";

const renderRow = (props: Partial<Parameters<typeof ReviewRow>[0]> = {}) => {
  const onAct = vi.fn();
  const item = props.item ?? makeItem();
  render(<ul><ReviewRow item={item} busy={false} github={false} onAct={onAct} {...props} /></ul>);
  return { onAct, item };
};

describe("ReviewRow", () => {
  it("shows the item text and its source quote", () => {
    renderRow({ item: makeItem({ text: "Launch on Dec 12", quote: "We're targeting December 12." }) });
    expect(screen.getByText("Launch on Dec 12")).toBeInTheDocument();
    expect(screen.getByText("“We're targeting December 12.”")).toBeInTheDocument();
  });

  it("flags an action item with no deadline", () => {
    renderRow({ item: makeItem({ type: "action", deadline: null }) });
    expect(screen.getByText("No deadline")).toBeInTheDocument();
  });

  it("shows the deadline when present", () => {
    renderRow({ item: makeItem({ type: "action", deadline: "2026-12-01" }) });
    expect(screen.getByText("2026-12-01")).toBeInTheDocument();
    expect(screen.queryByText("No deadline")).not.toBeInTheDocument();
  });

  it("says it will create an issue only for actions when GitHub is configured", () => {
    renderRow({ item: makeItem({ type: "action" }), github: true });
    expect(screen.getByRole("button", { name: /Approve & create issue/ })).toBeInTheDocument();
  });

  it("uses a plain Approve label without GitHub", () => {
    renderRow({ item: makeItem({ type: "action" }), github: false });
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });

  it("calls onAct with the item id", async () => {
    const { onAct, item } = renderRow();
    await userEvent.click(screen.getByRole("button", { name: /Reject/ }));
    await userEvent.click(screen.getByRole("button", { name: /Approve/ }));
    expect(onAct.mock.calls).toEqual([[item.id, "reject"], [item.id, "approve"]]);
  });

  it("does not offer issue creation for a decision even with GitHub", () => {
    renderRow({ item: makeItem({ type: "decision" }), github: true });
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create issue/ })).not.toBeInTheDocument();
  });

  it("does not flag a missing deadline on a decision", () => {
    renderRow({ item: makeItem({ type: "decision", deadline: null }) });
    expect(screen.queryByText("No deadline")).not.toBeInTheDocument();
  });

  it("shows a no-owner chip when unowned", () => {
    renderRow({ item: makeItem({ owner: null }) });
    expect(screen.getByText("No owner")).toBeInTheDocument();
  });

  it("labels the item type", () => {
    renderRow({ item: makeItem({ type: "action" }) });
    expect(screen.getByText("ACTION")).toBeInTheDocument();
  });

  it("disables both buttons and ignores clicks while busy", async () => {
    const { onAct } = renderRow({ busy: true });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("aria-busy", "true");
    }
    await userEvent.click(buttons[0]!);
    expect(onAct).not.toHaveBeenCalled();
  });
});

describe("ReviewQueue", () => {
  it("shows an empty state", () => {
    render(<ReviewQueue queueByMeeting={new Map()} count={0} github={false} isBusy={() => false} onAct={vi.fn()} />);
    expect(screen.getByText(/Nothing waiting/)).toBeInTheDocument();
  });

  it("groups rows under their meeting", () => {
    const groups = new Map([
      ["Launch Readiness", [makeItem({ text: "A" }), makeItem({ text: "B" })]],
      ["Retro", [makeItem({ text: "C" })]],
    ]);
    render(<ReviewQueue queueByMeeting={groups} count={3} github={false} isBusy={() => false} onAct={vi.fn()} />);
    const queue = screen.getByRole("region", { name: "Review queue" });
    expect(within(queue).getByText("3 pending")).toBeInTheDocument();
    expect(within(queue).getByText("Launch Readiness")).toBeInTheDocument();
    expect(within(queue).getAllByRole("listitem")).toHaveLength(3);
  });

  it("shows 0 pending in the empty state", () => {
    render(<ReviewQueue queueByMeeting={new Map()} count={0} github={false} isBusy={() => false} onAct={vi.fn()} />);
    expect(within(screen.getByRole("region", { name: "Review queue" })).getByText("0 pending")).toBeInTheDocument();
  });

  it("marks only the busy item's row as busy and passes github through", () => {
    const a = makeItem({ text: "A", type: "action" });
    const b = makeItem({ text: "B", type: "action" });
    render(<ReviewQueue queueByMeeting={new Map([["Retro", [a, b]]])} count={2} github isBusy={(id) => id === a.id} onAct={vi.fn()} />);
    const [rowA, rowB] = screen.getAllByRole("listitem");
    for (const btn of within(rowA!).getAllByRole("button")) expect(btn).toBeDisabled();
    for (const btn of within(rowB!).getAllByRole("button")) expect(btn).toBeEnabled();
    expect(within(rowB!).getByRole("button", { name: /Approve & create issue/ })).toBeInTheDocument();
  });

  it("forwards row actions with the item id", async () => {
    const a = makeItem({ text: "A" });
    const onAct = vi.fn();
    render(<ReviewQueue queueByMeeting={new Map([["Retro", [a]]])} count={1} github={false} isBusy={() => false} onAct={onAct} />);
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(onAct.mock.calls).toEqual([[a.id, "reject"]]);
  });
});
