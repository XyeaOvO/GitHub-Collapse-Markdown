import { describe, expect, it } from "vitest";
import { headingStyles } from "../src/ui/styles/headings";

describe("heading styles", () => {
  it("keeps inline headings full-width so GitHub heading dividers do not shrink", () => {
    expect(headingStyles).toMatch(/\.ghcm-heading-inline\s*\{[^}]*display:\s*flex;/s);
    expect(headingStyles).not.toMatch(/\.ghcm-heading-inline\s*\{[^}]*display:\s*inline-flex;/s);
  });
});
