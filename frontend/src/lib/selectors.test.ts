import { describe, expect, it } from "vitest";
import { makeConflict, makeItem } from "../test/fixtures";
import { deriveDashboard } from "./selectors";

describe("deriveDashboard", () => {
  const items = [
    makeItem({ status: "approved", meeting_title: "Platform Sync" }),
    makeItem({ status: "approved", meeting_title: "Launch Readiness" }),
    makeItem({ conflicts: [makeConflict(), makeConflict({ id: 8 })], meeting_title: "Launch Readiness" }),
    makeItem({ type: "action", meeting_title: "Launch Readiness" }),
    makeItem({ type: "action", meeting_title: "Retro" }),
    makeItem({ type: "action", status: "approved", issue_url: "https://github.com/a/b/issues/3" }),
    makeItem({ type: "action", status: "approved" }),
  ];
  const d = deriveDashboard(items);

  it("splits pending items into conflicted and the review queue", () => {
    expect(d.pending).toHaveLength(3);
    expect(d.conflicted).toHaveLength(1);
    expect(d.queue).toHaveLength(2);
  });

  it("counts every conflict, not just conflicted items", () => {
    expect(d.openConflicts).toBe(2);
  });

  it("memory holds approved decisions and counts their meetings", () => {
    expect(d.memory).toHaveLength(2);
    expect(d.meetingCount).toBe(2);
  });

  it("dispatched holds approved actions; issueCount only those with an issue", () => {
    expect(d.dispatched).toHaveLength(2);
    expect(d.issueCount).toBe(1);
  });

  it("groups the queue by meeting", () => {
    expect([...d.queueByMeeting.keys()]).toEqual(["Launch Readiness", "Retro"]);
  });

  it("handles an empty list", () => {
    const empty = deriveDashboard([]);
    expect(empty.openConflicts).toBe(0);
    expect(empty.queueByMeeting.size).toBe(0);
  });
});
