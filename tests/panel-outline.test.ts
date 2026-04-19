import { describe, expect, it } from "vitest";
import { buildHeadingDisplayRevision } from "../src/core/revisions";
import type { HeadingSnapshot } from "../src/core/types";
import { PanelOutlineView } from "../src/ui/panel-outline";

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

describe("PanelOutlineView", () => {
  it("reuses outline items when only the active heading changes", () => {
    const outline = document.createElement("nav");
    const view = new PanelOutlineView(outline);
    const headings = [
      createSnapshot(),
      createSnapshot({ key: "github:readme::next", anchor: "next", text: "Next" })
    ];

    view.render({
      headings,
      activeHeadingKey: headings[0].key,
      displayRevision: buildHeadingDisplayRevision(headings)
    });

    const firstItem = outline.querySelector(`[data-key="${headings[0].key}"]`);
    const secondItem = outline.querySelector(`[data-key="${headings[1].key}"]`);

    view.render({
      headings,
      activeHeadingKey: headings[1].key,
      displayRevision: buildHeadingDisplayRevision(headings)
    });

    expect(outline.querySelector(`[data-key="${headings[0].key}"]`)).toBe(firstItem);
    expect(outline.querySelector(`[data-key="${headings[1].key}"]`)).toBe(secondItem);
    expect(firstItem?.classList.contains("is-active")).toBe(false);
    expect(secondItem?.classList.contains("is-active")).toBe(true);

    view.destroy();
  });

  it("reuses outline items when collapsed state changes", () => {
    const outline = document.createElement("nav");
    const view = new PanelOutlineView(outline);
    const headings = [
      createSnapshot(),
      createSnapshot({ key: "github:readme::next", anchor: "next", text: "Next" })
    ];

    view.render({
      headings,
      activeHeadingKey: headings[0].key,
      displayRevision: buildHeadingDisplayRevision(headings)
    });

    const firstItem = outline.querySelector(`[data-key="${headings[0].key}"]`);

    const nextHeadings = [createSnapshot({ collapsed: true }), headings[1]];
    view.render({
      headings: nextHeadings,
      activeHeadingKey: headings[0].key,
      displayRevision: buildHeadingDisplayRevision(nextHeadings)
    });

    expect(outline.querySelector(`[data-key="${headings[0].key}"]`)).toBe(firstItem);
    expect(firstItem?.classList.contains("is-collapsed")).toBe(true);

    view.destroy();
  });
});
