import { describe, expect, it } from "vitest";
import {
  buildPageVersion,
  buildHeadingDisplayRevision,
  buildHeadingIdentityRevision,
  buildPageDisplayRevision,
  buildPageIdentityRevision,
  hasSamePageDisplay,
  hasSamePageStructure
} from "../src/core/revisions";
import type { HeadingSnapshot } from "../src/core/types";

function createSnapshot(overrides: Partial<HeadingSnapshot> = {}): HeadingSnapshot {
  return {
    key: "github:readme::intro",
    anchor: "intro",
    level: 2,
    text: "Intro",
    container: {
      key: "github:readme",
      label: "README",
      kind: "markdown"
    },
    parentKey: null,
    collapsed: false,
    hiddenByAncestor: false,
    ...overrides
  };
}

describe("revisions", () => {
  it("separates heading identity from display metadata", () => {
    const baseIdentityRevision = buildHeadingIdentityRevision([createSnapshot()]);
    const relabeledIdentityRevision = buildHeadingIdentityRevision([
      createSnapshot({
        container: {
          key: "github:readme",
          label: "Comment 1",
          kind: "markdown"
        }
      })
    ]);
    const baseDisplayRevision = buildHeadingDisplayRevision([createSnapshot()]);
    const relabeledDisplayRevision = buildHeadingDisplayRevision([
      createSnapshot({
        container: {
          key: "github:readme",
          label: "Comment 1",
          kind: "markdown"
        }
      })
    ]);

    expect(relabeledIdentityRevision).toBe(baseIdentityRevision);
    expect(relabeledDisplayRevision).not.toBe(baseDisplayRevision);
    expect(relabeledDisplayRevision).toContain("Comment 1");
  });

  it("produces stable empty page revisions when no headings are present", () => {
    expect(buildPageIdentityRevision("docs", "docs.github.com/en/get-started", [])).toBe(
      "docs:docs.github.com/en/get-started:empty"
    );
    expect(buildPageDisplayRevision("docs", "docs.github.com/en/get-started", [])).toBe(
      "docs:docs.github.com/en/get-started:empty"
    );
  });

  it("compares page structure and display through a single page version object", () => {
    const left = buildPageVersion("github", "github.com/test", [createSnapshot()]);
    const sameStructureDifferentDisplay = buildPageVersion("github", "github.com/test", [
      createSnapshot({
        text: "Overview"
      })
    ]);

    expect(hasSamePageStructure(left, sameStructureDifferentDisplay)).toBe(true);
    expect(hasSamePageDisplay(left, sameStructureDifferentDisplay)).toBe(false);
  });
});
