import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Person } from "./Person";

describe("Person", () => {
  it("shows a warning chip when there is no owner", () => {
    render(<Person name={null} />);
    expect(screen.getByText("No owner")).toBeInTheDocument();
  });

  it("shows initials and the name", () => {
    render(<Person name="Elena Rostova" />);
    expect(screen.getByText("ER")).toBeInTheDocument();
    expect(screen.getByText("Elena Rostova")).toBeInTheDocument();
  });

  it("uses a single initial for a one-word name", () => {
    render(<Person name="Marcus" />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("caps initials at two uppercase letters", () => {
    render(<Person name="ada king lovelace" />);
    expect(screen.getByText("AK")).toBeInTheDocument();
    expect(screen.queryByText("No owner")).not.toBeInTheDocument();
  });
});
