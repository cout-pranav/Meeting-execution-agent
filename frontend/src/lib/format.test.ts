import { describe, expect, it } from "vitest";
import { fmtDate, initials, issueNumber, plural } from "./format";

describe("format", () => {
  it("initials takes the first letter of up to two words", () => {
    expect(initials("Elena Rostova")).toBe("ER");
    expect(initials("priya")).toBe("P");
    expect(initials("Mary Anne Smith")).toBe("MA");
  });

  it("issueNumber reads the number from a GitHub issue URL", () => {
    expect(issueNumber("https://github.com/acme/app/issues/42")).toBe("42");
  });

  it("fmtDate includes the year and day", () => {
    const out = fmtDate("2026-10-20T10:00:00.000Z");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/20/);
  });

  it("plural adds s except for one", () => {
    expect(plural(1, "item")).toBe("1 item");
    expect(plural(0, "item")).toBe("0 items");
    expect(plural(3, "conflict")).toBe("3 conflicts");
  });
});
